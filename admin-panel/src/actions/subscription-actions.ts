"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"

export type SubscriptionEvent = {
  id: string
  user_id: string
  event_type: "upgrade" | "downgrade" | "expired" | "canceled" | "renewed" | "granted" | "revoked"
  plan: string | null
  amount: number | null
  created_at: string
  profiles?: {
    full_name: string | null
    email: string | null
  }
}

export async function logSubscriptionEvent(
  userId: string,
  eventType: SubscriptionEvent["event_type"],
  plan: string | null = null,
  amount: number | null = null
) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("subscription_events").insert({
      user_id: userId,
      event_type: eventType,
      plan,
      amount
    })

    if (error) {
      console.error("Failed to log subscription event:", error)
      return { error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    console.error("Failed to log subscription event:", err)
    return { error: "Failed to log event" }
  }
}

export async function getSubscriptionEvents(limit = 100): Promise<{ data?: SubscriptionEvent[], error?: string }> {
  try {
    await requireAdminRole(["super_admin", "moderator", "support_agent"])
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("subscription_events")
      .select(`
        *,
        profiles!inner (
          full_name,
          email
        )
      `)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) throw error

    return { data: data as SubscriptionEvent[] }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to fetch subscription events" }
  }
}
