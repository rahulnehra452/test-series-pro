"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { revalidatePath } from "next/cache"

export async function getAllTags() {
  const supabase = createAdminClient()

  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const { data, error } = await supabase
      .from('questions')
      .select('tags')
      .not('tags', 'eq', '{}')

    if (error) throw error

    // Extract unique tags from all questions
    const tagSet = new Set<string>()
      ; (data || []).forEach((q) => {
        if (q.tags && Array.isArray(q.tags)) {
          q.tags.forEach((t: string) => tagSet.add(t))
        }
      })

    return { tags: Array.from(tagSet).sort() }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to fetch tags" }
  }
}

export async function updateQuestionTags(questionId: string, tags: string[]) {
  const supabase = createAdminClient()

  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const cleanTags = tags.map(t => t.trim().toLowerCase()).filter(Boolean)
    const { error } = await supabase
      .from('questions')
      .update({ tags: cleanTags })
      .eq('id', questionId)

    if (error) throw error

    revalidatePath('/dashboard/questions')
    revalidatePath('/dashboard/tags')
    return { success: true }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to update tags" }
  }
}

export async function bulkAssignTags(questionIds: string[], tags: string[]) {
  const supabase = createAdminClient()

  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const cleanTags = tags.map(t => t.trim().toLowerCase()).filter(Boolean)
    if (cleanTags.length === 0 || questionIds.length === 0) {
      return { error: "No valid questions or tags provided." }
    }

    // Fetch tags for all rows in one query, then update in parallel.
    const { data: existingRows, error: existingError } = await supabase
      .from('questions')
      .select('id, tags')
      .in('id', questionIds)

    if (existingError) throw existingError

    const updates = (existingRows || []).map((row) => {
      const existingTags: string[] = Array.isArray(row.tags) ? row.tags : []
      const merged = Array.from(new Set([...existingTags, ...cleanTags]))

      return supabase
        .from('questions')
        .update({ tags: merged })
        .eq('id', row.id)
    })

    const updateResults = await Promise.all(updates)
    const firstError = updateResults.find((result) => result.error)?.error
    if (firstError) throw firstError

    revalidatePath('/dashboard/questions')
    revalidatePath('/dashboard/tags')
    return { success: true }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to bulk assign tags" }
  }
}

export async function getQuestionsByTag(tag: string) {
  const supabase = createAdminClient()

  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const { data, error } = await supabase
      .from('questions')
      .select('id, text, tags, test_id, tests(title)')
      .contains('tags', [tag])
      .order('created_at', { ascending: false })

    if (error) throw error
    return { questions: data || [] }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to fetch questions by tag" }
  }
}
