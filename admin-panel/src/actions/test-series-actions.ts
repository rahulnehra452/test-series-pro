"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { testSeriesSchema, TestSeriesFormValues } from "@/lib/validations/test-series"
import { revalidatePath } from "next/cache"

export async function createTestSeries(data: TestSeriesFormValues) {
  const supabase = createAdminClient()

  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const result = testSeriesSchema.safeParse(data)
    if (!result.success) {
      return { error: "Invalid input data" }
    }

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

  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const result = testSeriesSchema.safeParse(data)
    if (!result.success) {
      return { error: "Invalid input data" }
    }

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
    await requireAdminRole(["super_admin", "content_manager"])
    const { error } = await supabase.from('test_series').delete().eq('id', id)

    if (error) throw error

    revalidatePath('/dashboard/series')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete test series"
    return { error: message }
  }
}

export async function duplicateTestSeries(id: string) {
  const supabase = createAdminClient()

  try {
    await requireAdminRole(["super_admin", "content_manager"])

    const { data: original, error: fetchError } = await supabase
      .from('test_series')
      .select('*')
      .eq('id', id)
      .single()
    if (fetchError || !original) throw new Error("Test series not found")

    const { error: insertError } = await supabase
      .from('test_series')
      .insert({
        title: `${original.title} (Copy)`,
        description: original.description,
        exam_id: original.exam_id,
        price: original.price,
        cover_image_url: original.cover_image_url,
        is_active: false,
      })

    if (insertError) throw new Error(insertError.message)

    revalidatePath('/dashboard/series')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to duplicate test series"
    return { error: message }
  }
}
