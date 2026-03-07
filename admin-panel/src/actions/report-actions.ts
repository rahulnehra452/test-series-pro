"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { revalidatePath } from "next/cache"

export async function getReports(status?: string) {
  const supabase = createAdminClient()

  try {
    await requireAdminRole(["super_admin", "moderator"])
    let query = supabase
      .from('reported_questions')
      .select(`
        *,
        questions (
          id,
          text,
          options,
          correct_answer,
          explanation,
          marks,
          negative_marks,
          type,
          tags,
          test_id,
          tests ( title )
        ),
        profiles:user_id (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error
    return { reports: data || [] }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to fetch reports" }
  }
}

export async function resolveReport(
  reportId: string,
  status: 'reviewed' | 'resolved' | 'dismissed',
  adminNotes: string
) {
  try {
    const { admin } = await requireAdminRole(["super_admin", "moderator"])
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('reported_questions')
      .update({
        status,
        admin_notes: adminNotes,
        resolved_by: admin.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', reportId)

    if (error) throw error

    revalidatePath('/dashboard/reports')
    return { success: true }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to resolve report" }
  }
}

export async function getReportStats() {
  const supabase = createAdminClient()

  try {
    await requireAdminRole(["super_admin", "moderator"])
    const { data, error } = await supabase
      .from('reported_questions')
      .select('status')

    if (error) throw error

    const stats = {
      pending: 0,
      reviewed: 0,
      resolved: 0,
      dismissed: 0,
      total: 0,
    }

      ; (data || []).forEach((r) => {
        stats.total++
        const s = r.status as keyof typeof stats
        if (s in stats && s !== 'total') stats[s]++
      })

    return { stats }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to fetch report stats" }
  }
}
