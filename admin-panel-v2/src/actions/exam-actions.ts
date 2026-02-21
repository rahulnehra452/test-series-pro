'use server'

import { createAdminClient } from "@/lib/supabase/admin"
import { examSchema, type ExamFormValues } from "@/lib/validations/exam"
import { revalidatePath } from "next/cache"

export async function createExam(data: ExamFormValues) {
  const supabase = createAdminClient()

  // Validate input
  const result = examSchema.safeParse(data)
  if (!result.success) {
    return { error: "Invalid input data" }
  }

  try {
    const { error } = await supabase.from('exams').insert({
      title: data.title,
      slug: data.slug,
      icon_url: data.icon_url,
      is_active: data.is_active,
    })

    if (error) throw error

    revalidatePath('/dashboard/exams')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create exam"
    return { error: message }
  }
}

export async function updateExam(id: string, data: ExamFormValues) {
  const supabase = createAdminClient()

  const result = examSchema.safeParse(data)
  if (!result.success) {
    return { error: "Invalid input data" }
  }

  try {
    const { error } = await supabase
      .from('exams')
      .update({
        title: data.title,
        slug: data.slug,
        icon_url: data.icon_url,
        is_active: data.is_active,
      })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/dashboard/exams')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update exam"
    return { error: message }
  }
}

export async function deleteExam(id: string) {
  const supabase = createAdminClient()

  try {
    const { error } = await supabase.from('exams').delete().eq('id', id)

    if (error) throw error

    revalidatePath('/dashboard/exams')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete exam"
    return { error: message }
  }
}
