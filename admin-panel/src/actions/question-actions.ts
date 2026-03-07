"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { questionSchema, QuestionFormValues } from "@/lib/validations/question"
import { revalidatePath } from "next/cache"

const BULK_INSERT_CHUNK_SIZE = 200

export async function createQuestion(data: QuestionFormValues) {
  const supabase = createAdminClient()

  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const result = questionSchema.safeParse(data)
    if (!result.success) {
      return { error: "Invalid input data" }
    }

    const correctCount = data.options.filter((option) => option.is_correct).length
    if (correctCount !== 1) {
      return { error: "Exactly one option must be marked as correct." }
    }

    // 1. Create Question
    const { error: questionError } = await supabase.from('questions').insert({
      test_id: data.test_id,
      text: data.question_text, // Mapped to 'text'
      marks: data.marks,
      negative_marks: data.negative_marks,
      explanation: data.explanation,
      options: data.options.map(o => o.text), // Array will be automatically converted to jsonb by Supabase
      correct_answer: data.options.findIndex(o => o.is_correct), // Index of correct answer
      type: 'MCQ'
    }).select().single()

    if (questionError) throw questionError

    revalidatePath('/dashboard/questions')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create question"
    return { error: message }
  }
}

// Update involves deleting old options and re-adding them or updating in place. 
// For simplicity and correctness with IDs, we'll try to update broadly.
// A simpler approach for MVP: Update question details, and for options, we can delete all and recreate 
// OR be smarter. Let's delete all and recreate for now as it's safer for "correct answer" logic consistency.
export async function updateQuestion(id: string, data: QuestionFormValues) {
  const supabase = createAdminClient()

  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const result = questionSchema.safeParse(data)
    if (!result.success) {
      return { error: "Invalid input data" }
    }

    const correctCount = data.options.filter((option) => option.is_correct).length
    if (correctCount !== 1) {
      return { error: "Exactly one option must be marked as correct." }
    }

    // 1. Update Question
    const { error: questionError } = await supabase.from('questions').update({
      test_id: data.test_id,
      text: data.question_text,
      marks: data.marks,
      negative_marks: data.negative_marks,
      explanation: data.explanation,
      options: data.options.map(o => o.text),
      correct_answer: data.options.findIndex(o => o.is_correct),
    }).eq('id', id)

    if (questionError) throw questionError

    revalidatePath('/dashboard/questions')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update question"
    return { error: message }
  }
}

export async function deleteQuestion(id: string) {
  const supabase = createAdminClient()

  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const { error } = await supabase.from('questions').delete().eq('id', id)

    if (error) throw error

    revalidatePath('/dashboard/questions')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete question"
    return { error: message }
  }
}

export async function bulkMoveQuestions(questionIds: string[], targetTestId: string, targetSectionId?: string | null) {
  const supabase = createAdminClient()

  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const updateData: Record<string, unknown> = { test_id: targetTestId }
    if (targetSectionId !== undefined) {
      updateData.section_id = targetSectionId
    }

    const { error } = await supabase
      .from('questions')
      .update(updateData)
      .in('id', questionIds)

    if (error) throw error

    revalidatePath('/dashboard/questions')
    return { success: true, count: questionIds.length }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to move questions" }
  }
}

export async function bulkDeleteQuestions(questionIds: string[]) {
  const supabase = createAdminClient()

  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const { error } = await supabase
      .from('questions')
      .delete()
      .in('id', questionIds)

    if (error) throw error

    revalidatePath('/dashboard/questions')
    return { success: true, count: questionIds.length }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to delete questions" }
  }
}

export async function bulkCreateQuestions(rows: QuestionFormValues[]) {
  const supabase = createAdminClient()

  type RowIssue = { row: number; msg: string }
  type ValidRow = {
    row: number
    payload: {
      test_id: string
      text: string
      marks: number
      negative_marks: number
      explanation?: string
      options: string
      correct_answer: number
      type: "MCQ"
      tags?: string[]
      difficulty?: string
    }
  }

  const rowIssues: RowIssue[] = []
  const validRows: ValidRow[] = []
  let inserted = 0

  try {
    await requireAdminRole(["super_admin", "content_manager"])
    if (!Array.isArray(rows) || rows.length === 0) {
      return { error: "No questions found to upload." }
    }

    rows.forEach((row, index) => {
      const rowNumber = index + 1
      const parsed = questionSchema.safeParse(row)
      if (!parsed.success) {
        rowIssues.push({
          row: rowNumber,
          msg: parsed.error.issues[0]?.message || "Invalid question data",
        })
        return
      }

      const parsedData = parsed.data
      const correctAnswer = parsedData.options.findIndex((option) => option.is_correct)
      if (correctAnswer < 0) {
        rowIssues.push({
          row: rowNumber,
          msg: "Exactly one option must be marked as correct.",
        })
        return
      }

      validRows.push({
        row: rowNumber,
        payload: {
          test_id: parsedData.test_id,
          text: parsedData.question_text,
          marks: parsedData.marks,
          negative_marks: parsedData.negative_marks ?? 0,
          explanation: parsedData.explanation || "",
          options: JSON.stringify(parsedData.options.map((option) => option.text)),
          correct_answer: correctAnswer,
          type: "MCQ",
          tags: parsedData.tags || [],
          difficulty: parsedData.difficulty || undefined,
        },
      })
    })

    if (validRows.length === 0) {
      return {
        error: "No valid questions found.",
        inserted: 0,
        skipped: rowIssues.length,
        rowIssues,
      }
    }

    for (let i = 0; i < validRows.length; i += BULK_INSERT_CHUNK_SIZE) {
      const chunk = validRows.slice(i, i + BULK_INSERT_CHUNK_SIZE)
      const chunkPayload = chunk.map((item) => item.payload)

      const { error } = await supabase.from("questions").insert(chunkPayload)
      if (!error) {
        inserted += chunk.length
        continue
      }

      // If any row in chunk fails, fallback to per-row inserts to provide precise errors.
      for (const item of chunk) {
        const { error: rowError } = await supabase.from("questions").insert(item.payload)
        if (rowError) {
          rowIssues.push({
            row: item.row,
            msg: rowError.message,
          })
        } else {
          inserted += 1
        }
      }
    }

    revalidatePath("/dashboard/questions")
    return {
      success: true,
      inserted,
      skipped: rowIssues.length,
      rowIssues,
    }
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "Failed to upload questions",
      inserted,
      skipped: rowIssues.length,
      rowIssues,
    }
  }
}
