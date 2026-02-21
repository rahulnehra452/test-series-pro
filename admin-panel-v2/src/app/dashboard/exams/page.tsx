import { createAdminClient } from "@/lib/supabase/admin"
import { ExamsClient } from "@/components/exams/client"
import type { Exam } from "@/components/exams/columns"

export default async function ExamsPage() {
  const supabase = createAdminClient()

  const { data: exams, error } = await supabase
    .from('exams')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return <div>Failed to load exams</div>
  }

  const formattedExams: Exam[] = (exams || []).map((e) => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    icon_url: e.icon_url,
    is_active: e.is_active ?? true,
  }))

  return (
    <div className="space-y-6">
      <ExamsClient data={formattedExams} />
    </div>
  )
}
