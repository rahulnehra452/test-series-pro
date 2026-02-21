"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { testSeriesSchema, TestSeriesFormValues } from "@/lib/validations/test-series"
import { revalidatePath } from "next/cache"

export async function createTestSeries(data: TestSeriesFormValues) {
  const supabase = createAdminClient()

  const result = testSeriesSchema.safeParse(data)
  if (!result.success) {
    return { error: "Invalid input data" }
  }

  try {
    const { error } = await supabase.from('test_series').insert({
      title: data.title,
      description: data.description,
      exam_id: data.exam_id,
      price: data.price,
      cover_image_url: data.cover_image_url,
      is_active: data.is_active ?? true,
    })

    if (error) {
      console.error("Supabase Error:", error)
      throw error
    }

    revalidatePath('/dashboard/series')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create test series"
    return { error: message }
  }
}

export async function updateTestSeries(id: string, data: TestSeriesFormValues) {
  const supabase = createAdminClient()

  const result = testSeriesSchema.safeParse(data)
  if (!result.success) {
    return { error: "Invalid input data" }
  }

  try {
    const { error } = await supabase.from('test_series').update({
      title: data.title,
      description: data.description,
      exam_id: data.exam_id,
      price: data.price,
      cover_image_url: data.cover_image_url,
      is_active: data.is_active,
    }).eq('id', id)

    if (error) throw error

    revalidatePath('/dashboard/series')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update test series"
    return { error: message }
  }
}

export async function deleteTestSeries(id: string) {
  const supabase = createAdminClient()

  try {
    const { error } = await supabase.from('test_series').delete().eq('id', id)

    if (error) throw error

    revalidatePath('/dashboard/series')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete test series"
    return { error: message }
  }
}
