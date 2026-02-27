import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { AIGeneratorClient } from "./AIGeneratorClient"

export default async function AIGeneratorPage() {
  await requireAdminRole(["super_admin", "content_manager"])
  const supabase = createAdminClient()

  const [
    { data: exams },
    { data: tests },
  ] = await Promise.all([
    supabase.from('exams').select('id, title').order('title'),
    supabase.from('tests').select('id, title, series_id, test_series(title)').order('title'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formattedTests = (tests || []).map((t: any) => ({
    id: t.id as string,
    title: t.title as string,
    series_id: t.series_id as string,
    test_series: Array.isArray(t.test_series) ? t.test_series[0] || null : t.test_series || null,
  }))

  return (
    <AIGeneratorClient
      exams={exams || []}
      tests={formattedTests}
    />
  )
}
