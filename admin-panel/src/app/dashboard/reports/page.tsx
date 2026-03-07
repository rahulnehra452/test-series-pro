import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { ReportsClient } from "./ReportsClient"

export default async function ReportsPage() {
  await requireAdminRole(["super_admin", "moderator"])
  const supabase = createAdminClient()

  const { data: reports } = await supabase
    .from('reported_questions')
    .select(`
      *,
      questions (
        id,
        text,
        options,
        correct_answer,
        explanation,
        marks,
        negative_marks,
        type,
        tags,
        test_id,
        tests ( title )
      )
    `)
    .order('created_at', { ascending: false })

  const { data: tests } = await supabase
    .from('tests')
    .select('id, title')
    .order('created_at', { ascending: false })

  const testsList = tests || []

  // Get reporter profiles separately (since join on auth.users isn't direct)
  const reportData = (reports || []).map(r => {
    let parsedOptions: string[] = []

    try {
      if (typeof r.questions?.options === 'string') {
        parsedOptions = JSON.parse(r.questions.options)
      } else if (Array.isArray(r.questions?.options)) {
        parsedOptions = r.questions.options as string[]
      }
    } catch {
      console.warn("Could not parse options JSON:", r.questions?.options);
    }

    const formattedOptions = parsedOptions.map((opt: string, idx: number) => ({
      text: opt,
      is_correct: idx === r.questions?.correct_answer
    }))

    const full_question = r.questions ? {
      id: r.questions.id,
      test_id: r.questions.test_id,
      question_text: r.questions.text,
      marks: r.questions.marks,
      negative_marks: r.questions.negative_marks || 0,
      explanation: r.questions.explanation || "",
      options: formattedOptions.length >= 2 ? formattedOptions : [
        { text: "Option A", is_correct: true },
        { text: "Option B", is_correct: false }
      ],
      tags: r.questions.tags || [],
      tests: r.questions.tests
    } : undefined;

    return {
      id: r.id,
      question_id: r.question_id,
      question_text: r.questions?.text || 'Deleted question',
      full_question,
      reason: r.reason,
      details: r.details,
      status: r.status || 'pending',
      admin_notes: r.admin_notes,
      created_at: r.created_at,
      resolved_at: r.resolved_at,
    }
  })

  const stats = {
    pending: reportData.filter(r => r.status === 'pending').length,
    reviewed: reportData.filter(r => r.status === 'reviewed').length,
    resolved: reportData.filter(r => r.status === 'resolved').length,
    dismissed: reportData.filter(r => r.status === 'dismissed').length,
    total: reportData.length,
  }

  return (
    <div className="space-y-6">
      <ReportsClient reports={reportData} stats={stats} tests={testsList} />
    </div>
  )
}
