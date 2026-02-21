import { createAdminClient } from "@/lib/supabase/admin"
import { ConfigClient } from "./client"
import type { PlatformSettings } from "@/actions/config-actions"

export default async function ConfigPage() {
  const supabase = createAdminClient()

  const { data: config } = await supabase
    .from('platform_settings')
    .select('*')
    .limit(1)
    .single()

  return <ConfigClient initialData={(config as PlatformSettings) || null} />
}
