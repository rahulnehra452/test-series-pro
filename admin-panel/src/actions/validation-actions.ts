"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"

export type ValidationIssue = {
  questionId: string
  testId: string
  issueType: "broken_image" | "empty_option" | "invalid_answer" | "duplicate"
  message: string
  severity: "error" | "warning"
}

export type ValidationReport = {
  scannedCount: number
  issues: ValidationIssue[]
}

const extractImageUrls = (htmlText: string): string[] => {
  if (!htmlText) return []
  // Matches both <img src="..."> and markdown ![alt](url)
  const imgTagRegex = /<img[^>]+src=["']([^"']+)["']/g
  const mdImgRegex = /!\[[^\]]*\]\(([^)]+)\)/g

  const urls: string[] = []

  let match: RegExpExecArray | null
  while ((match = imgTagRegex.exec(htmlText)) !== null) {
    if (match[1]) urls.push(match[1])
  }
  while ((match = mdImgRegex.exec(htmlText)) !== null) {
    if (match[1]) urls.push(match[1])
  }

  return urls
}

const checkUrl = async (url: string): Promise<boolean> => {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    // try GET if HEAD fails, sometimes servers block HEAD
    try {
      const resGet = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(3000) })
      return resGet.ok
    } catch {
      return false
    }
  }
}

export async function runQuestionValidation(): Promise<{ error?: string, report?: ValidationReport }> {
  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const supabase = createAdminClient()

    const { data: questions, error } = await supabase
      .from("questions")
      .select("id, test_id, text, explanation, options, correct_answer")
      .order("created_at", { ascending: false })

    if (error) throw error
    if (!questions) return { report: { scannedCount: 0, issues: [] } }

    const issues: ValidationIssue[] = []
    const textsSeen = new Map<string, string[]>() // text hash -> array of IDs
    const urlCheckPromises: Promise<void>[] = []

    for (const q of questions) {
      const qText = q.text || ""
      const qExpl = q.explanation || ""

      // 1. Duplicate check (strip html for basic dedupe comparison)
      const rawText = qText.replace(/<[^>]+>/g, '').trim().toLowerCase()
      if (rawText) {
        const existing = textsSeen.get(rawText) || []
        existing.push(q.id)
        textsSeen.set(rawText, existing)
      }

      // 2. Options check
      let parsedOptions: string[] = []
      try {
        parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
        if (!Array.isArray(parsedOptions) || parsedOptions.length < 2) {
          issues.push({ questionId: q.id, testId: q.test_id, issueType: "empty_option", severity: "error", message: `Question has less than 2 options: ${parsedOptions.length}` })
        } else {
          const emptyOptionObj = parsedOptions.some(o => !o || (typeof o === 'string' && !o.trim()))
          if (emptyOptionObj) {
            issues.push({ questionId: q.id, testId: q.test_id, issueType: "empty_option", severity: "error", message: "Question contains empty or blank options" })
          }
        }
      } catch {
        issues.push({ questionId: q.id, testId: q.test_id, issueType: "empty_option", severity: "error", message: "Failed to parse options array" })
      }

      // 3. Correct answer bounds
      if (q.correct_answer === null || q.correct_answer === undefined || q.correct_answer < 0 || q.correct_answer >= parsedOptions.length) {
        issues.push({ questionId: q.id, testId: q.test_id, issueType: "invalid_answer", severity: "error", message: `Correct answer index (${q.correct_answer}) is invalid for options length ${parsedOptions.length}` })
      }

      // 4. Image links check
      const urls = [...extractImageUrls(qText), ...extractImageUrls(qExpl)]
      for (const url of urls) {
        if (!url.startsWith('http')) continue

        urlCheckPromises.push(
          checkUrl(url).then(isValid => {
            if (!isValid) {
              issues.push({ questionId: q.id, testId: q.test_id, issueType: "broken_image", severity: "warning", message: `Broken image source detected: ${url}` })
            }
          })
        )
      }
    }

    // Process all image checks
    await Promise.allSettled(urlCheckPromises)

    // Process duplicates
    textsSeen.forEach((ids) => {
      if (ids.length > 1) {
        ids.forEach(id => {
          // find the test id for this question
          const testId = questions.find(q => q.id === id)?.test_id || ""
          issues.push({
            questionId: id,
            testId,
            issueType: "duplicate",
            severity: "warning",
            message: `Identical question text appears ${ids.length} times in the database.`
          })
        })
      }
    })

    return {
      report: {
        scannedCount: questions.length,
        // Sort issues by testId to group them visually later
        issues: issues.sort((a, b) => a.testId.localeCompare(b.testId))
      }
    }

  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to run validation" }
  }
}
