"use server"

import { createClient } from "@/lib/supabase/server"
import { testSchema, TestFormValues } from "@/lib/validations/test"
import { revalidatePath } from "next/cache"

export async function createTest(data: TestFormValues) {
  const supabase = await createClient()

  const result = testSchema.safeParse(data)
  if (!result.success) {
    return { error: "Invalid input data" }
  }

  try {
    const { error } = await supabase.from('tests').insert({
      title: data.title,
      series_id: data.series_id,
      description: data.description,
      duration_minutes: data.duration_minutes,
      total_marks: data.total_marks,
      pass_marks: data.pass_marks,
      is_active: data.is_active ?? true,
    })

    if (error) {
      console.error("Supabase Error:", error)
      throw error
    }

    revalidatePath('/dashboard/tests')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || "Failed to create test" }
  }
}

export async function updateTest(id: string, data: TestFormValues) {
  const supabase = await createClient()

  const result = testSchema.safeParse(data)
  if (!result.success) {
    return { error: "Invalid input data" }
  }

  try {
    const { error } = await supabase.from('tests').update({
      title: data.title,
      series_id: data.series_id,
      description: data.description,
      duration_minutes: data.duration_minutes,
      total_marks: data.total_marks,
      pass_marks: data.pass_marks,
      is_active: data.is_active,
    }).eq('id', id)

    if (error) throw error

    revalidatePath('/dashboard/tests')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || "Failed to update test" }
  }
}

export async function deleteTest(id: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase.from('tests').delete().eq('id', id)

    if (error) throw error

    revalidatePath('/dashboard/tests')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || "Failed to delete test" }
  }
}
