"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { revalidatePath } from "next/cache"

export async function createTestSection(testId: string, name: string, durationMinutes: number) {
  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const supabase = createAdminClient()
    const normalizedName = name.trim()

    if (!testId) return { error: "Test is required." }
    if (!normalizedName) return { error: "Section name is required." }

    // Get the current max order_index
    const { data: latest, error: latestError } = await supabase
      .from('test_sections')
      .select('order_index')
      .eq('test_id', testId)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestError) throw new Error(latestError.message)

    const newOrder = (latest?.order_index ?? -1) + 1

    const { error } = await supabase
      .from('test_sections')
      .insert({ test_id: testId, name: normalizedName, duration_minutes: durationMinutes, order_index: newOrder })

    if (error) throw new Error(error.message)

    revalidatePath(`/dashboard/tests/${testId}/builder`)
    return { error: null }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Failed to create section" }
  }
}

export async function updateTestSection(sectionId: string, name: string, durationMinutes: number) {
  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const supabase = createAdminClient()
    const normalizedName = name.trim()

    if (!sectionId) return { error: "Section is required." }
    if (!normalizedName) return { error: "Section name is required." }

    const { data: section, error: sectionError } = await supabase
      .from('test_sections')
      .select('test_id')
      .eq('id', sectionId)
      .single()

    if (sectionError) throw new Error(sectionError.message)

    const { error } = await supabase
      .from('test_sections')
      .update({ name: normalizedName, duration_minutes: durationMinutes, updated_at: new Date().toISOString() })
      .eq('id', sectionId)

    if (error) throw new Error(error.message)

    if (section?.test_id) {
      revalidatePath(`/dashboard/tests/${section.test_id}/builder`)
    }

    return { error: null }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Failed to update section" }
  }
}

export async function deleteTestSection(sectionId: string) {
  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const supabase = createAdminClient()

    const { data: section, error: sectionError } = await supabase
      .from('test_sections')
      .select('test_id')
      .eq('id', sectionId)
      .single()

    if (sectionError) throw new Error(sectionError.message)

    // Deleting a section automatically sets question.section_id to NULL (via 'on delete set null')
    const { error } = await supabase
      .from('test_sections')
      .delete()
      .eq('id', sectionId)

    if (error) throw new Error(error.message)

    if (section?.test_id) {
      revalidatePath(`/dashboard/tests/${section.test_id}/builder`)
    }

    return { error: null }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Failed to delete section" }
  }
}

export async function moveQuestionToSection(questionId: string, sectionId: string | null, testId: string) {
  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('questions')
      .update({ section_id: sectionId })
      .eq('id', questionId)
      .eq('test_id', testId)
      .select('id')
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) throw new Error("Question not found for this test.")

    revalidatePath(`/dashboard/tests/${testId}/builder`)
    return { error: null }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Failed to move question" }
  }
}
