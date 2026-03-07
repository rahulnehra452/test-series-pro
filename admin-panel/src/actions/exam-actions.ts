'use server'

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { examSchema, type ExamFormValues } from "@/lib/validations/exam"
import { revalidatePath } from "next/cache"
import { logAdminAction } from "@/actions/user-actions"

export async function createExam(data: ExamFormValues) {
  const supabase = createAdminClient()

  try {
    await requireAdminRole(["super_admin", "content_manager"])
    // Validate input
    const result = examSchema.safeParse(data)
    if (!result.success) {
      return { error: "Invalid input data" }
    }

    const { data: insertedData, error } = await supabase.from('exams').insert({
      title: data.title,
      slug: data.slug,
      icon_url: data.icon_url,
      is_active: data.is_active,
    }).select('id').single()

    if (error) throw error

    await logAdminAction('exam.create', data.slug, { title: data.title })
    revalidatePath('/dashboard/exams')
    return { success: true, id: insertedData.id }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create exam"
    return { error: message }
  }
}

export async function updateExam(id: string, data: ExamFormValues) {
  const supabase = createAdminClient()

  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const result = examSchema.safeParse(data)
    if (!result.success) {
      return { error: "Invalid input data" }
    }

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

    await logAdminAction('exam.update', id, { title: data.title })
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
    await requireAdminRole(["super_admin", "content_manager"])

    // Safety Check: Prevent deletion if exam contains test series
    const { count: seriesCount } = await supabase
      .from('test_series')
      .select('*', { count: 'exact', head: true })
      .eq('exam_id', id)

    if (seriesCount && seriesCount > 0) {
      return { error: `Cannot delete exam because it contains ${seriesCount} test series. Please delete them first, or toggle the exam to Inactive.` }
    }

    const { error } = await supabase.from('exams').delete().eq('id', id)

    if (error) throw error

    await logAdminAction('exam.delete', id, {})
    revalidatePath('/dashboard/exams')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete exam"
    return { error: message }
  }
}

export async function batchToggleExams(ids: string[], isActive: boolean) {
  const supabase = createAdminClient()
  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const { error } = await supabase.from('exams').update({ is_active: isActive }).in('id', ids)
    if (error) throw error
    await logAdminAction('exam.batch_toggle', 'multiple', { count: ids.length, isActive })
    revalidatePath('/dashboard/exams')
    return { success: true }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to toggle exams" }
  }
}

export async function batchDeleteExams(ids: string[]) {
  const supabase = createAdminClient()
  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const { error } = await supabase.from('exams').delete().in('id', ids)
    if (error) throw error
    await logAdminAction('exam.batch_delete', 'multiple', { count: ids.length })
    revalidatePath('/dashboard/exams')
    return { success: true }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to delete exams" }
  }
}
