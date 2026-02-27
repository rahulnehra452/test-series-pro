import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { notFound } from "next/navigation"
import { BuilderClient } from "./client"

export default async function BuilderPage(props: { params: Promise<{ id: string }> }) {
  await requireAdminRole(["super_admin", "content_manager"])
  const params = await props.params;
  const testId = params.id
  const supabase = createAdminClient()

  const { data: testData, error: testError } = await supabase
    .from('tests')
    .select('*, test_series(title)')
    .eq('id', testId)
    .single()

  if (testError || !testData) {
    notFound()
  }

  const { data: sectionsData } = await supabase
    .from('test_sections')
    .select('*')
    .eq('test_id', testId)
    .order('order_index', { ascending: true })

  const { data: questionsData } = await supabase
    .from('questions')
    .select('*')
    .eq('test_id', testId)
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight">Visual Assembly</h2>
        <p className="text-sm text-muted-foreground font-medium">
          Organize questions into specific timed sections for <span className="text-[#0066CC]">{testData.title}</span>.
        </p>
      </div>
      <BuilderClient
        test={testData}
        sections={sectionsData || []}
        questions={questionsData || []}
      />
    </div>
  )
}
