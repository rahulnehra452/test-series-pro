import { createAdminClient } from "@/lib/supabase/admin"
import { BulkQuestionsClient } from "@/components/questions/bulk-questions-client"
import { Suspense } from "react"
import { Loader2 } from "lucide-react"

export default async function BulkQuestionsPage() {
  const supabase = createAdminClient()

  // Fetch reference data for filters
  const [
    { data: exams },
    { data: series },
    { data: tests },
    { data: sections },
  ] = await Promise.all([
    supabase.from('exams').select('id, title').eq('is_active', true).order('title'),
    supabase.from('test_series').select('id, title, exam_id').eq('is_active', true).order('title'),
    supabase.from('tests').select('id, title, series_id').order('title'),
    supabase.from('test_sections').select('id, name, test_id').order('order_index'),
  ])

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <BulkQuestionsClient
        exams={exams || []}
        series={series || []}
        tests={tests || []}
        sections={sections || []}
      />
    </Suspense>
  )
}
