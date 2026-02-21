"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export type PlatformSettings = {
  id: string
  maintenance_mode: boolean
  mock_fallbacks_enabled: boolean
  android_version_code: number
  ios_version_code: number
  global_announcement: string | null
  payment_gateway_active: boolean
}

export async function updatePlatformSettings(data: Partial<PlatformSettings>) {
  try {
    const supabase = createAdminClient()

    // As we have a single row constraint, we can just update without specific ID or match on the first row
    const { data: existing } = await supabase.from('platform_settings').select('id').limit(1).single()

    let res;
    if (existing) {
      res = await supabase.from('platform_settings').update({ ...data, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      res = await supabase.from('platform_settings').insert([data])
    }

    if (res.error) throw new Error(res.error.message)

    revalidatePath("/dashboard/config")
    return { error: null }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Failed to update platform settings" }
  }
}
