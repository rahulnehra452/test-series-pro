import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { DifficultyClient } from "./DifficultyClient"

export default async function DifficultyPage() {
  await requireAdminRole(["super_admin"])
  const supabase = createAdminClient()

  // Fetch all completed attempts with answers
  const { data: attempts } = await supabase
    .from('attempts')
    .select('answers, test_id')
    .eq('status', 'Completed')
    .not('answers', 'is', null)

  // Fetch all questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id, text, test_id, correct_answer, options, tags, tests(title)')
    .order('created_at', { ascending: false })

  // Calculate accuracy per question
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questionStats = (questions || []).map((q: any) => {
    let totalAnswered = 0
    let correctCount = 0

      ; (attempts || []).forEach(a => {
        if (!a.answers || typeof a.answers !== 'object') return
        const answers = a.answers as Record<string, number>
        if (q.id in answers) {
          totalAnswered++
          if (answers[q.id] === q.correct_answer) correctCount++
        }
      })

    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : -1

    return {
      id: q.id,
      text: q.text,
      test_title: (Array.isArray(q.tests) ? q.tests[0]?.title : q.tests?.title) || 'Unassigned',
      tags: q.tags || [],
      total_answered: totalAnswered,
      correct_count: correctCount,
      accuracy,
    }
  })

  // Sort and categorize
  const answeredQuestions = questionStats.filter(q => q.accuracy >= 0)
  const easiest = [...answeredQuestions].sort((a, b) => b.accuracy - a.accuracy).slice(0, 10)
  const hardest = [...answeredQuestions].sort((a, b) => a.accuracy - b.accuracy).slice(0, 10)
  const possiblyWrong = answeredQuestions.filter(q => q.accuracy === 0 && q.total_answered >= 3)

  return (
    <div className="space-y-6">
      <DifficultyClient
        allQuestions={questionStats}
        easiest={easiest}
        hardest={hardest}
        possiblyWrong={possiblyWrong}
      />
    </div>
  )
}
