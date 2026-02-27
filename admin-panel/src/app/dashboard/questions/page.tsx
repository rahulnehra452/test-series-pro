import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { QuestionsClient } from "@/components/questions/client"
import { parseQuestionOptions } from "@/lib/question-options"

export default async function QuestionsPage() {
  await requireAdminRole(["super_admin", "content_manager"])
  const supabase = createAdminClient()

  const { data: questions, error } = await supabase
    .from('questions')
    .select(`
      *,
      tests (
        id,
        title
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: testsListData } = await supabase
    .from('tests')
    .select('id, title')
    .eq('is_active', true)
    .order('title')

  const testsList = testsListData || []

  if (error) {
    console.error(error)
    return <div>Failed to load questions</div>
  }

  // Transform DB schema to form values shape
  const data = (questions || []).map((q) => {
    const options = parseQuestionOptions(q.options)

    const formOptions = options.map((optText: string, idx: number) => ({
      text: optText,
      is_correct: idx === q.correct_answer,
    }))

    return {
      id: q.id,
      test_id: q.test_id,
      question_text: q.text,
      marks: q.marks,
      negative_marks: q.negative_marks,
      explanation: q.explanation,
      options: formOptions,
      tests: q.tests,
    }
  })

  return (
    <div className="space-y-6">
      <QuestionsClient data={data} tests={testsList} />
    </div>
  )
}
