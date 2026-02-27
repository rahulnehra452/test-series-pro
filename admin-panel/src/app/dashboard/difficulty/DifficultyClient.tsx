"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, TrendingUp, TrendingDown, HelpCircle } from "lucide-react"
import { htmlToPlainText } from "@/lib/utils"

interface QuestionStat {
  id: string
  text: string
  test_title: string
  tags: string[]
  total_answered: number
  correct_count: number
  accuracy: number // -1 means unanswered
}

interface DifficultyClientProps {
  allQuestions: QuestionStat[]
  easiest: QuestionStat[]
  hardest: QuestionStat[]
  possiblyWrong: QuestionStat[]
}

function AccuracyBar({ accuracy }: { accuracy: number }) {
  const color = accuracy >= 80 ? 'bg-green-500' : accuracy >= 50 ? 'bg-yellow-500' : accuracy >= 20 ? 'bg-orange-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${accuracy}%` }} />
      </div>
      <span className="text-xs font-bold w-10 text-right">{accuracy}%</span>
    </div>
  )
}

function QuestionRow({ q }: { q: QuestionStat }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b last:border-0 dark:border-neutral-800">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium line-clamp-1">
          {htmlToPlainText(q.text) || "Untitled"}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{q.test_title}</span>
          {q.tags.slice(0, 3).map(t => (
            <Badge key={t} variant="secondary" className="text-[10px] py-0">#{t}</Badge>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <span className="text-xs text-muted-foreground">{q.total_answered} attempts</span>
        <AccuracyBar accuracy={q.accuracy} />
      </div>
    </div>
  )
}

export function DifficultyClient({ allQuestions, easiest, hardest, possiblyWrong }: DifficultyClientProps) {
  const answeredCount = allQuestions.filter(q => q.accuracy >= 0).length
  const unansweredCount = allQuestions.filter(q => q.accuracy < 0).length
  const avgAccuracy = answeredCount > 0
    ? Math.round(allQuestions.filter(q => q.accuracy >= 0).reduce((sum, q) => sum + q.accuracy, 0) / answeredCount)
    : 0

  return (
    <>
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white flex items-center gap-3">
          <TrendingDown className="w-8 h-8 text-purple-500" />
          Difficulty Analytics
        </h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          Identify hard questions, easy questions, and potentially incorrect answer keys.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-[#1C1C1E]">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{answeredCount}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1">Questions Attempted</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-[#1C1C1E]">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{avgAccuracy}%</p>
            <p className="text-xs text-muted-foreground font-medium mt-1">Avg. Accuracy</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-[#1C1C1E]">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-red-500">{possiblyWrong.length}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1">Possibly Wrong Keys</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-[#1C1C1E]">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-amber-500">{unansweredCount}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1">Never Attempted</p>
          </CardContent>
        </Card>
      </div>

      {/* Possibly Wrong Answer Keys — Critical */}
      {possiblyWrong.length > 0 && (
        <Card className="border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Possibly Incorrect Answer Keys
              <Badge className="bg-red-500 text-white text-xs">{possiblyWrong.length}</Badge>
            </CardTitle>
            <p className="text-sm text-red-600/80 dark:text-red-400/60">
              These questions have 0% accuracy with 3+ attempts — the answer key might be wrong.
            </p>
          </CardHeader>
          <CardContent>
            {possiblyWrong.map(q => <QuestionRow key={q.id} q={q} />)}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hardest Questions */}
        <Card className="bg-white dark:bg-[#1C1C1E]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="w-5 h-5 text-orange-500" />
              Hardest Questions
            </CardTitle>
            <p className="text-xs text-muted-foreground">Lowest accuracy scores</p>
          </CardHeader>
          <CardContent>
            {hardest.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No attempt data yet
              </div>
            ) : hardest.map(q => <QuestionRow key={q.id} q={q} />)}
          </CardContent>
        </Card>

        {/* Easiest Questions */}
        <Card className="bg-white dark:bg-[#1C1C1E]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Easiest Questions
            </CardTitle>
            <p className="text-xs text-muted-foreground">Highest accuracy scores</p>
          </CardHeader>
          <CardContent>
            {easiest.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No attempt data yet
              </div>
            ) : easiest.map(q => <QuestionRow key={q.id} q={q} />)}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
