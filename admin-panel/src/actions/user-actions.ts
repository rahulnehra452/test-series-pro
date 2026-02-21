"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function updateUserProStatus(userId: string, isPro: boolean) {
  try {
    const supabase = createAdminClient()

    // Set 1 year expiry if granting pro, or null if revoking
    const pro_expires_at = isPro
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      : null

    const { error } = await supabase
      .from('profiles')
      .update({ is_pro: isPro, pro_plan: isPro ? 'yearly' : null, pro_expires_at })
      .eq('id', userId)

    if (error) throw new Error(error.message)

    revalidatePath("/dashboard/users")
    return { error: null }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Failed to update PRO status" }
  }
}

export async function updateUserSuspension(userId: string, isSuspended: boolean) {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('profiles')
      .update({ is_suspended: isSuspended })
      .eq('id', userId)

    if (error) throw new Error(error.message)

    revalidatePath("/dashboard/users")
    return { error: null }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Failed to update suspension status" }
  }
}
