"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function createTestSection(testId: string, name: string, durationMinutes: number) {
  try {
    const supabase = createAdminClient()

    // Get the current max order_index
    const { data: latest } = await supabase
      .from('test_sections')
      .select('order_index')
      .eq('test_id', testId)
      .order('order_index', { ascending: false })
      .limit(1)
      .single()

    const newOrder = (latest?.order_index ?? -1) + 1

    const { error } = await supabase
      .from('test_sections')
      .insert({ test_id: testId, name, duration_minutes: durationMinutes, order_index: newOrder })

    if (error) throw new Error(error.message)

    revalidatePath(`/dashboard/tests/${testId}/builder`)
    return { error: null }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Failed to create section" }
  }
}

export async function updateTestSection(sectionId: string, name: string, durationMinutes: number) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('test_sections')
      .update({ name, duration_minutes: durationMinutes, updated_at: new Date().toISOString() })
      .eq('id', sectionId)

    if (error) throw new Error(error.message)

    return { error: null }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Failed to update section" }
  }
}

export async function deleteTestSection(sectionId: string) {
  try {
    const supabase = createAdminClient()

    // Deleting a section automatically sets question.section_id to NULL (via 'on delete set null')
    const { error } = await supabase
      .from('test_sections')
      .delete()
      .eq('id', sectionId)

    if (error) throw new Error(error.message)

    return { error: null }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Failed to delete section" }
  }
}

export async function moveQuestionToSection(questionId: string, sectionId: string | null, testId: string) {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('questions')
      .update({ section_id: sectionId })
      .eq('id', questionId)

    if (error) throw new Error(error.message)

    revalidatePath(`/dashboard/tests/${testId}/builder`)
    return { error: null }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Failed to move question" }
  }
}
