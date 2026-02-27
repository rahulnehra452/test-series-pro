"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { revalidatePath } from "next/cache"

// ──────────── AFFILIATES ────────────

export async function getAffiliates() {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('affiliates')
    .select('*').order('created_at', { ascending: false })
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function createAffiliate(params: {
  name: string; email: string; commission_percent: number
}) {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  const code = `AFF-${params.name.replace(/\s+/g, '').toUpperCase().slice(0, 6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  const { error } = await supabase.from('affiliates').insert({
    name: params.name,
    email: params.email,
    affiliate_code: code,
    commission_percent: params.commission_percent,
  })
  if (error) return { error: error.message }
  revalidatePath('/dashboard/coupons')
  return { success: true, code }
}

export async function toggleAffiliate(id: string, isActive: boolean) {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  const { error } = await supabase.from('affiliates').update({ is_active: isActive }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/coupons')
  return { success: true }
}

export async function deleteAffiliate(id: string) {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  const { error } = await supabase.from('affiliates').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/coupons')
  return { success: true }
}

export async function getReferrals(affiliateId?: string) {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  let query = supabase.from('referrals')
    .select('*, affiliates(name, affiliate_code)')
    .order('created_at', { ascending: false }).limit(100)
  if (affiliateId) query = query.eq('affiliate_id', affiliateId)
  const { data, error } = await query
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ──────────── FLASH SALES ────────────

export async function getFlashSales() {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('flash_sales')
    .select('*').order('starts_at', { ascending: false })
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function createFlashSale(params: {
  title: string; description: string; discount_percent: number
  starts_at: string; ends_at: string; max_redemptions?: number
}) {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  const { error } = await supabase.from('flash_sales').insert({
    title: params.title,
    description: params.description,
    discount_percent: params.discount_percent,
    starts_at: params.starts_at,
    ends_at: params.ends_at,
    max_redemptions: params.max_redemptions || null,
  })
  if (error) return { error: error.message }
  revalidatePath('/dashboard/coupons')
  return { success: true }
}

export async function toggleFlashSale(id: string, isActive: boolean) {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  const { error } = await supabase.from('flash_sales').update({ is_active: isActive }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/coupons')
  return { success: true }
}

export async function deleteFlashSale(id: string) {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  const { error } = await supabase.from('flash_sales').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/coupons')
  return { success: true }
}

// ──────────── BUNDLE DEALS ────────────

export async function getBundleDeals() {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('bundle_deals')
    .select('*').order('created_at', { ascending: false })
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function createBundleDeal(params: {
  title: string; description: string; series_ids: string[]
  original_price: number; bundle_price: number
}) {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  const { error } = await supabase.from('bundle_deals').insert({
    title: params.title,
    description: params.description,
    series_ids: params.series_ids,
    original_price: params.original_price,
    bundle_price: params.bundle_price,
  })
  if (error) return { error: error.message }
  revalidatePath('/dashboard/coupons')
  return { success: true }
}

export async function toggleBundleDeal(id: string, isActive: boolean) {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  const { error } = await supabase.from('bundle_deals').update({ is_active: isActive }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/coupons')
  return { success: true }
}

export async function deleteBundleDeal(id: string) {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()
  const { error } = await supabase.from('bundle_deals').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/coupons')
  return { success: true }
}
