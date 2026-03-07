"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { revalidatePath } from "next/cache"

export async function bulkDeleteQuestions(ids: string[]) {
  try {
    await requireAdminRole(["super_admin", "content_manager"])
    if (ids.length === 0) return { error: "No questions selected" }

    const supabase = createAdminClient()
    const { error } = await supabase.from('questions').delete().in('id', ids)
    if (error) throw error

    revalidatePath('/dashboard/questions')
    revalidatePath('/dashboard/questions/bulk')
    return { success: true, count: ids.length }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to delete questions" }
  }
}

export async function bulkUpdateDifficulty(ids: string[], difficulty: string) {
  try {
    await requireAdminRole(["super_admin", "content_manager"])
    if (ids.length === 0) return { error: "No questions selected" }

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('questions')
      .update({ difficulty })
      .in('id', ids)
    if (error) throw error

    revalidatePath('/dashboard/questions/bulk')
    return { success: true, count: ids.length }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to update difficulty" }
  }
}

export async function bulkMoveToTest(ids: string[], testId: string) {
  try {
    await requireAdminRole(["super_admin", "content_manager"])
    if (ids.length === 0) return { error: "No questions selected" }

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('questions')
      .update({ test_id: testId, section_id: null })
      .in('id', ids)
    if (error) throw error

    revalidatePath('/dashboard/questions/bulk')
    return { success: true, count: ids.length }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to move questions" }
  }
}

export async function bulkDuplicateQuestions(ids: string[]) {
  try {
    await requireAdminRole(["super_admin", "content_manager"])
    if (ids.length === 0) return { error: "No questions selected" }

    const supabase = createAdminClient()
    const { data: originals, error: fetchError } = await supabase
      .from('questions')
      .select('*')
      .in('id', ids)
    if (fetchError) throw fetchError
    if (!originals || originals.length === 0) return { error: "No questions found" }

    const clones = originals.map((q) => ({
      test_id: q.test_id,
      text: `${q.text} (Copy)`,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      marks: q.marks,
      negative_marks: q.negative_marks,
      difficulty: q.difficulty,
      image_url: q.image_url,
      section_id: q.section_id,
    }))

    const { error: insertError } = await supabase.from('questions').insert(clones)
    if (insertError) throw insertError

    revalidatePath('/dashboard/questions/bulk')
    return { success: true, count: clones.length }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to duplicate questions" }
  }
}

export async function fetchBulkQuestions(filters?: {
  examId?: string
  seriesId?: string
  testId?: string
  difficulty?: string
  search?: string
}) {
  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const supabase = createAdminClient()

    let query = supabase
      .from('questions')
      .select(`
        id, text, options, correct_answer, explanation,
        marks, negative_marks, difficulty, image_url,
        test_id,
        tests!inner (
          id, title, series_id,
          test_series!inner (
            id, title, exam_id,
            exams!inner ( id, title )
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(500)

    if (filters?.testId) {
      query = query.eq('test_id', filters.testId)
    }

    if (filters?.difficulty) {
      query = query.ilike('difficulty', filters.difficulty)
    }

    if (filters?.search) {
      query = query.ilike('text', `%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) throw error

    // Client-side filter for exam/series since they're nested joins
    let results = data || []
    if (filters?.examId) {
      results = results.filter((q: Record<string, unknown>) => {
        const tests = q.tests as Record<string, unknown> | null
        const series = tests?.test_series as Record<string, unknown> | null
        const exam = series?.exams as Record<string, unknown> | null
        return exam?.id === filters.examId
      })
    }
    if (filters?.seriesId) {
      results = results.filter((q: Record<string, unknown>) => {
        const tests = q.tests as Record<string, unknown> | null
        const series = tests?.test_series as Record<string, unknown> | null
        return series?.id === filters.seriesId
      })
    }

    return { data: results, error: null }
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch questions" }
  }
}

/* ------------------------------------------------------------------ */
/* New bulk-manager actions                                            */
/* ------------------------------------------------------------------ */

export async function inlineUpdateQuestion(id: string, field: string, value: unknown) {
  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const supabase = createAdminClient()

    const allowedFields = ['text', 'marks', 'negative_marks', 'difficulty', 'correct_answer', 'options', 'explanation']
    if (!allowedFields.includes(field)) return { error: `Field "${field}" is not editable` }

    const { error } = await supabase
      .from('questions')
      .update({ [field]: value })
      .eq('id', id)
    if (error) throw error

    revalidatePath('/dashboard/questions/bulk')
    return { success: true }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to update question" }
  }
}

export async function bulkMoveToSection(ids: string[], sectionId: string | null) {
  try {
    await requireAdminRole(["super_admin", "content_manager"])
    if (ids.length === 0) return { error: "No questions selected" }

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('questions')
      .update({ section_id: sectionId })
      .in('id', ids)
    if (error) throw error

    revalidatePath('/dashboard/questions/bulk')
    return { success: true, count: ids.length }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to assign section" }
  }
}

export async function bulkReorderQuestions(orderedIds: string[]) {
  try {
    await requireAdminRole(["super_admin", "content_manager"])
    if (orderedIds.length === 0) return { error: "No questions to reorder" }

    const supabase = createAdminClient()
    // Update order_index for each question
    const updates = orderedIds.map((id, index) =>
      supabase.from('questions').update({ order_index: index }).eq('id', id)
    )
    const results = await Promise.all(updates)
    const failed = results.find((result) => result.error)
    if (failed?.error) {
      return { error: failed.error.message || "Failed to reorder questions" }
    }

    const updatedCount = results.filter((result) => !result.error).length
    if (updatedCount !== orderedIds.length) {
      return { error: "Some questions were not reordered. Please refresh and try again." }
    }

    revalidatePath('/dashboard/questions/bulk')
    return { success: true }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to reorder questions" }
  }
}

export async function findDuplicateQuestions() {
  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('questions')
      .select('id, text, test_id, tests(title)')
      .order('text')
      .limit(2000)
    if (error) throw error

    // Find duplicates by comparing normalised text
    const normalise = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '').trim()
    const groups = new Map<string, typeof data>()

    for (const q of data || []) {
      const key = normalise(q.text || '')
      if (key.length < 10) continue // Skip very short strings
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(q)
    }

    // Only keep groups with 2+ matches
    const duplicates: { text: string; count: number; ids: string[]; tests: string[] }[] = []
    for (const [, group] of groups) {
      if (group.length >= 2) {
        duplicates.push({
          text: group[0].text,
          count: group.length,
          ids: group.map(g => g.id),
          tests: group.map(g => {
            const t = g.tests as unknown as { title: string } | null
            return t?.title || 'Unknown'
          }),
        })
      }
    }

    return { duplicates, totalScanned: (data || []).length, error: null }
  } catch (err: unknown) {
    return { duplicates: [], totalScanned: 0, error: err instanceof Error ? err.message : "Failed to scan" }
  }
}
