'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Sparkles,
  Loader2,
  Check,
  Save,
  RefreshCcw,
  Wand2,
  CircleDot,
  AlertCircle,
} from 'lucide-react'
import { generateQuestionsWithAI, saveGeneratedQuestions } from '@/actions/ai-actions'
import { toast } from 'sonner'

interface GeneratedQuestion {
  text: string
  options: { text: string; is_correct: boolean }[]
  explanation: string
  difficulty: string
}

interface TestOption {
  id: string
  title: string
  series_id: string
  test_series: { title: string } | null
}

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  hard: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export function AIGeneratorClient({ exams, tests }: {
  exams: { id: string; title: string }[]
  tests: TestOption[]
}) {
  const [isPending, startTransition] = useTransition()

  // Form state
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [count, setCount] = useState(5)
  const [examContext, setExamContext] = useState('')
  const [language, setLanguage] = useState('english')
  const [targetTestId, setTargetTestId] = useState('')

  // Results
  const [generated, setGenerated] = useState<GeneratedQuestion[]>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [apiWarning, setApiWarning] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!topic.trim()) return toast.error('Enter a topic')

    setGenerating(true)
    setGenerated([])
    setSelectedIndices(new Set())
    setApiWarning(null)

    const res = await generateQuestionsWithAI({
      topic: topic.trim(),
      difficulty,
      count,
      examContext: examContext || 'General Knowledge',
      language,
    })

    if (res.error && res.questions.length === 0) {
      toast.error(res.error)
    } else {
      if (res.error) setApiWarning(res.error)
      setGenerated(res.questions)
      setSelectedIndices(new Set(res.questions.map((_, i) => i)))
      toast.success(`Generated ${res.questions.length} questions`)
    }
    setGenerating(false)
  }

  const toggleSelect = (index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleSave = () => {
    if (!targetTestId) return toast.error('Select a target test first')
    if (selectedIndices.size === 0) return toast.error('Select at least one question')

    const selectedQuestions = generated.filter((_, i) => selectedIndices.has(i))

    startTransition(async () => {
      const res = await saveGeneratedQuestions(targetTestId, selectedQuestions)
      if (res.error) toast.error(res.error)
      else {
        toast.success(`Saved ${res.count} questions to test!`)
        setGenerated([])
        setSelectedIndices(new Set())
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-gradient-to-br from-[#0066CC] to-[#5AC8FA] shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          AI Question Generator
        </h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          Generate exam questions instantly using AI. Review, edit, and save to any test.
        </p>
      </div>

      {apiWarning && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Configuration Note</p>
            <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">{apiWarning}</p>
          </div>
        </div>
      )}

      {/* Generator Form */}
      <Card className="rounded-2xl border border-black/5 dark:border-white/5">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#1D1D1F] dark:text-white flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-600" /> Configure Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Topic / Subject *</Label>
              <Input
                placeholder="e.g. Indian Constitution, Photosynthesis, Trigonometry…"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Exam Context</Label>
              <Select value={examContext} onValueChange={setExamContext}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select exam" /></SelectTrigger>
                <SelectContent>
                  {exams.map(e => <SelectItem key={e.id} value={e.title}>{e.title}</SelectItem>)}
                  <SelectItem value="General Knowledge">General Knowledge</SelectItem>
                  <SelectItem value="Custom">Custom / Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Number of Questions</Label>
              <Select value={String(count)} onValueChange={v => setCount(Number(v))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 5, 10, 15, 20].map(n => <SelectItem key={n} value={String(n)}>{n} questions</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="hindi">Hindi (हिंदी)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleGenerate}
              disabled={generating || !topic.trim()}
              className="gap-2 bg-[#0066CC] hover:bg-[#0052A3] text-white rounded-xl px-6"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? 'Generating…' : 'Generate Questions'}
            </Button>
            {generated.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating} className="gap-1 rounded-xl">
                <RefreshCcw className="h-3.5 w-3.5" /> Re-generate
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generated Questions */}
      {generated.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">
              Generated Questions ({selectedIndices.size}/{generated.length} selected)
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Save to Test:</Label>
                <Select value={targetTestId} onValueChange={setTargetTestId}>
                  <SelectTrigger className="w-[250px] rounded-xl h-8 text-xs"><SelectValue placeholder="Select test…" /></SelectTrigger>
                  <SelectContent>
                    {tests.map(t => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.title} {t.test_series ? `(${t.test_series.title})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSave}
                disabled={isPending || selectedIndices.size === 0 || !targetTestId}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save {selectedIndices.size} Questions
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {generated.map((q, i) => (
              <Card
                key={i}
                className={`rounded-2xl border transition-all cursor-pointer ${selectedIndices.has(i)
                  ? 'border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/20'
                  : 'border-black/5 dark:border-white/5 opacity-60'
                  }`}
                onClick={() => toggleSelect(i)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Selection indicator */}
                    <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedIndices.has(i)
                      ? 'border-purple-600 bg-purple-600'
                      : 'border-gray-300 dark:border-gray-600'
                      }`}>
                      {selectedIndices.has(i) && <Check className="h-3 w-3 text-white" />}
                    </div>

                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Question header */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[#1D1D1F] dark:text-white leading-relaxed">
                          Q{i + 1}. {q.text}
                        </p>
                        <Badge variant="secondary" className={`shrink-0 text-[10px] font-bold uppercase ${difficultyColors[q.difficulty] || ''}`}>
                          {q.difficulty}
                        </Badge>
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oi) => (
                          <div
                            key={oi}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${opt.is_correct
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 ring-1 ring-green-300 dark:ring-green-700'
                              : 'bg-secondary/30 text-muted-foreground'
                              }`}
                          >
                            <CircleDot className={`h-3 w-3 shrink-0 ${opt.is_correct ? 'text-green-600' : 'text-gray-400'}`} />
                            <span className="font-bold mr-1">{String.fromCharCode(65 + oi)}.</span>
                            {opt.text}
                          </div>
                        ))}
                      </div>

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="mt-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                          <p className="text-[11px] text-blue-800 dark:text-blue-400 font-medium">
                            <span className="font-bold">Explanation:</span> {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {generated.length === 0 && !generating && (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-3xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 mb-4">
            <Sparkles className="h-7 w-7 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">Ready to Generate</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Enter a topic, select difficulty, and click Generate. AI will create exam-quality MCQs in seconds.
          </p>
        </div>
      )}

      {/* Generating animation */}
      {generating && (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-3xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 mb-4 animate-pulse">
            <Sparkles className="h-7 w-7 text-purple-600 dark:text-purple-400 animate-spin" />
          </div>
          <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">Generating Questions…</h3>
          <p className="text-sm text-muted-foreground mt-1">AI is crafting {count} questions about &quot;{topic}&quot;</p>
        </div>
      )}
    </div>
  )
}
