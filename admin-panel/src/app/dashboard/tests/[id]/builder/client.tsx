"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, GripVertical, Clock, Trash, PlayCircle, Settings2, ShieldCheck, LayoutGrid, RotateCcw, X } from "lucide-react"
import { toast } from "sonner"
import { createTestSection, deleteTestSection, moveQuestionToSection } from "@/actions/section-actions"
import { htmlToPlainText } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

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
  negative_marks?: number
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
    if (!window.confirm("Delete this section? All questions inside will be moved to 'Unassigned'.")) return
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

  const [draggedQId, setDraggedQId] = useState<string | null>(null)
  const [dragOverSection, setDragOverSection] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, questionId: string) => {
    e.dataTransfer.setData("questionId", questionId)
    setDraggedQId(questionId)
    // Small delay to allow the drag ghost to generate before we potentially apply styles
    setTimeout(() => {
      // e.target.classList.add('opacity-50')
    }, 0)
  }

  const handleDragEnd = () => {
    setDraggedQId(null)
    setDragOverSection(null)
  }

  const handleDragOver = (e: React.DragEvent, sectionId: string | null) => {
    e.preventDefault() // Necessary to allow dropping
    if (dragOverSection !== sectionId) {
      setDragOverSection(sectionId)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverSection(null)
  }

  const handleDrop = async (e: React.DragEvent, sectionId: string | null) => {
    e.preventDefault()
    setDraggedQId(null)
    setDragOverSection(null)

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
      if (result.passed) {
        toast.success("All systems go! Test is ready.", {
          icon: '🚀'
        })
      } else {
        toast.error("Flight check failed. Review errors.", {
          icon: '⚠️'
        })
      }
    } catch {
      toast.error("Diagnostic failure.")
    }
    setIsChecking(false)
  }

  const unassignedQuestions = questions.filter(q => !q.section_id)

  return (
    <div className="flex flex-col h-full space-y-6 lg:flex-row lg:space-y-0 lg:space-x-8 items-start">

      {/* Left Column: Sections Builder */}
      <div className="w-full lg:w-2/3 flex flex-col space-y-6">

        {/* Pre-flight Checker Module */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800/50 p-5 rounded-2xl transition-all hover:shadow-md">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Settings2 className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-indigo-500" /> Pre-Flight Diagnostic
              </h3>
              <p className="text-sm text-indigo-700/80 dark:text-indigo-300 mt-1 font-medium">Verify structural integrity and readiness before publishing.</p>
            </div>
            <Button
              className={`rounded-xl font-bold shadow-sm transition-all ${checkResults && checkResults.every(c => c.passed) ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              onClick={runPreFlight}
              disabled={isChecking}
            >
              {isChecking ? <RotateCcw className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
              {isChecking ? 'Scanning...' : checkResults ? 'Run Again' : 'Run Diagnostics'}
            </Button>
          </div>

          {checkResults && (
            <div className="relative z-10 mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
              {checkResults.map((check, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${check.passed ? 'bg-white/60 dark:bg-black/20 border-green-200 dark:border-green-900/30' : 'bg-red-50/80 dark:bg-red-950/30 border-red-200 dark:border-red-900/50'}`}>
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${check.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {check.passed ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> : <X className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${check.passed ? 'text-[#1D1D1F] dark:text-white' : 'text-red-900 dark:text-red-200'}`}>{check.label}</h4>
                    <p className={`text-xs mt-0.5 ${check.passed ? 'text-muted-foreground' : 'text-red-700 dark:text-red-400 font-medium'}`}>{check.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Existing Sections */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <LayoutGrid className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-xl font-bold tracking-tight">Sections Sequence</h3>
          </div>

          {sections.map(section => {
            const sectionQuestions = questions.filter(q => q.section_id === section.id)
            const isDragOver = dragOverSection === section.id

            return (
              <div
                key={section.id}
                className={`flex flex-col bg-white dark:bg-[#1C1C1E] border ${isDragOver ? 'border-[#0066CC] ring-1 ring-[#0066CC]' : 'border-neutral-200 dark:border-neutral-800'} rounded-2xl shadow-sm transition-all overflow-hidden`}
                onDragOver={(e) => handleDragOver(e, section.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, section.id)}
              >
                {/* Section Header */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-neutral-100 dark:border-neutral-800/50 ${isDragOver ? 'bg-[#0066CC]/5' : 'bg-neutral-50/50 dark:bg-[#2C2C2E]/30'}`}>
                  <div className="flex items-center gap-3">
                    <div className="cursor-grab hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded transition-colors hidden sm:block">
                      <GripVertical className="h-5 w-5 text-neutral-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[#1D1D1F] dark:text-white">{section.name}</h4>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">{sectionQuestions.length} Questions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pl-8 sm:pl-0">
                    <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 px-2.5 py-1 rounded-lg">
                      <Clock className="w-3.5 h-3.5 mr-1.5" />
                      {section.duration_minutes} min
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30" onClick={() => handleDeleteSection(section.id)}>
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Section Drop Zone & Items */}
                <div className={`p-4 min-h-[120px] transition-colors duration-200 ${isDragOver ? 'bg-[#0066CC]/5' : ''}`}>
                  {sectionQuestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[100px] border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/20">
                      <p className="text-sm text-neutral-400 font-semibold mb-1">Empty Section</p>
                      <p className="text-xs text-neutral-400 font-medium">Drag and drop questions here</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {sectionQuestions.map((q, idx) => (
                        <div
                          key={q.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, q.id)}
                          onDragEnd={handleDragEnd}
                          className={`group flex items-center gap-3 bg-white dark:bg-[#2C2C2E] border dark:border-neutral-700 p-2.5 pl-2 rounded-xl shadow-sm cursor-grab hover:border-[#0066CC]/30 transition-all ${draggedQId === q.id ? 'opacity-40 scale-[0.98]' : ''}`}
                        >
                          <GripVertical className="w-4 h-4 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 transition-colors shrink-0" />
                          <div className="w-6 text-center text-xs font-bold text-neutral-400 shrink-0">
                            {idx + 1}.
                          </div>
                          <div className="flex-1 text-sm font-medium text-[#1D1D1F] dark:text-white line-clamp-1 truncate">
                            {htmlToPlainText(q.text) || "Untitled Question"}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-neutral-100 dark:border-neutral-800">
                            <span className="text-[11px] font-extrabold text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">+{q.marks}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Create New Section UI */}
          <div className="flex flex-col bg-neutral-50 dark:bg-transparent dark:border dark:border-dashed dark:border-neutral-800 p-5 rounded-2xl border border-dashed border-neutral-300 mt-6">
            <h4 className="text-sm font-bold mb-3 text-muted-foreground">Add New Section</h4>
            <div className="flex sm:items-center flex-col sm:flex-row gap-3">
              <Input
                placeholder="Section Title (e.g. Reasoning)"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                className="flex-1 rounded-xl bg-white dark:bg-[#1C1C1E] border-neutral-200 dark:border-neutral-800 h-11 font-medium"
              />
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Mins"
                  value={newSectionDuration}
                  onChange={(e) => setNewSectionDuration(e.target.value)}
                  className="w-full sm:w-28 pl-9 rounded-xl bg-white dark:bg-[#1C1C1E] border-neutral-200 dark:border-neutral-800 h-11 font-medium"
                />
              </div>
              <Button
                onClick={handleAddSection}
                disabled={isPending || !newSectionName}
                className="rounded-xl h-11 font-bold px-6 shrink-0"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Section
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Unassigned Drawer / Pallet */}
      <div
        className="w-full lg:w-1/3 flex flex-col h-auto lg:h-[calc(100vh-140px)] sticky top-24 bg-neutral-50 dark:bg-neutral-900/30 rounded-3xl border border-neutral-200 dark:border-neutral-800/50 overflow-hidden shadow-inner"
        onDragOver={(e) => handleDragOver(e, null)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, null)}
      >
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-[#1D1D1F]/50 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold flex items-center gap-2">
              Unassigned Pool
            </h3>
            <Badge className={`${unassignedQuestions.length > 0 ? 'bg-[#0066CC] hover:bg-[#0066CC]' : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 font-bold'}`}>
              {unassignedQuestions.length} Left
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-medium mt-1">Drag these directly into your sections.</p>
        </div>

        <div className={`flex-1 overflow-y-auto p-4 space-y-2 pb-24 transition-colors ${dragOverSection === null ? 'bg-[#0066CC]/5' : ''}`}>
          {unassignedQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center h-full py-20 px-4">
              <div className="w-16 h-16 bg-white dark:bg-[#2C2C2E] rounded-full flex items-center justify-center shadow-sm mb-4">
                <ShieldCheck className="w-8 h-8 text-green-500" />
              </div>
              <h4 className="text-base font-bold text-[#1D1D1F] dark:text-white mb-1">Queue Empty</h4>
              <p className="text-sm text-muted-foreground font-medium">All questions have been securely assigned to sections.</p>
            </div>
          ) : (
            unassignedQuestions.map((q, idx) => (
              <div
                key={q.id}
                draggable
                onDragStart={(e) => handleDragStart(e, q.id)}
                onDragEnd={handleDragEnd}
                className={`group bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-white/5 p-3.5 rounded-2xl shadow-sm cursor-grab hover:border-[#0066CC] hover:shadow-md transition-all active:scale-[0.98] ${draggedQId === q.id ? 'opacity-40' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 cursor-grab p-1 -ml-1 -mt-1 hidden sm:block">
                    <GripVertical className="w-4 h-4 text-neutral-300 dark:text-neutral-700 group-hover:text-neutral-400 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#1D1D1F] dark:text-white font-semibold leading-snug line-clamp-3">
                      {htmlToPlainText(q.text) || `Draft Question ${idx + 1}`}
                    </div>
                    <div className="flex items-center gap-2 mt-2.5">
                      <span className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">Q-ID: {q.id.split('-')[0]}</span>
                      <span className="text-[11px] font-extrabold text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded shrink-0">+{q.marks} M</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  )
}
