"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Plus, GripVertical, Clock, Trash, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { createTestSection, deleteTestSection, moveQuestionToSection } from "@/actions/section-actions"
import { htmlToPlainText } from "@/lib/utils"

interface Section {
  id: string
  name: string
  duration_minutes: number
  order_index: number
}

interface Question {
  id: string
  text: string
  section_id: string | null
  marks: number
}

interface TestData {
  id: string
  title: string
}

interface BuilderClientProps {
  test: TestData
  sections: Section[]
  questions: Question[]
}

export function BuilderClient({ test, sections, questions: initialQuestions }: BuilderClientProps) {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [isPending, startTransition] = useTransition()

  // Sync when server data changes
  useEffect(() => {
    setQuestions(initialQuestions)
  }, [initialQuestions])

  const [newSectionName, setNewSectionName] = useState("")
  const [newSectionDuration, setNewSectionDuration] = useState("")

  const handleAddSection = async () => {
    if (!newSectionName) return toast.error("Section name is required")

    startTransition(async () => {
      const res = await createTestSection(test.id, newSectionName, parseInt(newSectionDuration) || 0)
      if (res.error) toast.error(res.error)
      else {
        toast.success("Section created")
        setNewSectionName("")
        setNewSectionDuration("")
        router.refresh()
      }
    })
  }

  const handleDeleteSection = async (sectionId: string) => {
    if (!window.confirm("Are you sure? Questions will be moved to unassigned.")) return
    const previousQuestions = questions

    // Optimistically move questions to unassigned until server confirms.
    setQuestions((prev) =>
      prev.map((q) => (q.section_id === sectionId ? { ...q, section_id: null } : q))
    )

    startTransition(async () => {
      const res = await deleteTestSection(sectionId)
      if (res.error) {
        toast.error(res.error)
        setQuestions(previousQuestions)
      } else {
        toast.success("Section deleted")
        router.refresh()
      }
    })
  }

  const handleDragStart = (e: React.DragEvent, questionId: string) => {
    e.dataTransfer.setData("questionId", questionId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault() // Necessary to allow dropping
  }

  const handleDrop = async (e: React.DragEvent, sectionId: string | null) => {
    e.preventDefault()
    const questionId = e.dataTransfer.getData("questionId")
    if (!questionId) return
    const previousSectionId = questions.find((q) => q.id === questionId)?.section_id ?? null

    // Optimistic UI update
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, section_id: sectionId } : q))
    )

    startTransition(async () => {
      const res = await moveQuestionToSection(questionId, sectionId, test.id)
      if (res.error) {
        toast.error(res.error)
        // Revert only the moved question to avoid discarding other in-progress changes.
        setQuestions((prev) =>
          prev.map((q) => (q.id === questionId ? { ...q, section_id: previousSectionId } : q))
        )
      }
    })
  }

  const [checkResults, setCheckResults] = useState<{ label: string; passed: boolean; detail: string }[] | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const runPreFlight = async () => {
    setIsChecking(true)
    try {
      const { preFlightCheck } = await import('@/actions/test-actions')
      const result = await preFlightCheck(test.id)
      setCheckResults(result.checks)
      if (result.passed) toast.success("All checks passed! Test is ready to publish.")
      else toast.error("Some checks failed. Review the results below.")
    } catch {
      toast.error("Failed to run pre-flight check")
    }
    setIsChecking(false)
  }

  const unassignedQuestions = questions.filter(q => !q.section_id)

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 p-4 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Pre-Flight Checker
            </h3>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Run a diagnostic check to ensure {test.title} is ready for publishing.</p>
          </div>
          <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-100" onClick={runPreFlight} disabled={isChecking}>
            {isChecking ? 'Checking...' : 'Run Diagnostic'}
          </Button>
        </div>
        {checkResults && (
          <div className="mt-4 space-y-2">
            {checkResults.map((check, i) => (
              <div key={i} className={`flex items-center gap-3 p-2 rounded-lg text-sm ${check.passed ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'}`}>
                <span className="text-lg">{check.passed ? '✅' : '❌'}</span>
                <div>
                  <span className="font-semibold">{check.label}</span>
                  <span className="text-muted-foreground ml-2">— {check.detail}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">

          {/* Sections Column */}
          {sections.map(section => {
            const sectionQuestions = questions.filter(q => q.section_id === section.id)
            return (
              <Card
                key={section.id}
                className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1C1C1E]"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, section.id)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground opacity-50 cursor-grab" />
                    <CardTitle className="text-lg font-bold">{section.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mr-4">
                      <Clock className="w-4 h-4" />
                      {section.duration_minutes} min
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-500/10" onClick={() => handleDeleteSection(section.id)}>
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 min-h-[50px] p-2 bg-neutral-50 dark:bg-black/20 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800">
                    {sectionQuestions.length === 0 && (
                      <div className="text-center py-6 text-sm text-muted-foreground font-medium">
                        Drag questions here
                      </div>
                    )}
                    {sectionQuestions.map((q, idx) => (
                      <div
                        key={q.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, q.id)}
                        className="bg-white dark:bg-[#2C2C2E] border dark:border-neutral-800 p-3 rounded-lg shadow-sm flex items-center gap-3 cursor-grab hover:ring-2 hover:ring-blue-500/20 transition-all"
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground opacity-30" />
                        <div className="flex-1 text-sm font-medium line-clamp-1 truncate">
                          {htmlToPlainText(q.text) || `Question ${idx + 1}`}
                        </div>
                        <div className="text-xs font-bold px-2 py-1 bg-green-500/10 text-green-600 rounded">
                          +{q.marks}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {/* Add Section Block */}
          <Card className="border-dashed bg-transparent border-neutral-300 dark:border-neutral-800 shadow-none">
            <CardContent className="pt-6">
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-semibold px-1">Section Name</label>
                  <Input placeholder="e.g. General Aptitude" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} />
                </div>
                <div className="w-24 space-y-1">
                  <label className="text-xs font-semibold px-1">Duration</label>
                  <Input type="number" placeholder="Min" value={newSectionDuration} onChange={(e) => setNewSectionDuration(e.target.value)} />
                </div>
                <Button onClick={handleAddSection} disabled={isPending || !newSectionName}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column: Unassigned Questions */}
        <div className="lg:col-span-1 border-l dark:border-neutral-800 pl-6 space-y-4 max-h-[85vh] overflow-y-auto hide-scrollbar sticky top-0 py-2">
          <h3 className="font-bold flex items-center gap-2">
            Unassigned
            <span className="bg-neutral-200 dark:bg-neutral-800 text-xs px-2 py-1 rounded-full">{unassignedQuestions.length}</span>
          </h3>

          <div
            className="space-y-2 min-h-[100px] pb-20"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, null)}
          >
            {unassignedQuestions.length === 0 && (
              <div className="text-center py-10 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
                <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-xs text-muted-foreground">All questions assigned</p>
              </div>
            )}
            {unassignedQuestions.map((q, idx) => (
              <div
                key={q.id}
                draggable
                onDragStart={(e) => handleDragStart(e, q.id)}
                className="bg-white dark:bg-[#1C1C1E] border dark:border-white/5 p-3 rounded-lg shadow-sm cursor-grab hover:ring-2 hover:ring-blue-500/20 text-xs group"
              >
                <div className="line-clamp-2 text-muted-foreground group-hover:text-foreground font-medium transition-colors whitespace-pre-wrap">
                  {htmlToPlainText(q.text) || `Question ${idx + 1}`}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
