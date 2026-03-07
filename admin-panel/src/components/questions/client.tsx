"use client"

import { Question } from "./columns"
import { QuestionDialog } from "./question-dialog"
import { BulkUploadDialog } from "./bulk-upload-dialog"
import { useMemo, useState, useTransition, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ArrowRight, Tag, Trash2, X, Search, Filter, ChevronLeft, ChevronRight, FileQuestion, Edit3, LayoutList, AlignJustify, CheckCircle2, AlertCircle, TerminalSquare, Eye, Type } from "lucide-react"
import { bulkMoveQuestions, bulkDeleteQuestions, updateQuestion } from "@/actions/question-actions"
import { bulkAssignTags } from "@/actions/tag-actions"
import { toast } from "sonner"
import { htmlToPlainText } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface QuestionsClientProps {
  data: Question[]
  tests: { id: string; title: string }[]
}

type LayoutDensity = 'cozy' | 'compact' | 'table'

// Helper to determine question health/status
function getQuestionStatus(q: Question) {
  if (!q.explanation || q.explanation.length < 5) return { label: 'Needs Review', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', icon: AlertCircle }
  if (q.options.length < 4) return { label: 'Incomplete', color: 'text-red-600 bg-red-50 dark:bg-red-900/20', icon: X }
  return { label: 'Verified', color: 'text-green-600 bg-green-50 dark:bg-green-900/20', icon: CheckCircle2 }
}

export function QuestionsClient({ data, tests }: QuestionsClientProps) {
  const router = useRouter()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTest, setFilterTest] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)

  // Advanced Features State
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null)
  const [layoutDensity, setLayoutDensity] = useState<LayoutDensity>('cozy')
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null)
  const [inlineMarks, setInlineMarks] = useState<string>("1")

  const ITEMS_PER_PAGE = layoutDensity === 'compact' ? 50 : 25

  const [bulkAction, setBulkAction] = useState<string | null>(null)
  const [bulkTargetTest, setBulkTargetTest] = useState("")
  const [bulkTagInput, setBulkTagInput] = useState("")
  const [isPending, startTransition] = useTransition()

  // Keyboard Shortcuts (Feature 2)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + / for focus search
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      // Esc to clear preview
      if (e.key === 'Escape') {
        setPreviewQuestion(null)
        setInlineEditingId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Syntax Search (Feature 3)
  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    // Parse syntax queries like "marks:>2" or "test:ras"
    const isSyntaxQuery = query.includes(':')
    let textQuery = query
    let marksFilter = 0
    let testFilterStr = ''
    let statusFilter = ''

    if (isSyntaxQuery) {
      const parts = query.split(' ')
      const nonSyntax = []
      for (const part of parts) {
        if (part.startsWith('marks:>')) {
          marksFilter = parseInt(part.replace('marks:>', ''), 10) || 0
        } else if (part.startsWith('test:')) {
          testFilterStr = part.replace('test:', '').toLowerCase()
        } else if (part.startsWith('status:')) {
          statusFilter = part.replace('status:', '').toLowerCase()
        } else {
          nonSyntax.push(part)
        }
      }
      textQuery = nonSyntax.join(' ')
    }

    return data.filter((row) => {
      const text = htmlToPlainText(row.question_text).toLowerCase()
      const testTitle = row.tests?.title?.toLowerCase() || ""
      const id = row.id.toLowerCase()
      const status = getQuestionStatus(row).label.toLowerCase().replace(/\s+/g, '_')

      // Text matching
      const matchesSearch = !textQuery || text.includes(textQuery) || testTitle.includes(textQuery) || id.includes(textQuery)

      // Syntax matching
      const matchesSyntaxMarks = isSyntaxQuery ? row.marks > marksFilter : true
      const matchesSyntaxTest = isSyntaxQuery && testFilterStr ? testTitle.includes(testFilterStr) : true
      const matchesSyntaxStatus = isSyntaxQuery && statusFilter ? status.includes(statusFilter) : true

      // Standard dropdown filter
      const matchesDropdownTest = filterTest === "all" || row.test_id === filterTest

      return matchesSearch && matchesDropdownTest && matchesSyntaxMarks && matchesSyntaxTest && matchesSyntaxStatus
    })
  }, [data, searchQuery, filterTest])

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedData = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE
    return filteredData.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredData, safeCurrentPage, ITEMS_PER_PAGE])

  const validIdSet = useMemo(() => new Set(data.map((q) => q.id)), [data])
  const activeSelectedIds = useMemo(
    () => Array.from(selectedIds).filter((id) => validIdSet.has(id)),
    [selectedIds, validIdSet]
  )
  const activeSelectedSet = useMemo(() => new Set(activeSelectedIds), [activeSelectedIds])
  const selectedCount = activeSelectedIds.length
  const isAllPageSelected = paginatedData.length > 0 && paginatedData.every((q) => activeSelectedSet.has(q.id))

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllPage = () => {
    if (paginatedData.length === 0) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (isAllPageSelected) {
        paginatedData.forEach((q) => next.delete(q.id))
      } else {
        paginatedData.forEach((q) => next.add(q.id))
      }
      return next
    })
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setBulkAction(null)
  }

  const handleBulkMove = () => { /* unchanged logic */
    if (!bulkTargetTest) return toast.error("Select a target test")
    const ids = activeSelectedIds
    if (ids.length === 0) return toast.error("Select at least one question")
    startTransition(async () => {
      const res = await bulkMoveQuestions(ids, bulkTargetTest)
      if (res.error) toast.error(res.error)
      else {
        toast.success(`Moved ${res.count} question(s)`)
        router.refresh()
        clearSelection()
      }
    })
  }

  const handleBulkDelete = () => { /* unchanged logic */
    if (!window.confirm(`Delete ${selectedCount} question(s)? This cannot be undone.`)) return
    const ids = activeSelectedIds
    if (ids.length === 0) return toast.error("Select at least one question")
    startTransition(async () => {
      const res = await bulkDeleteQuestions(ids)
      if (res.error) toast.error(res.error)
      else {
        toast.success(`Deleted ${res.count} question(s)`)
        router.refresh()
        clearSelection()
        setPreviewQuestion(null)
      }
    })
  }

  const handleBulkTag = () => { /* unchanged logic */
    const tags = bulkTagInput.split(',').map(t => t.trim()).filter(Boolean)
    if (tags.length === 0) return toast.error("Enter at least one tag")
    const ids = activeSelectedIds
    if (ids.length === 0) return toast.error("Select at least one question")
    startTransition(async () => {
      const res = await bulkAssignTags(ids, tags)
      if (res.error) toast.error(res.error)
      else {
        toast.success(`Tags assigned to ${ids.length} question(s)`)
        router.refresh()
        clearSelection()
        setBulkTagInput("")
      }
    })
  }

  // Feature 4: Inline Quick Edit
  const saveInlineEdit = async (question: Question) => {
    const updatedMarks = parseFloat(inlineMarks)
    if (isNaN(updatedMarks) || updatedMarks < 0) return toast.error("Invalid marks")

    const original = data.find(q => q.id === question.id)
    if (!original) return

    setInlineEditingId(null)

    // Form data emulation for saving
    const formData = {
      test_id: original.test_id,
      question_text: original.question_text,
      marks: updatedMarks,
      negative_marks: original.negative_marks,
      explanation: original.explanation || "",
      options: original.options
    }

    const loadToast = toast.loading("Saving changes...")
    const res = await updateQuestion(question.id, formData)
    if (res?.error) {
      toast.error(res.error, { id: loadToast })
    } else {
      toast.success("Marks updated", { id: loadToast })
      router.refresh()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] space-y-4">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white flex items-center gap-2">
            Question Bank <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-bold ml-2">PRO</Badge>
          </h2>
          <p className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-2">
            <TerminalSquare className="w-3.5 h-3.5" /> Try typing <code className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded textxs">status:needs_review</code> in search.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 shadow-sm rounded-xl p-1 flex items-center mr-2">
            <button onClick={() => setLayoutDensity('cozy')} className={`p-1.5 rounded-lg transition-colors ${layoutDensity === 'cozy' ? 'bg-[#0066CC]/10 text-[#0066CC]' : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'}`} title="Cozy View"><LayoutList className="w-4 h-4" /></button>
            <button onClick={() => setLayoutDensity('compact')} className={`p-1.5 rounded-lg transition-colors ${layoutDensity === 'compact' ? 'bg-[#0066CC]/10 text-[#0066CC]' : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'}`} title="Compact View"><AlignJustify className="w-4 h-4" /></button>
          </div>
          <BulkUploadDialog tests={tests} onSuccess={() => router.refresh()} />
          <QuestionDialog tests={tests} />
        </div>
      </div>

      {/* Omnibar Advanced Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-[#1C1C1E] p-2 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm shrink-0">
        <div className="relative flex-1 w-full flex items-center">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search questions or use syntax (marks:>2)..."
            className="pl-9 bg-transparent border-none shadow-none h-11 focus-visible:ring-0 font-medium w-full"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 opacity-50">
            <kbd className="bg-neutral-100 dark:bg-neutral-800 border dark:border-neutral-700 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono">/</kbd>
          </div>
        </div>
        <div className="w-px h-6 bg-black/10 dark:bg-white/10 hidden sm:block" />
        <div className="flex items-center gap-2 w-full sm:w-auto px-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
          <Select value={filterTest} onValueChange={(val) => { setFilterTest(val); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-[180px] border-none shadow-none h-11 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors font-medium">
              <SelectValue placeholder="Filter by Test" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Tests</SelectItem>
              {tests.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {editingQuestion && (
        <QuestionDialog
          tests={tests}
          initialData={editingQuestion}
          open={!!editingQuestion}
          onOpenChange={(open) => { if (!open) setEditingQuestion(null) }}
          trigger={<span className="hidden" />}
        />
      )}

      {/* Master-Detail Split Layout */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden relative">

        {/* Left Column: Master List */}
        <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out ${previewQuestion ? 'hidden md:flex md:w-1/2 lg:w-3/5 border-r border-black/5 dark:border-white/5 pr-4' : 'w-full'}`}>
          <div className="flex items-center justify-between px-2 pb-2 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={selectAllPage}
                className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isAllPageSelected ? 'bg-[#0066CC] border-[#0066CC] text-white' : 'border-neutral-300 dark:border-neutral-700 hover:border-[#0066CC]'}`}
              >
                {isAllPageSelected && <CheckCircle2 className="w-4 h-4" />}
              </button>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Select All ({paginatedData.length})
              </span>
            </div>
            <div className="text-xs font-semibold text-muted-foreground">
              {filteredData.length === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredData.length)} of {filteredData.length}
            </div>
          </div>

          <ScrollArea className="flex-1 h-full pr-2">
            <div className={`space-y-${layoutDensity === 'compact' ? '1' : '2'} pb-24`}>
              {paginatedData.length === 0 && (
                <div className="text-sm font-medium text-muted-foreground border border-dashed border-black/10 dark:border-white/10 rounded-2xl py-12 flex flex-col items-center justify-center bg-white/50 dark:bg-[#1C1C1E]/50">
                  <FileQuestion className="h-8 w-8 text-neutral-300 mb-3" />
                  No results. Try clearing filters.
                </div>
              )}

              {paginatedData.map((row) => {
                const isSelected = activeSelectedSet.has(row.id)
                const isPreviewed = previewQuestion?.id === row.id
                const status = getQuestionStatus(row)

                return (
                  <div
                    key={row.id}
                    className={`group flex items-start sm:items-center gap-3 p-${layoutDensity === 'compact' ? '2.5' : '4'} rounded-2xl border transition-all cursor-pointer ${isPreviewed ? 'bg-[#0066CC]/5 border-[#0066CC] ring-1 ring-[#0066CC] shadow-sm' : isSelected
                      ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,1)]'
                      : 'bg-white dark:bg-[#2C2C2E] border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20 hover:shadow-sm'
                      }`}
                    onClick={() => {
                      if (!isPreviewed) setPreviewQuestion(row)
                    }}
                  >
                    <div className="mt-1 sm:mt-0 shrink-0" onClick={(e) => { e.stopPropagation(); toggleSelect(row.id); }}>
                      <button
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white dark:bg-black border-neutral-300 dark:border-neutral-600 group-hover:border-blue-500'}`}
                      >
                        {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                      </button>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold text-[#1D1D1F] dark:text-white line-clamp-${layoutDensity === 'compact' ? '1' : '2'} ${layoutDensity === 'compact' ? 'text-xs' : 'text-sm'} leading-relaxed`}>
                          {htmlToPlainText(row.question_text) || "Untitled Question"}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className={`inline-flex items-center font-bold text-muted-foreground bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-md ${layoutDensity === 'compact' ? 'text-[9px]' : 'text-[10px]'}`}>
                            {row.tests?.title || 'Unassigned'}
                          </span>

                          {/* Feature 6: QA Status Badge */}
                          <div className={`flex items-center gap-1 font-bold px-1.5 py-0.5 rounded text-[10px] ${status.color}`}>
                            <status.icon className="w-3 h-3" />
                            {status.label}
                          </div>

                          <div className="flex items-center gap-1.5 border-l border-black/10 dark:border-white/10 pl-2">
                            {/* Feature 4: Inline Quick Edit Marks */}
                            {inlineEditingId === row.id ? (
                              <div className="flex items-center" onClick={e => e.stopPropagation()}>
                                <input
                                  autoFocus
                                  type="number"
                                  title="Edit Marks"
                                  aria-label="Edit Marks"
                                  placeholder="0"
                                  value={inlineMarks}
                                  onChange={e => setInlineMarks(e.target.value)}
                                  onBlur={() => saveInlineEdit(row)}
                                  onKeyDown={e => e.key === 'Enter' && saveInlineEdit(row)}
                                  className="w-12 h-5 text-xs font-bold px-1 bg-white dark:bg-black rounded border border-blue-500 focus:outline-none"
                                />
                              </div>
                            ) : (
                              <span
                                className={`text-green-600 font-extrabold bg-green-500/10 px-1.5 rounded cursor-text hover:bg-green-500/20 transition-colors ${layoutDensity === 'compact' ? 'text-[10px]' : 'text-[11px]'}`}
                                onDoubleClick={(e) => { e.stopPropagation(); setInlineMarks(row.marks.toString()); setInlineEditingId(row.id); }}
                                title="Double click to edit marks"
                              >
                                +{row.marks} M
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#1D1D1F] dark:hover:text-white shrink-0"
                          onClick={(e) => { e.stopPropagation(); setEditingQuestion(row); }}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white dark:bg-[#1C1C1E] p-2 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="rounded-xl font-bold"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                  </Button>
                  <div className="flex gap-1">
                    <span className="text-xs font-bold text-muted-foreground flex items-center">{safeCurrentPage} / {totalPages}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={safeCurrentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="rounded-xl font-bold"
                  >
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Column: "Detail View" Preview Pane */}
        {previewQuestion && (
          <div className="flex-1 min-w-[320px] bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-2xl shadow-sm flex flex-col animate-in fade-in slide-in-from-right-4 duration-300 overflow-hidden relative">
            <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5 shrink-0 bg-neutral-50/50 dark:bg-black/20">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-sm tracking-tight">Question Preview</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingQuestion(previewQuestion)} className="h-8 text-xs font-bold rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                  <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Full Edit
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setPreviewQuestion(null)} className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-5 lg:p-6">
              <div className="space-y-6">

                {/* Status Dashboard */}
                {(() => {
                  const status = getQuestionStatus(previewQuestion)
                  return (
                    <div className={`p-3 rounded-xl border flex items-center justify-between ${status.label === 'Verified' ? 'bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-800/30' : 'bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800/30'}`}>
                      <div className="flex items-center gap-3">
                        <status.icon className={`w-6 h-6 ${status.color.split(' ')[0]}`} />
                        <div>
                          <p className={`text-xs font-bold ${status.color.split(' ')[0]}`}>System Status: {status.label}</p>
                          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">This indicates the structural health of the content.</p>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                <div>
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <Type className="w-3.5 h-3.5" /> Question Text
                  </h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-[#1D1D1F] dark:text-neutral-200 font-medium leading-relaxed whitespace-pre-wrap bg-black/5 dark:bg-white/5 p-4 rounded-2xl">
                    {htmlToPlainText(previewQuestion.question_text)}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <LayoutList className="w-3.5 h-3.5" /> Options
                  </h4>
                  <div className="space-y-2">
                    {previewQuestion.options.map((opt, i) => (
                      <div key={i} className={`flex gap-3 p-3 rounded-xl border ${opt.is_correct ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-white dark:bg-transparent border-black/5 dark:border-white/10'}`}>
                        <div className={`w-6 h-6 shrink-0 rounded flex items-center justify-center text-xs font-bold ${opt.is_correct ? 'bg-green-500 text-white' : 'bg-black/5 dark:bg-white/10 text-muted-foreground'}`}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <div className={`text-sm font-medium pt-0.5 ${opt.is_correct ? 'text-green-900 dark:text-green-300 font-bold' : 'text-[#1D1D1F] dark:text-neutral-300'}`}>
                          {opt.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {previewQuestion.explanation && (
                  <div>
                    <h4 className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <FileQuestion className="w-3.5 h-3.5" /> Explanation
                    </h4>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-[#1D1D1F] dark:text-neutral-300 font-medium leading-relaxed whitespace-pre-wrap bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl">
                      {htmlToPlainText(previewQuestion.explanation)}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="flex flex-col gap-2 bg-white/90 dark:bg-[#2C2C2E]/90 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-2xl rounded-2xl p-2 min-w-[320px]">
            {/* Top Row: Actions */}
            <div className="flex items-center gap-2">
              <Badge className="bg-[#0066CC] text-white rounded-lg px-3 py-1 font-bold text-xs h-9 flex items-center shrink-0">
                {selectedCount} Selected
              </Badge>
              <div className="w-px h-5 bg-black/10 dark:bg-white/10 shrink-0" />
              <Button variant="ghost" size="sm" className="h-9 rounded-lg font-bold text-xs hover:bg-black/5 dark:hover:bg-white/5 flex-1" onClick={() => { setBulkAction(bulkAction === 'move' ? null : 'move'); setBulkTagInput(''); }}>
                <ArrowRight className="w-3.5 h-3.5 mr-1.5" /> Move
              </Button>
              <Button variant="ghost" size="sm" className="h-9 rounded-lg font-bold text-xs hover:bg-black/5 dark:hover:bg-white/5 flex-1" onClick={() => { setBulkAction(bulkAction === 'tag' ? null : 'tag'); setBulkTargetTest(''); }}>
                <Tag className="w-3.5 h-3.5 mr-1.5" /> Tag
              </Button>
              <Button variant="ghost" size="sm" className="h-9 rounded-lg font-bold text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex-1" onClick={handleBulkDelete} disabled={isPending}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 shrink-0" onClick={clearSelection}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Expansion Panels */}
            {bulkAction === 'move' && (
              <div className="flex items-center gap-2 p-1 pt-0 animate-in fade-in zoom-in-95 duration-200">
                <Select value={bulkTargetTest} onValueChange={setBulkTargetTest}>
                  <SelectTrigger className="flex-1 h-9 bg-black/5 dark:bg-white/5 border-none rounded-lg font-medium text-xs">
                    <SelectValue placeholder="Select destination..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {tests.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.title}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleBulkMove} disabled={isPending || !bulkTargetTest} className="h-9 rounded-lg bg-[#1D1D1F] dark:bg-white text-white dark:text-black font-bold text-xs px-4">
                  {isPending ? 'Moving...' : 'Move'}
                </Button>
              </div>
            )}

            {bulkAction === 'tag' && (
              <div className="flex items-center gap-2 p-1 pt-0 animate-in fade-in zoom-in-95 duration-200">
                <Input
                  placeholder="history, polity..."
                  value={bulkTagInput}
                  onChange={(e) => setBulkTagInput(e.target.value)}
                  className="flex-1 h-9 bg-black/5 dark:bg-white/5 border-none rounded-lg text-xs font-medium"
                  onKeyDown={e => e.key === 'Enter' && handleBulkTag()}
                />
                <Button size="sm" onClick={handleBulkTag} disabled={isPending || !bulkTagInput} className="h-9 rounded-lg bg-[#1D1D1F] dark:bg-white text-white dark:text-black font-bold text-xs px-4">
                  {isPending ? 'Saving...' : 'Assign'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
