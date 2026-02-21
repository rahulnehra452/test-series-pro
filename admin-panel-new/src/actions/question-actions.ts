"use server"

import { createClient } from "@/lib/supabase/server"
import { questionSchema, QuestionFormValues } from "@/lib/validations/question"
import { revalidatePath } from "next/cache"

export async function createQuestion(data: QuestionFormValues) {
  const supabase = await createClient()

  const result = questionSchema.safeParse(data)
  if (!result.success) {
    return { error: "Invalid input data" }
  }

  try {
    // 1. Create Question
    const { data: questionData, error: questionError } = await supabase.from('questions').insert({
      test_id: data.test_id,
      text: data.question_text, // Mapped to 'text'
      marks: data.marks,
      negative_marks: data.negative_marks,
      explanation: data.explanation,
      options: JSON.stringify(data.options.map(o => o.text)), // Simple array of strings for options
      correct_answer: data.options.findIndex(o => o.is_correct), // Index of correct answer
      type: 'MCQ'
    }).select().single()

    if (questionError) throw questionError

    revalidatePath('/dashboard/questions')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || "Failed to create question" }
  }
}

// Update involves deleting old options and re-adding them or updating in place. 
// For simplicity and correctness with IDs, we'll try to update broadly.
// A simpler approach for MVP: Update question details, and for options, we can delete all and recreate 
// OR be smarter. Let's delete all and recreate for now as it's safer for "correct answer" logic consistency.
export async function updateQuestion(id: string, data: QuestionFormValues) {
  const supabase = await createClient()

  const result = questionSchema.safeParse(data)
  if (!result.success) {
    return { error: "Invalid input data" }
  }

  try {
    // 1. Update Question
    const { error: questionError } = await supabase.from('questions').update({
      test_id: data.test_id,
      text: data.question_text,
      marks: data.marks,
      negative_marks: data.negative_marks,
      explanation: data.explanation,
      options: JSON.stringify(data.options.map(o => o.text)),
      correct_answer: data.options.findIndex(o => o.is_correct),
    }).eq('id', id)

    if (questionError) throw questionError

    revalidatePath('/dashboard/questions')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || "Failed to update question" }
  }
}

export async function deleteQuestion(id: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase.from('questions').delete().eq('id', id)

    if (error) throw error

    revalidatePath('/dashboard/questions')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || "Failed to delete question" }
  }
}
