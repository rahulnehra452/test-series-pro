import { createClient } from "@/lib/supabase/server"
import { TestsClient } from "@/components/tests/client"

export default async function TestsPage() {
  const supabase = await createClient()

  const { data: tests, error } = await supabase
    .from('tests')
    .select(`
      *,
      test_series (
        id,
        title
      )
    `)
    .order('created_at', { ascending: false })

  const { data: seriesListData } = await supabase
    .from('test_series')
    .select('id, title')
    .eq('is_active', true)
    .order('title')

  const seriesList = seriesListData || []

  if (error) {
    console.error(error)
    return <div>Failed to load tests</div>
  }

  // Pass plain serializable data to client component
  const data = (tests || []).map((t) => ({
    id: t.id,
    title: t.title,
    series_id: t.series_id,
    description: t.description,
    duration_minutes: t.duration_minutes,
    total_marks: t.total_marks,
    pass_marks: t.pass_marks,
    is_active: t.is_active,
    test_series: t.test_series,
  }))

  return (
    <div className="space-y-6">
      <TestsClient data={data} seriesList={seriesList} />
    </div>
  )
}
