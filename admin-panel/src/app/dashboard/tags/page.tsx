import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { TagsClient } from "./TagsClient"

export default async function TagsPage() {
  await requireAdminRole(["super_admin", "content_manager"])
  const supabase = createAdminClient()

  const { data: questions } = await supabase
    .from('questions')
    .select('id, text, tags, test_id, tests(title)')
    .order('created_at', { ascending: false })

  // Collect all unique tags with counts
  const tagMap = new Map<string, number>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ; (questions || []).forEach((q: any) => {
      if (q.tags && Array.isArray(q.tags)) {
        q.tags.forEach((t: string) => {
          tagMap.set(t, (tagMap.get(t) || 0) + 1)
        })
      }
    })

  const tags = Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allQuestions = (questions || []).map((q: any) => ({
    id: q.id,
    text: q.text,
    tags: q.tags || [],
    test_id: q.test_id,
    test_title: (Array.isArray(q.tests) ? q.tests[0]?.title : q.tests?.title) || 'Unassigned',
  }))

  return (
    <div className="space-y-6">
      <TagsClient tags={tags} questions={allQuestions} />
    </div>
  )
}
