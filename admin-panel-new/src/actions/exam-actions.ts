'use server'

import { createClient } from "@/lib/supabase/server"
import { examSchema, type ExamFormValues } from "@/lib/validations/exam"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createExam(data: ExamFormValues) {
  const supabase = await createClient()

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
  } catch (error: any) {
    return { error: error.message || "Failed to create exam" }
  }
}

export async function updateExam(id: string, data: ExamFormValues) {
  const supabase = await createClient()

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
  } catch (error: any) {
    return { error: error.message || "Failed to update exam" }
  }
}

export async function deleteExam(id: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase.from('exams').delete().eq('id', id)

    if (error) throw error

    revalidatePath('/dashboard/exams')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || "Failed to delete exam" }
  }
}
