"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { revalidatePath } from "next/cache"
import { logAdminAction } from "@/actions/user-actions"

// ---- Test Ordering (#7) ----

export async function reorderTests(seriesId: string, orderedIds: string[]) {
  await requireAdminRole(["super_admin", "content_manager"])
  const supabase = createAdminClient()
  const updates = orderedIds.map((id, i) =>
    supabase.from('tests').update({ sort_order: i }).eq('id', id)
  )
  await Promise.all(updates)
  revalidatePath('/dashboard/tests')
  return { success: true }
}

export async function reorderSeries(examId: string, orderedIds: string[]) {
  await requireAdminRole(["super_admin", "content_manager"])
  const supabase = createAdminClient()
  const updates = orderedIds.map((id, i) =>
    supabase.from('test_series').update({ sort_order: i }).eq('id', id)
  )
  await Promise.all(updates)
  revalidatePath('/dashboard/series')
  return { success: true }
}

// ---- Batch Test Actions (#8) ----

export async function batchToggleTests(ids: string[], isActive: boolean) {
  await requireAdminRole(["super_admin", "content_manager"])
  const supabase = createAdminClient()
  const { error } = await supabase.from('tests').update({ is_active: isActive }).in('id', ids)
  if (error) return { error: error.message }
  await logAdminAction('test.batch_toggle', 'multiple', { count: ids.length, isActive })
  revalidatePath('/dashboard/tests')
  return { success: true, count: ids.length }
}

export async function batchDeleteTests(ids: string[]) {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  const { error } = await supabase.from('tests').delete().in('id', ids)
  if (error) return { error: error.message }
  await logAdminAction('test.batch_delete', 'multiple', { count: ids.length })
  revalidatePath('/dashboard/tests')
  return { success: true, count: ids.length }
}

// ---- Coupons (#15) ----

export async function getCoupons() {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('coupons')
    .select('*').order('created_at', { ascending: false })
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function createCoupon(params: {
  code: string; discount_percent: number; max_uses?: number; valid_until?: string
}) {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  const { error } = await supabase.from('coupons').insert({
    code: params.code.toUpperCase().replace(/\s/g, ''),
    discount_percent: params.discount_percent,
    max_uses: params.max_uses || null,
    valid_until: params.valid_until || null,
  })
  if (error) return { error: error.message }
  revalidatePath('/dashboard/coupons')
  return { success: true }
}

export async function toggleCoupon(id: string, isActive: boolean) {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  const { error } = await supabase.from('coupons').update({ is_active: isActive }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/coupons')
  return { success: true }
}

export async function deleteCoupon(id: string) {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  const { error } = await supabase.from('coupons').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/coupons')
  return { success: true }
}

// ---- Content Versioning (#13) ----

export async function saveQuestionVersion(questionId: string) {
  await requireAdminRole(["super_admin", "content_manager"])
  const supabase = createAdminClient()
  const { data: q, error: fetchErr } = await supabase.from('questions')
    .select('text, options, correct_answer, explanation, difficulty')
    .eq('id', questionId).single()
  if (fetchErr || !q) return { error: 'Question not found' }
  const { error } = await supabase.from('question_versions').insert({
    question_id: questionId,
    text: q.text,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    difficulty: q.difficulty,
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function getQuestionVersions(questionId: string) {
  await requireAdminRole(["super_admin", "content_manager"])
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('question_versions')
    .select('*').eq('question_id', questionId)
    .order('created_at', { ascending: false }).limit(20)
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function restoreQuestionVersion(questionId: string, versionId: string) {
  await requireAdminRole(["super_admin", "content_manager"])
  const supabase = createAdminClient()
  // First save current as a version
  await saveQuestionVersion(questionId)
  // Then restore the old version
  const { data: version, error: fetchErr } = await supabase.from('question_versions')
    .select('text, options, correct_answer, explanation, difficulty')
    .eq('id', versionId).single()
  if (fetchErr || !version) return { error: 'Version not found' }
  const { error } = await supabase.from('questions')
    .update({
      text: version.text,
      options: version.options,
      correct_answer: version.correct_answer,
      explanation: version.explanation,
      difficulty: version.difficulty,
    }).eq('id', questionId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/questions')
  return { success: true }
}

// ---- Student Performance Analytics (#14) ----

export async function getPerformanceAnalytics() {
  await requireAdminRole(["super_admin", "moderator"])
  const supabase = createAdminClient()

  const [
    { data: attempts },
    { data: tests },
    { count: totalAttempts },
  ] = await Promise.all([
    supabase.from('attempts')
      .select('test_id, score, total_marks, status, completed_at')
      .ilike('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(5000),
    supabase.from('tests')
      .select('id, title, total_questions, total_marks')
      .limit(500),
    supabase.from('attempts').select('*', { count: 'exact', head: true }),
  ])

  // Compute per-test stats
  const testMap = new Map<string, { title: string; scores: number[]; totalMarks: number }>()
  for (const t of tests || []) {
    testMap.set(t.id, { title: t.title, scores: [], totalMarks: t.total_marks || 100 })
  }
  for (const a of attempts || []) {
    const entry = testMap.get(a.test_id)
    if (entry && a.score !== null) entry.scores.push(a.score)
  }

  const testStats = Array.from(testMap.entries())
    .filter(([, v]) => v.scores.length > 0)
    .map(([id, v]) => {
      const avg = v.scores.reduce((s, x) => s + x, 0) / v.scores.length
      const passCount = v.scores.filter(s => s >= v.totalMarks * 0.4).length
      return {
        testId: id,
        title: v.title,
        attemptCount: v.scores.length,
        averageScore: Math.round(avg * 10) / 10,
        averagePercent: Math.round((avg / v.totalMarks) * 100),
        passRate: Math.round((passCount / v.scores.length) * 100),
        highestScore: Math.max(...v.scores),
        lowestScore: Math.min(...v.scores),
      }
    })
    .sort((a, b) => b.attemptCount - a.attemptCount)
    .slice(0, 20)

  // Daily attempt counts (last 30 days)
  const dailyCounts: Record<string, number> = {}
  for (const a of attempts || []) {
    if (a.completed_at) {
      const day = a.completed_at.slice(0, 10)
      dailyCounts[day] = (dailyCounts[day] || 0) + 1
    }
  }

  return {
    totalAttempts: totalAttempts ?? 0,
    completedAttempts: (attempts || []).length,
    testStats,
    dailyCounts,
  }
}

// ---- Activity Heatmap Data (#11) ----

export async function getActivityHeatmap() {
  await requireAdminRole(["super_admin", "moderator"])
  const supabase = createAdminClient()

  // Get attempts from last 90 days
  const since = new Date()
  since.setDate(since.getDate() - 90)
  const { data } = await supabase.from('attempts')
    .select('completed_at')
    .gte('completed_at', since.toISOString())
    .order('completed_at', { ascending: true })
    .limit(10000)

  const heatmap: Record<string, number> = {}
  for (const a of data || []) {
    if (a.completed_at) {
      const day = a.completed_at.slice(0, 10)
      heatmap[day] = (heatmap[day] || 0) + 1
    }
  }
  return heatmap
}
