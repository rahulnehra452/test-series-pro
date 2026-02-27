import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { CalendarClient } from "./CalendarClient"

export default async function CalendarPage() {
  await requireAdminRole(["super_admin", "content_manager"])
  const supabase = createAdminClient()

  const { data: tests } = await supabase
    .from('tests')
    .select(`
      id,
      title,
      is_active,
      scheduled_for,
      duration_minutes,
      test_series (title)
    `)
    .order('scheduled_for', { ascending: true, nullsFirst: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const testData = (tests || []).map((t: any) => ({
    id: t.id,
    title: t.title,
    is_active: t.is_active ?? false,
    scheduled_for: t.scheduled_for,
    duration_minutes: t.duration_minutes,
    series_title: (Array.isArray(t.test_series) ? t.test_series[0]?.title : t.test_series?.title) || 'No Series',
  }))

  return (
    <div className="space-y-6">
      <CalendarClient tests={testData} />
    </div>
  )
}
