"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { revalidatePath } from "next/cache"
import { logSubscriptionEvent } from "./subscription-actions"

// ------- Existing actions -------

export async function updateUserProStatus(userId: string, isPro: boolean) {
  try {
    await requireAdminRole(["super_admin", "moderator", "support_agent"])
    const supabase = createAdminClient()

    const pro_expires_at = isPro
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      : null

    const { error } = await supabase
      .from('profiles')
      .update({ is_pro: isPro, pro_plan: isPro ? 'yearly' : null, pro_expires_at })
      .eq('id', userId)

    if (error) throw new Error(error.message)

    await logAdminAction('user.pro_status', userId, { is_pro: isPro })
    await logSubscriptionEvent(userId, isPro ? "granted" : "revoked", isPro ? "PRO" : "FREE", isPro ? 299 : 0)

    revalidatePath("/dashboard/users")
    revalidatePath("/dashboard/subscriptions")
    return { error: null }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Failed to update PRO status" }
  }
}

export async function updateUserSuspension(userId: string, isSuspended: boolean) {
  try {
    await requireAdminRole(["super_admin", "moderator", "support_agent"])
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('profiles')
      .update({ is_suspended: isSuspended })
      .eq('id', userId)

    if (error) throw new Error(error.message)

    await logAdminAction('user.suspension', userId, { is_suspended: isSuspended })
    revalidatePath("/dashboard/users")
    return { error: null }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Failed to update suspension status" }
  }
}

// ------- New Phase 2 actions -------

export async function getUserDetail(userId: string) {
  try {
    await requireAdminRole(["super_admin", "moderator", "support_agent"])
    const supabase = createAdminClient()

    const [
      { data: profile, error: profileError },
      { data: attempts },
      { count: totalAttempts },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('attempts')
        .select('id, test_id, score, total_marks, status, completed_at, tests(title)')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(20),
      supabase.from('attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
    ])

    if (profileError) throw profileError

    return { profile, attempts: attempts || [], totalAttempts: totalAttempts ?? 0, error: null }
  } catch (err: unknown) {
    return { profile: null, attempts: [], totalAttempts: 0, error: err instanceof Error ? err.message : "Failed to fetch user" }
  }
}

export async function updateUserProfile(userId: string, data: {
  full_name?: string
  is_pro?: boolean
  pro_plan?: string | null
  pro_expires_at?: string | null
  is_suspended?: boolean
}) {
  try {
    await requireAdminRole(["super_admin", "moderator"])
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId)

    if (error) throw error

    await logAdminAction('user.profile_update', userId, data)
    revalidatePath("/dashboard/users")
    revalidatePath(`/dashboard/users/${userId}`)
    return { error: null }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to update profile" }
  }
}

export async function grantCustomPro(userId: string, plan: string, expiresAt: string) {
  try {
    await requireAdminRole(["super_admin"])
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        is_pro: true,
        pro_plan: plan,
        pro_expires_at: expiresAt,
      })
      .eq('id', userId)

    if (error) throw error

    await logAdminAction('user.grant_pro', userId, { plan, expires_at: expiresAt })
    revalidatePath("/dashboard/users")
    revalidatePath(`/dashboard/users/${userId}`)
    return { error: null }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to grant PRO" }
  }
}

export async function searchUsers(query: string, filters?: {
  isPro?: boolean
  isSuspended?: boolean
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}) {
  try {
    await requireAdminRole(["super_admin", "moderator", "support_agent"])
    const supabase = createAdminClient()

    let q = supabase
      .from('profiles')
      .select('*')
      .order(filters?.sortBy || 'created_at', { ascending: filters?.sortDir === 'asc' })
      .limit(200)

    if (query.trim()) {
      q = q.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    }
    if (filters?.isPro !== undefined) {
      q = q.eq('is_pro', filters.isPro)
    }
    if (filters?.isSuspended !== undefined) {
      q = q.eq('is_suspended', filters.isSuspended)
    }

    const { data, error } = await q
    if (error) throw error

    return { data: data || [], error: null }
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : "Search failed" }
  }
}

export async function getSubscriptionStats() {
  try {
    await requireAdminRole(["super_admin", "moderator"])
    const supabase = createAdminClient()

    const [
      { count: totalUsers },
      { count: proUsers },
      { data: proProfiles },
      { count: suspendedUsers },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_pro', true),
      supabase.from('profiles').select('id, full_name, email, pro_plan, pro_expires_at, created_at').eq('is_pro', true).order('pro_expires_at', { ascending: true }).limit(100),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_suspended', true),
    ])

    // Plan breakdown
    const planBreakdown: Record<string, number> = {}
    const expiringWithin30Days: typeof proProfiles = []
    const now = new Date()
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    proProfiles?.forEach(p => {
      const plan = p.pro_plan || 'unknown'
      planBreakdown[plan] = (planBreakdown[plan] || 0) + 1
      if (p.pro_expires_at && new Date(p.pro_expires_at) <= thirtyDaysLater) {
        expiringWithin30Days.push(p)
      }
    })

    return {
      totalUsers: totalUsers ?? 0,
      proUsers: proUsers ?? 0,
      suspendedUsers: suspendedUsers ?? 0,
      freeUsers: (totalUsers ?? 0) - (proUsers ?? 0),
      planBreakdown,
      proProfiles: proProfiles || [],
      expiringWithin30Days: expiringWithin30Days || [],
      conversionRate: totalUsers ? Math.round(((proUsers ?? 0) / totalUsers) * 100) : 0,
      error: null,
    }
  } catch (err: unknown) {
    return {
      totalUsers: 0, proUsers: 0, suspendedUsers: 0, freeUsers: 0,
      planBreakdown: {}, proProfiles: [], expiringWithin30Days: [],
      conversionRate: 0,
      error: err instanceof Error ? err.message : "Failed to fetch stats"
    }
  }
}

// ------- Audit log -------

export async function logAdminAction(action: string, targetId: string, details?: Record<string, unknown>) {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase.from('admin_audit_log').insert({
      action,
      target_id: targetId,
      details: details ? JSON.stringify(details) : null,
    })

    if (error) {
      console.error('[Audit Log] Failed to write:', error.message)
    }
  } catch (err) {
    // Log the error so audit failures are visible in server logs
    console.error('[Audit Log] Exception:', err)
  }
}

export async function getAuditLogs(filters?: {
  action?: string
  limit?: number
}) {
  try {
    await requireAdminRole(["super_admin"])
    const supabase = createAdminClient()

    let query = supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(filters?.limit || 100)

    if (filters?.action) {
      query = query.ilike('action', `%${filters.action}%`)
    }

    const { data, error } = await query
    if (error) throw error

    return { data: data || [], error: null }
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : "Failed to fetch audit logs" }
  }
}
