import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { SeriesClient } from "@/components/test-series/client"

export default async function TestSeriesPage() {
  await requireAdminRole(["super_admin", "content_manager"])
  const supabase = createAdminClient()

  const { data: series, error } = await supabase
    .from('test_series')
    .select(`
      *,
      exams (
        id,
        title
      )
    `)
    .order('created_at', { ascending: false })

  const { data: examsData } = await supabase
    .from('exams')
    .select('id, title')
    .eq('is_active', true)
    .order('title')

  const exams = examsData || []

  if (error) {
    console.error(error)
    return <div>Failed to load test series</div>
  }

  const data = (series || []).map((s) => ({
    ...s,
  }))

  return (
    <div className="space-y-6">
      <SeriesClient data={data} exams={exams} />
    </div>
  )
}
