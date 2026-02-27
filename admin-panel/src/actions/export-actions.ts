"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"

// ---- Export Data ----

export async function exportUsers() {
  await requireAdminRole(["super_admin", "moderator"])
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('profiles')
    .select('id, full_name, email, is_pro, pro_plan, pro_expires_at, is_suspended, streak, last_active_at, created_at')
    .order('created_at', { ascending: false })
    .limit(10000)
  if (error) return { csv: null, error: error.message }
  return { csv: toCsv(data || [], ['id', 'full_name', 'email', 'is_pro', 'pro_plan', 'pro_expires_at', 'is_suspended', 'streak', 'last_active_at', 'created_at']), error: null }
}

export async function exportQuestions(testId?: string) {
  await requireAdminRole(["super_admin", "content_manager"])
  const supabase = createAdminClient()
  let query = supabase.from('questions')
    .select('id, text, correct_answer, difficulty, marks, negative_marks, test_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10000)
  if (testId) query = query.eq('test_id', testId)
  const { data, error } = await query
  if (error) return { csv: null, error: error.message }
  return { csv: toCsv(data || [], ['id', 'text', 'correct_answer', 'difficulty', 'marks', 'negative_marks', 'test_id', 'created_at']), error: null }
}

export async function exportAttempts() {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('attempts')
    .select('id, user_id, test_id, score, total_marks, status, completed_at, created_at')
    .order('completed_at', { ascending: false })
    .limit(10000)
  if (error) return { csv: null, error: error.message }
  return { csv: toCsv(data || [], ['id', 'user_id', 'test_id', 'score', 'total_marks', 'status', 'completed_at', 'created_at']), error: null }
}

export async function getExportPreview(table: string, columns: string[], limit: number = 100) {
  await requireAdminRole(["super_admin", "moderator", "content_manager"])
  const supabase = createAdminClient()

  // Create a safe select string, default to '*' if empty
  const selectString = columns.length > 0 ? columns.join(', ') : '*'

  const { data, error } = await supabase
    .from(table)
    .select(selectString)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function processCustomExport(table: string, columns: string[], format: 'csv' | 'json') {
  await requireAdminRole(["super_admin", "moderator", "content_manager"])
  const supabase = createAdminClient()

  const selectString = columns.length > 0 ? columns.join(', ') : '*'
  const { data, error } = await supabase
    .from(table)
    .select(selectString)
    .order('created_at', { ascending: false })
    .limit(10000) // Max limit for export

  if (error) return { content: null, error: error.message }

  if (format === 'json') {
    return { content: JSON.stringify(data, null, 2), error: null }
  } else {
    return { content: toCsv(data || [], columns), error: null }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCsv(rows: any[], columns: string[]): string {
  const header = columns.join(',')
  const lines = rows.map(row =>
    columns.map(col => {
      const val = row[col]
      if (val === null || val === undefined) return ''
      const str = String(val).replace(/"/g, '""')
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str
    }).join(',')
  )
  return [header, ...lines].join('\n')
}

// ---- Config / Settings ----

export async function getSettings() {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  const { data } = await supabase.from('platform_settings').select('*').limit(50)
  // Convert array of {key, value} to record
  const settings: Record<string, string> = {}
  for (const row of data || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    settings[r.key || r.setting_key || r.name || r.id] = r.value || r.setting_value || ''
  }
  return settings
}

export async function updateSetting(key: string, value: string) {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  const { error } = await supabase.from('platform_settings')
    .upsert({ key, value }, { onConflict: 'key' })
  if (error) return { error: error.message }
  return { success: true }
}
