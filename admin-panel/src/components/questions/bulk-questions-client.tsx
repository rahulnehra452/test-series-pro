'use client'

import React, { useState, useEffect, useCallback, useTransition, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Trash2,
  Copy,
  ArrowRightLeft,
  Tag,
  Download,
  Upload,
  Search,
  Filter,
  X,
  Loader2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  GripVertical,
  AlertTriangle,
  FileSpreadsheet,
  Pencil,
  Check,
  Layers,
  Hash,
  BarChart3,
  CheckCircle2,
  ScanSearch,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  fetchBulkQuestions,
  bulkDeleteQuestions,
  bulkUpdateDifficulty,
  bulkDuplicateQuestions,
  bulkMoveToTest,
  inlineUpdateQuestion,
  bulkMoveToSection,
  bulkReorderQuestions,
  findDuplicateQuestions,
} from '@/actions/bulk-question-actions'
import { bulkAssignTags } from '@/actions/tag-actions'
import { bulkCreateQuestions } from '@/actions/question-actions'
import { toast } from 'sonner'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Exam { id: string; title: string }
interface Series { id: string; title: string; exam_id: string }
interface Test { id: string; title: string; series_id: string }
interface Section { id: string; name: string; test_id: string }

interface QuestionRow {
  id: string
  text: string
  options?: unknown[] | null
  explanation?: string | null
  correct_answer: number
  marks: number
  negative_marks: number
  difficulty: string | null
  test_id: string
  tests?: {
    id: string
    title: string
    test_series?: {
      id: string
      title: string
      exams?: { id: string; title: string }
    }
  } | null
}

type SortField = 'text' | 'marks' | 'difficulty' | 'correct_answer'
type SortDir = 'asc' | 'desc'

interface DuplicateGroup {
  text: string
  count: number
  ids: string[]
  tests: string[]
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function BulkQuestionsClient({
  exams,
  series,
  tests,
  sections,
}: {
  exams: Exam[]
  series: Series[]
  tests: Test[]
  sections: Section[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Filters
  const [filterExam, setFilterExam] = useState(searchParams.get('exam') || '')
  const [filterSeries, setFilterSeries] = useState(searchParams.get('series') || '')
  const [filterTest, setFilterTest] = useState(searchParams.get('test') || '')
  const [filterDifficulty, setFilterDifficulty] = useState(searchParams.get('diff') || '')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [showFilters, setShowFilters] = useState(false)

  // Data
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Sorting
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Inline editing
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const editInputRef = useRef<HTMLInputElement>(null)

  // CSV Import dialog
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importTestId, setImportTestId] = useState('')
  const [csvText, setCsvText] = useState('')
  const [importLoading, setImportLoading] = useState(false)

  // Bulk tags
  const [showTagInput, setShowTagInput] = useState(false)
  const [bulkTagValue, setBulkTagValue] = useState('')

  // Duplicate detection
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
  const [dupLoading, setDupLoading] = useState(false)
  const [dupScanned, setDupScanned] = useState(0)

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Custom expansion
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const [expandedEditId, setExpandedEditId] = useState<string | null>(null)
  const [expandedForm, setExpandedForm] = useState<{
    text: string
    explanation: string
    correct_answer: number
    options: string[]
  } | null>(null)

  // Advanced features
  const [showFindReplace, setShowFindReplace] = useState(false)
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [showBatchMarks, setShowBatchMarks] = useState(false)
  const [batchMarksValue, setBatchMarksValue] = useState('')
  const [batchNegMarksValue, setBatchNegMarksValue] = useState('')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showStats, setShowStats] = useState(true)

  // Filtered cascading dropdowns
  const filteredSeries = filterExam ? series.filter(s => s.exam_id === filterExam) : series
  const filteredTests = filterSeries ? tests.filter(t => t.series_id === filterSeries) : tests
  const filteredSections = filterTest ? sections.filter(s => s.test_id === filterTest) : []

  // Load questions
  const loadQuestions = useCallback(async () => {
    setLoading(true)
    const result = await fetchBulkQuestions({
      examId: filterExam || undefined,
      seriesId: filterSeries || undefined,
      testId: filterTest || undefined,
      difficulty: filterDifficulty || undefined,
      search: searchQuery || undefined,
    })
    if (result.error) {
      toast.error(result.error)
    } else {
      setQuestions((result.data as unknown as QuestionRow[]) || [])
    }
    setLoading(false)
    setSelectedIds(new Set())
  }, [filterExam, filterSeries, filterTest, filterDifficulty, searchQuery])

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams()
    if (filterExam) params.set('exam', filterExam)
    if (filterSeries) params.set('series', filterSeries)
    if (filterTest) params.set('test', filterTest)
    if (filterDifficulty) params.set('diff', filterDifficulty)
    if (searchQuery) params.set('q', searchQuery)
    const qs = params.toString()
    router.replace(`/dashboard/questions/bulk${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [filterExam, filterSeries, filterTest, filterDifficulty, searchQuery, router])

  // Selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const selectAll = () => {
    if (selectedIds.size === sortedQuestions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedQuestions.map(q => q.id)))
    }
  }
  const selCount = selectedIds.size

  // Clear filters
  const clearFilters = () => {
    setFilterExam(''); setFilterSeries(''); setFilterTest('')
    setFilterDifficulty(''); setSearchQuery('')
  }
  const hasActiveFilters = filterExam || filterSeries || filterTest || filterDifficulty || searchQuery

  // Sorting logic
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortField(null); setSortDir('asc') } // Third click = clear sort
    } else {
      setSortField(field); setSortDir('asc')
    }
  }

  const sortedQuestions = [...questions].sort((a, b) => {
    if (!sortField) return 0
    const dir = sortDir === 'asc' ? 1 : -1
    const va = a[sortField]
    const vb = b[sortField]
    if (va === null || va === undefined) return 1
    if (vb === null || vb === undefined) return -1
    if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * dir
    return ((va as number) - (vb as number)) * dir
  })

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-30 ml-1" />
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />
  }

  // Inline editing
  const startEdit = (id: string, field: string, currentValue: string | number) => {
    setEditingCell({ id, field })
    setEditValue(String(currentValue))
    setTimeout(() => editInputRef.current?.focus(), 50)
  }

  const commitEdit = async () => {
    if (!editingCell) return
    const { id, field } = editingCell
    const currentQuestion = questions.find(q => q.id === id)
    if (!currentQuestion) { setEditingCell(null); return }

    // Check if value actually changed
    const originalValue = String((currentQuestion as unknown as Record<string, unknown>)[field] ?? '')
    if (editValue === originalValue) {
      // No change — just close the editor without saving
      setEditingCell(null)
      return
    }

    let value: unknown = editValue
    if (['marks', 'negative_marks', 'correct_answer'].includes(field)) {
      value = parseInt(editValue)
      if (isNaN(value as number)) { toast.error('Must be a number'); return }
    }
    const res = await inlineUpdateQuestion(id, field, value)
    if (res.error) toast.error(res.error)
    else {
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q))
      toast.success('Updated')
    }
    setEditingCell(null)
  }

  const cancelEdit = () => setEditingCell(null)

  const startExpandedEdit = (q: QuestionRow) => {
    setExpandedEditId(q.id)
    setExpandedForm({
      text: q.text || '',
      explanation: q.explanation || '',
      correct_answer: q.correct_answer ?? 0,
      options: Array.isArray(q.options)
        ? q.options.map(opt => typeof opt === 'string' ? opt : (typeof opt === 'object' && opt !== null && 'text' in opt ? String((opt as { text?: unknown }).text) : ''))
        : ['', '', '', '']
    })
  }

  const saveExpandedEdit = async (qId: string) => {
    if (!expandedForm) return
    startTransition(async () => {
      // Need an array of objects for the DB since that's what question-actions defaults to or JSON array 
      const optionsPayload = expandedForm.options.map(opt => ({ text: opt }))

      const res1 = await inlineUpdateQuestion(qId, 'text', expandedForm.text)
      const res2 = await inlineUpdateQuestion(qId, 'explanation', expandedForm.explanation)
      const res3 = await inlineUpdateQuestion(qId, 'correct_answer', expandedForm.correct_answer)
      const res4 = await inlineUpdateQuestion(qId, 'options', optionsPayload)

      if (res1.error || res2.error || res3.error || res4.error) {
        toast.error('Failed to update some fields')
      } else {
        toast.success('Question details updated')
        setQuestions(prev => prev.map(q => q.id === qId ? {
          ...q,
          text: expandedForm.text,
          explanation: expandedForm.explanation,
          correct_answer: expandedForm.correct_answer,
          options: optionsPayload as unknown[]
        } : q))
        setExpandedEditId(null)
      }
    })
  }

  // Bulk actions
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selCount} question(s)? This cannot be undone.`)) return
    startTransition(async () => {
      const res = await bulkDeleteQuestions(Array.from(selectedIds))
      if (res.error) toast.error(res.error)
      else { toast.success(`${res.count} question(s) deleted`); loadQuestions() }
    })
  }
  const handleBulkDifficulty = (difficulty: string) => {
    startTransition(async () => {
      const res = await bulkUpdateDifficulty(Array.from(selectedIds), difficulty)
      if (res.error) toast.error(res.error)
      else { toast.success(`Updated ${res.count} question(s) to ${difficulty}`); loadQuestions() }
    })
  }
  const handleBulkDuplicate = () => {
    startTransition(async () => {
      const res = await bulkDuplicateQuestions(Array.from(selectedIds))
      if (res.error) toast.error(res.error)
      else { toast.success(`Duplicated ${res.count} question(s)`); loadQuestions() }
    })
  }
  const handleBulkMove = (testId: string) => {
    startTransition(async () => {
      const res = await bulkMoveToTest(Array.from(selectedIds), testId)
      if (res.error) toast.error(res.error)
      else { toast.success(`Moved ${res.count} question(s)`); loadQuestions() }
    })
  }
  const handleBulkSection = (sectionId: string | null) => {
    startTransition(async () => {
      const res = await bulkMoveToSection(Array.from(selectedIds), sectionId)
      if (res.error) toast.error(res.error)
      else { toast.success(`Assigned ${res.count} question(s) to section`); loadQuestions() }
    })
  }
  const handleBulkTags = () => {
    const tags = bulkTagValue.split(',').map(t => t.trim()).filter(Boolean)
    if (tags.length === 0) return toast.error('Enter at least one tag')
    startTransition(async () => {
      const res = await bulkAssignTags(Array.from(selectedIds), tags)
      if (res.error) toast.error(res.error)
      else { toast.success(`Tags assigned to ${selCount} question(s)`); setBulkTagValue(''); setShowTagInput(false) }
    })
  }

  // Export as CSV
  const handleExport = () => {
    const rows = sortedQuestions.filter(q => selCount === 0 || selectedIds.has(q.id))
    if (rows.length === 0) return toast.error('No questions to export')
    const headers = ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer (A/B/C/D)', 'Marks', 'Neg. Marks', 'Difficulty', 'Test']
    const csvLines = [
      headers.join(','),
      ...rows.map(q => [
        `"${(q.text || '').replace(/"/g, '""')}"`,
        '', '', '', '', // Options would need parsing from JSON
        q.correct_answer !== null && q.correct_answer !== undefined ? String.fromCharCode(65 + q.correct_answer) : '',
        q.marks,
        q.negative_marks || 0,
        q.difficulty || '',
        `"${(q.tests?.title || '').replace(/"/g, '""')}"`,
      ].join(','))
    ]
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `questions_export_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} question(s) as CSV`)
  }

  // Download template
  const handleDownloadTemplate = () => {
    const headers = 'Question,Option A,Option B,Option C,Option D,Correct (A/B/C/D),Marks,Negative Marks,Difficulty'
    const example = '"What is 2+2?","3","4","5","6","B","1","0","easy"'
    const blob = new Blob([headers + '\n' + example + '\n'], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'question_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Template downloaded')
  }

  // Import CSV
  const handleImportCSV = async () => {
    if (!importTestId) return toast.error('Select a test first')
    if (!csvText.trim()) return toast.error('Paste CSV data or upload a file')

    setImportLoading(true)
    try {
      const lines = csvText.trim().split('\n')
      if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')

      const dataRows = lines.slice(1) // Skip header
      const parsed = dataRows.map(line => {
        // Simple CSV parse (handles quoted fields)
        const fields: string[] = []
        let current = ''
        let inQuotes = false
        for (const char of line) {
          if (char === '"') { inQuotes = !inQuotes; continue }
          if (char === ',' && !inQuotes) { fields.push(current.trim()); current = ''; continue }
          current += char
        }
        fields.push(current.trim())
        return fields
      })

      const questions = parsed.map(fields => {
        const [questionText, optA, optB, optC, optD, correct, marks, negMarks, difficulty] = fields
        const options = [optA, optB, optC, optD].filter(Boolean).map((text, i) => ({
          text,
          is_correct: correct?.toUpperCase() === String.fromCharCode(65 + i),
        }))
        return {
          test_id: importTestId,
          question_text: questionText || '',
          marks: parseInt(marks) || 1,
          negative_marks: parseInt(negMarks) || 0,
          options,
          difficulty: difficulty || undefined,
        }
      }).filter(q => q.question_text.length >= 5)

      if (questions.length === 0) throw new Error('No valid questions parsed from CSV')

      const res = await bulkCreateQuestions(questions)
      if (res.error) throw new Error(res.error)

      toast.success(`Imported ${res.inserted} question(s)`, {
        description: res.skipped ? `${res.skipped} skipped due to errors` : undefined,
      })
      setShowImportDialog(false)
      setCsvText('')
      setImportTestId('')
      loadQuestions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImportLoading(false)
    }
  }

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCsvText(ev.target?.result as string || '')
    }
    reader.readAsText(file)
  }

  // Duplicate detection  
  const scanDuplicates = async () => {
    setDupLoading(true)
    const res = await findDuplicateQuestions()
    if (res.error) toast.error(res.error)
    else {
      setDuplicates(res.duplicates)
      setDupScanned(res.totalScanned)
      setShowDuplicates(true)
    }
    setDupLoading(false)
  }

  // Drag and drop
  const handleDragStart = (index: number) => setDragIndex(index)
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }
  const handleDrop = async (index: number) => {
    if (dragIndex === null || dragIndex === index) { setDragIndex(null); setDragOverIndex(null); return }
    const newOrder = [...sortedQuestions]
    const [dragged] = newOrder.splice(dragIndex, 1)
    newOrder.splice(index, 0, dragged)
    setQuestions(newOrder)
    setDragIndex(null)
    setDragOverIndex(null)
    const res = await bulkReorderQuestions(newOrder.map(q => q.id))
    if (res.error) toast.error(res.error)
    else toast.success('Order saved')
  }

  const getDifficultyColor = (d: string | null) => {
    switch (d?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const isEditing = (id: string, field: string) => editingCell?.id === id && editingCell?.field === field

  // Find & Replace across all loaded questions
  const handleFindReplace = () => {
    if (!findText.trim()) return
    let count = 0
    startTransition(async () => {
      for (const q of questions) {
        if (q.text.includes(findText)) {
          const newText = q.text.replaceAll(findText, replaceText)
          const res = await inlineUpdateQuestion(q.id, 'text', newText)
          if (!res.error) {
            setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, text: newText } : x))
            count++
          }
        }
      }
      toast.success(`Replaced in ${count} question(s)`)
      setShowFindReplace(false); setFindText(''); setReplaceText('')
    })
  }

  // Batch update marks for selected
  const handleBatchMarks = () => {
    if (selectedIds.size === 0) return toast.error('Select questions first')
    startTransition(async () => {
      for (const qId of selectedIds) {
        if (batchMarksValue) {
          const res = await inlineUpdateQuestion(qId, 'marks', Number(batchMarksValue))
          if (!res.error) setQuestions(prev => prev.map(x => x.id === qId ? { ...x, marks: Number(batchMarksValue) } : x))
        }
        if (batchNegMarksValue) {
          const res = await inlineUpdateQuestion(qId, 'negative_marks', Number(batchNegMarksValue))
          if (!res.error) setQuestions(prev => prev.map(x => x.id === qId ? { ...x, negative_marks: Number(batchNegMarksValue) } : x))
        }
      }
      toast.success(`Updated marks for ${selectedIds.size} questions`)
      setShowBatchMarks(false); setBatchMarksValue(''); setBatchNegMarksValue('')
    })
  }

  // Computed stats
  const stats = {
    total: sortedQuestions.length,
    easy: sortedQuestions.filter(q => q.difficulty?.toLowerCase() === 'easy').length,
    medium: sortedQuestions.filter(q => q.difficulty?.toLowerCase() === 'medium').length,
    hard: sortedQuestions.filter(q => q.difficulty?.toLowerCase() === 'hard').length,
    unset: sortedQuestions.filter(q => !q.difficulty).length,
    avgMarks: sortedQuestions.length ? (sortedQuestions.reduce((s, q) => s + q.marks, 0) / sortedQuestions.length).toFixed(1) : '0',
    totalMarks: sortedQuestions.reduce((s, q) => s + q.marks, 0),
    uniqueTests: new Set(sortedQuestions.map(q => q.tests?.title).filter(Boolean)).size,
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setEditingCell(null); setSelectedIds(new Set()) }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && !editingCell) { e.preventDefault(); selectAll() }
      if (e.key === 'Delete' && selectedIds.size > 0 && !editingCell) { e.preventDefault(); handleBulkDelete() }
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') { e.preventDefault(); setShowFindReplace(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, editingCell])

  // Quality score (0-100) based on completeness
  const getQualityScore = (q: QuestionRow) => {
    let score = 0
    if (q.text && q.text.length > 10) score += 30
    if (q.difficulty) score += 20
    if (q.marks > 0) score += 20
    if (q.correct_answer !== null && q.correct_answer !== undefined) score += 30
    return score
  }
  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 50) return 'text-amber-500'
    return 'text-red-500'
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg">
              <FileSpreadsheet className="h-6 w-6 text-white" />
            </div>
            Bulk Manager
          </h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            {sortedQuestions.length} questions {hasActiveFilters ? '(filtered)' : ''} · Click any cell to edit · <button onClick={() => setShowShortcuts(!showShortcuts)} className="underline hover:text-[#0066CC] transition-colors">⌨️ Shortcuts</button>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowFindReplace(!showFindReplace)} className="gap-1.5 rounded-xl text-xs h-8">
            <Search className="h-3.5 w-3.5" /> Find & Replace
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowBatchMarks(!showBatchMarks)} className="gap-1.5 rounded-xl text-xs h-8">
            <Hash className="h-3.5 w-3.5" /> Batch Marks
          </Button>
          <Button variant="outline" size="sm" onClick={scanDuplicates} disabled={dupLoading} className="gap-1.5 rounded-xl text-xs h-8">
            {dupLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanSearch className="h-3.5 w-3.5" />}
            Scan Dupes
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)} className="gap-1.5 rounded-xl text-xs h-8">
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 rounded-xl text-xs h-8">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button variant={showStats ? 'default' : 'outline'} size="sm" onClick={() => setShowStats(!showStats)} className="gap-1.5 rounded-xl text-xs h-8">
            <BarChart3 className="h-3.5 w-3.5" /> Stats
          </Button>
        </div>
      </div>

      {/* Stats Dashboard */}
      {showStats && sortedQuestions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="rounded-2xl border border-black/5 dark:border-white/5 p-3 bg-white dark:bg-[#1C1C1E] shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="text-xl font-bold text-[#1D1D1F] dark:text-white">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-green-200/50 dark:border-green-800/30 p-3 bg-green-50/50 dark:bg-green-950/10">
            <p className="text-[9px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">Easy</p>
            <p className="text-xl font-bold text-green-700 dark:text-green-400">{stats.easy}</p>
            {/* noinspection CssInlineStyles */}
            <div className="h-1 bg-green-200 dark:bg-green-800 rounded-full mt-1"><div className="h-full bg-green-500 rounded-full" style={({ width: `${stats.total ? (stats.easy / stats.total) * 100 : 0}%` }) as React.CSSProperties} /></div>
          </div>
          <div className="rounded-2xl border border-yellow-200/50 dark:border-yellow-800/30 p-3 bg-yellow-50/50 dark:bg-yellow-950/10">
            <p className="text-[9px] font-bold uppercase tracking-wider text-yellow-700 dark:text-yellow-400">Medium</p>
            <p className="text-xl font-bold text-yellow-700 dark:text-yellow-400">{stats.medium}</p>
            {/* noinspection CssInlineStyles */}
            <div className="h-1 bg-yellow-200 dark:bg-yellow-800 rounded-full mt-1"><div className="h-full bg-yellow-500 rounded-full" style={({ width: `${stats.total ? (stats.medium / stats.total) * 100 : 0}%` }) as React.CSSProperties} /></div>
          </div>
          <div className="rounded-2xl border border-red-200/50 dark:border-red-800/30 p-3 bg-red-50/50 dark:bg-red-950/10">
            <p className="text-[9px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">Hard</p>
            <p className="text-xl font-bold text-red-700 dark:text-red-400">{stats.hard}</p>
            {/* noinspection CssInlineStyles */}
            <div className="h-1 bg-red-200 dark:bg-red-800 rounded-full mt-1"><div className="h-full bg-red-500 rounded-full" style={({ width: `${stats.total ? (stats.hard / stats.total) * 100 : 0}%` }) as React.CSSProperties} /></div>
          </div>
          <div className="rounded-2xl border border-gray-200/50 dark:border-gray-700/30 p-3 bg-gray-50/50 dark:bg-gray-900/20">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Unset</p>
            <p className="text-xl font-bold text-muted-foreground">{stats.unset}</p>
          </div>
          <div className="rounded-2xl border border-blue-200/50 dark:border-blue-800/30 p-3 bg-blue-50/50 dark:bg-blue-950/10">
            <p className="text-[9px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Avg Marks</p>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{stats.avgMarks}</p>
          </div>
          <div className="rounded-2xl border border-purple-200/50 dark:border-purple-800/30 p-3 bg-purple-50/50 dark:bg-purple-950/10">
            <p className="text-[9px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Total Marks</p>
            <p className="text-xl font-bold text-purple-700 dark:text-purple-400">{stats.totalMarks}</p>
          </div>
          <div className="rounded-2xl border border-cyan-200/50 dark:border-cyan-800/30 p-3 bg-cyan-50/50 dark:bg-cyan-950/10">
            <p className="text-[9px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">Tests</p>
            <p className="text-xl font-bold text-cyan-700 dark:text-cyan-400">{stats.uniqueTests}</p>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts */}
      {showShortcuts && (
        <div className="rounded-2xl border border-black/5 dark:border-white/5 bg-secondary/20 p-4">
          <p className="text-xs font-bold mb-2">⌨️ Keyboard Shortcuts</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ['⌘/Ctrl + A', 'Select all'],
              ['Delete', 'Delete selected'],
              ['⌘/Ctrl + H', 'Find & Replace'],
              ['Escape', 'Cancel / Deselect'],
              ['Enter', 'Save edit'],
              ['Click cell', 'Inline edit'],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 text-[9px] font-mono font-bold text-muted-foreground">{key}</kbd>
                <span className="text-[10px] text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Find & Replace */}
      {showFindReplace && (
        <div className="rounded-2xl border-2 border-amber-200/50 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/10 p-4">
          <p className="text-xs font-bold mb-2 flex items-center gap-2"><Search className="h-4 w-4 text-amber-600" /> Find & Replace in Question Text</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Input value={findText} onChange={e => setFindText(e.target.value)} placeholder="Find text..." className="rounded-xl h-8 text-xs flex-1 min-w-[120px]" />
            <span className="text-xs text-muted-foreground">→</span>
            <Input value={replaceText} onChange={e => setReplaceText(e.target.value)} placeholder="Replace with..." className="rounded-xl h-8 text-xs flex-1 min-w-[120px]" />
            <Badge variant="secondary" className="text-[9px]">{questions.filter(q => findText && q.text.includes(findText)).length} matches</Badge>
            <Button size="sm" className="gap-1 rounded-xl h-8 text-xs bg-amber-600 text-white" onClick={handleFindReplace} disabled={isPending || !findText}>
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Replace All
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowFindReplace(false)}><X className="h-3 w-3" /></Button>
          </div>
        </div>
      )}

      {/* Batch Marks */}
      {showBatchMarks && (
        <div className="rounded-2xl border-2 border-blue-200/50 dark:border-blue-800/30 bg-blue-50/30 dark:bg-blue-950/10 p-4">
          <p className="text-xs font-bold mb-2 flex items-center gap-2"><Hash className="h-4 w-4 text-blue-600" /> Batch Update Marks — {selectedIds.size} selected</p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-muted-foreground">Marks:</span>
              <Input type="number" value={batchMarksValue} onChange={e => setBatchMarksValue(e.target.value)} placeholder="1" className="rounded-xl h-8 text-xs w-16" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-muted-foreground">Negative:</span>
              <Input type="number" value={batchNegMarksValue} onChange={e => setBatchNegMarksValue(e.target.value)} placeholder="0" className="rounded-xl h-8 text-xs w-16" />
            </div>
            <Button size="sm" className="gap-1 rounded-xl h-8 text-xs bg-blue-600 text-white" onClick={handleBatchMarks} disabled={isPending || selectedIds.size === 0}>
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Apply
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowBatchMarks(false)}><X className="h-3 w-3" /></Button>
          </div>
        </div>
      )}

      {/* Search + Filter toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 rounded-xl"
          />
        </div>
        <Button variant={showFilters ? 'default' : 'outline'} size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
          <Filter className="h-3.5 w-3.5" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">!</Badge>
          )}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="grid grid-cols-4 gap-3 p-4 rounded-2xl border border-black/5 dark:border-white/5 bg-secondary/20">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Exam</label>
            <Select value={filterExam} onValueChange={(v) => { setFilterExam(v === '_all' ? '' : v); setFilterSeries(''); setFilterTest('') }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All exams" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All exams</SelectItem>
                {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Series</label>
            <Select value={filterSeries} onValueChange={(v) => { setFilterSeries(v === '_all' ? '' : v); setFilterTest('') }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All series" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All series</SelectItem>
                {filteredSeries.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Test</label>
            <Select value={filterTest} onValueChange={(v) => setFilterTest(v === '_all' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All tests" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All tests</SelectItem>
                {filteredTests.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Difficulty</label>
            <Select value={filterDifficulty} onValueChange={(v) => setFilterDifficulty(v === '_all' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Bulk actions toolbar */}
      {selCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-2xl border-2 border-[#0066CC]/30 bg-[#0066CC]/5 dark:bg-[#0066CC]/10 animate-in slide-in-from-top-2 duration-200 flex-wrap">
          <CheckSquare className="h-4 w-4 text-[#0066CC]" />
          <span className="text-sm font-semibold text-[#0066CC] dark:text-[#5AC8FA]">{selCount} selected</span>
          <div className="h-4 w-px bg-[#0066CC]/20 mx-1" />

          {/* Change Difficulty */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" disabled={isPending}>
                <Tag className="h-3 w-3" /> Difficulty <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulkDifficulty('easy')}>Easy</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkDifficulty('medium')}>Medium</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkDifficulty('hard')}>Hard</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Move to Test (with sections) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" disabled={isPending}>
                <ArrowRightLeft className="h-3 w-3" /> Move <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-60 overflow-y-auto">
              <DropdownMenuLabel className="text-[10px]">Move to Test</DropdownMenuLabel>
              {tests.map(t => {
                const testSections = sections.filter(s => s.test_id === t.id)
                if (testSections.length === 0) {
                  return <DropdownMenuItem key={t.id} onClick={() => handleBulkMove(t.id)}>{t.title}</DropdownMenuItem>
                }
                return (
                  <DropdownMenuSub key={t.id}>
                    <DropdownMenuSubTrigger>{t.title}</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => handleBulkMove(t.id)}>No section</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {testSections.map(s => (
                        <DropdownMenuItem key={s.id} onClick={() => { handleBulkMove(t.id); handleBulkSection(s.id) }}>
                          {s.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assign to Section (within current test) */}
          {filteredSections.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" disabled={isPending}>
                  <Layers className="h-3 w-3" /> Section <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulkSection(null)}>No section</DropdownMenuItem>
                <DropdownMenuSeparator />
                {filteredSections.map(s => (
                  <DropdownMenuItem key={s.id} onClick={() => handleBulkSection(s.id)}>{s.name}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Bulk Tags */}
          <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowTagInput(!showTagInput)} disabled={isPending}>
            <Tag className="h-3 w-3" /> Tags
          </Button>

          <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={handleBulkDuplicate} disabled={isPending}>
            <Copy className="h-3 w-3" /> Duplicate
          </Button>
          <Button variant="outline" size="sm" className="gap-1 h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20" onClick={handleBulkDelete} disabled={isPending}>
            <Trash2 className="h-3 w-3" /> Delete
          </Button>

          {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}
        </div>
      )}

      {/* Tag input row */}
      {showTagInput && selCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 dark:bg-purple-500/10">
          <Tag className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
          <Input
            placeholder="physics, trigonometry, chapter-5 (comma-separated)"
            value={bulkTagValue}
            onChange={e => setBulkTagValue(e.target.value)}
            className="h-8 text-xs flex-1"
            onKeyDown={e => { if (e.key === 'Enter') handleBulkTags() }}
          />
          <Button size="sm" className="h-7 text-xs" onClick={handleBulkTags} disabled={isPending}>Assign</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowTagInput(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/5 dark:border-white/5 bg-secondary/30">
              <th className="w-8 px-2 py-3">
                {filterTest && <span className="sr-only">Drag</span>}
              </th>
              <th className="w-10 px-2 py-3">
                <input
                  type="checkbox"
                  checked={selCount > 0 && selCount === sortedQuestions.length}
                  onChange={selectAll}
                  className="rounded border-gray-300"
                  aria-label="Select all questions"
                />
              </th>
              <th className="text-left px-3 py-3 cursor-pointer select-none" onClick={() => handleSort('text')}>
                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Question <SortIcon field="text" /></span>
              </th>
              <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-40">Test</th>
              <th className="text-left px-3 py-3 cursor-pointer select-none w-24" onClick={() => handleSort('difficulty')}>
                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Difficulty <SortIcon field="difficulty" /></span>
              </th>
              <th className="text-center px-3 py-3 cursor-pointer select-none w-16" onClick={() => handleSort('marks')}>
                <span className="inline-flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Marks <SortIcon field="marks" /></span>
              </th>
              <th className="text-center px-3 py-3 cursor-pointer select-none w-16" onClick={() => handleSort('correct_answer')}>
                <span className="inline-flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ans <SortIcon field="correct_answer" /></span>
              </th>
              <th className="text-center px-3 py-3 w-16">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quality</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2 font-medium">Loading questions…</p>
                </td>
              </tr>
            ) : sortedQuestions.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16">
                  <p className="text-sm text-muted-foreground font-medium">No questions found.</p>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2 text-xs">Clear filters</Button>
                  )}
                </td>
              </tr>
            ) : (
              sortedQuestions.map((q, idx) => (
                <React.Fragment key={q.id}>
                  <tr
                    draggable={!!filterTest}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}
                    onClick={() => setExpandedRow(expandedRow === q.id ? null : q.id)}
                    className={`border-b border-black/[0.03] dark:border-white/[0.03] transition-colors hover:bg-secondary/20 cursor-pointer ${selectedIds.has(q.id) ? 'bg-[#0066CC]/5 dark:bg-[#0066CC]/10' : ''} ${dragOverIndex === idx ? 'border-t-2 border-t-[#0066CC]' : ''}`}
                  >
                    {/* Drag handle */}
                    <td className="px-2 py-3">
                      {filterTest && (
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 cursor-grab active:cursor-grabbing" />
                      )}
                    </td>

                    {/* Checkbox */}
                    <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(q.id)}
                        onChange={() => toggleSelect(q.id)}
                        className="rounded border-gray-300"
                        aria-label={`Select question`}
                      />
                    </td>

                    {/* Question text — inline editable */}
                    <td className="px-3 py-2 group" onClick={() => !editingCell && startEdit(q.id, 'text', q.text)}>
                      {isEditing(q.id, 'text') ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Input
                            ref={editInputRef}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit() }}
                            onBlur={commitEdit}
                            className="h-7 text-xs"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 cursor-pointer">
                          <p className="font-medium text-[#1D1D1F] dark:text-white truncate max-w-[380px]" title={q.text}>
                            {q.text}
                          </p>
                          <Pencil className="h-3 w-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                      )}
                    </td>

                    {/* Test name */}
                    <td className="px-3 py-3">
                      <span className="text-xs text-muted-foreground truncate block max-w-[140px]" title={q.tests?.title}>
                        {q.tests?.title || '—'}
                      </span>
                    </td>

                    {/* Difficulty — inline editable */}
                    <td className="px-3 py-2 group" onClick={(e) => e.stopPropagation()}>
                      {isEditing(q.id, 'difficulty') ? (
                        <Select value={editValue} onValueChange={async (v) => {
                          setEditValue(v)
                          const res = await inlineUpdateQuestion(q.id, 'difficulty', v)
                          if (res.error) toast.error(res.error)
                          else {
                            setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, difficulty: v } : x))
                            toast.success('Updated')
                          }
                          setEditingCell(null)
                        }}>
                          <SelectTrigger className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-bold uppercase tracking-wider cursor-pointer ${getDifficultyColor(q.difficulty)}`}
                          onClick={() => startEdit(q.id, 'difficulty', q.difficulty || 'medium')}
                        >
                          {q.difficulty || 'unset'}
                        </Badge>
                      )}
                    </td>

                    {/* Marks — inline editable */}
                    <td className="px-3 py-2 text-center group" onClick={() => !editingCell && startEdit(q.id, 'marks', q.marks)}>
                      {isEditing(q.id, 'marks') ? (
                        <Input
                          ref={editInputRef}
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit() }}
                          onBlur={commitEdit}
                          className="h-7 text-xs w-14 text-center mx-auto"
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span className="font-semibold text-[#1D1D1F] dark:text-white cursor-pointer">{q.marks}</span>
                      )}
                    </td>

                    {/* Answer */}
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-[#0066CC]/10 text-[#0066CC] dark:text-[#5AC8FA] text-xs font-bold">
                        {q.correct_answer !== null && q.correct_answer !== undefined ? String.fromCharCode(65 + q.correct_answer) : '—'}
                      </span>
                    </td>

                    {/* Quality Score */}
                    <td className="px-3 py-3 text-center">
                      <span className={`text-[10px] font-bold ${getQualityColor(getQualityScore(q))}`} title={`Quality: ${getQualityScore(q)}%`}>
                        {getQualityScore(q)}%
                      </span>
                    </td>

                    {/* Expand Chevron */}
                    <td className="px-2 py-3 text-right text-muted-foreground/30">
                      <ChevronDown className={`h-4 w-4 inline-block transition-transform ${expandedRow === q.id ? 'rotate-180 text-[#0066CC]' : ''}`} />
                    </td>
                  </tr>

                  {/* Expanded Details Row */}
                  {expandedRow === q.id && (
                    <tr className="bg-secondary/10 border-b border-black/[0.03] dark:border-white/[0.03]">
                      <td colSpan={10} className="p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="max-w-4xl animate-in slide-in-from-top-2 ml-10">
                          {expandedEditId === q.id && expandedForm ? (
                            <div className="space-y-4 bg-white dark:bg-[#1C1C1E] p-5 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 relative">
                              <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Question Text</label>
                                <Textarea
                                  value={expandedForm.text}
                                  onChange={e => setExpandedForm({ ...expandedForm, text: e.target.value })}
                                  className="text-sm bg-black/5 dark:bg-white/5 min-h-[80px]"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex justify-between items-center">
                                  <span>Options & Correct Answer</span>
                                  <span className="text-[10px] font-medium opacity-60 normal-case">Select radio to set answer</span>
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {expandedForm.options.map((opt, idx) => (
                                    <div key={idx} className={`flex items-start gap-2 p-2 rounded-xl border ${expandedForm.correct_answer === idx ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10' : 'border-black/10 dark:border-white/10'}`}>
                                      <div className="pt-2 pl-1 shrink-0 cursor-pointer" onClick={() => setExpandedForm({ ...expandedForm, correct_answer: idx })}>
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${expandedForm.correct_answer === idx ? 'border-green-500 bg-green-500' : 'border-neutral-400'}`}>
                                          {expandedForm.correct_answer === idx && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                        </div>
                                      </div>
                                      <span className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-black/5 dark:bg-white/5 text-[11px] font-bold">
                                        {String.fromCharCode(65 + idx)}
                                      </span>
                                      <Input
                                        value={opt}
                                        onChange={e => {
                                          const newOpts = [...expandedForm.options]
                                          newOpts[idx] = e.target.value
                                          setExpandedForm({ ...expandedForm, options: newOpts })
                                        }}
                                        className="h-8 text-xs bg-transparent border-0 shadow-none px-1"
                                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                      />
                                    </div>
                                  ))}
                                  <Button
                                    variant="outline" size="sm"
                                    className="h-full min-h-[48px] border-dashed text-xs text-muted-foreground"
                                    onClick={() => setExpandedForm({ ...expandedForm, options: [...expandedForm.options, ''] })}
                                  >
                                    + Add Option
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Explanation</label>
                                <Textarea
                                  value={expandedForm.explanation}
                                  onChange={e => setExpandedForm({ ...expandedForm, explanation: e.target.value })}
                                  className="text-sm bg-black/5 dark:bg-white/5 min-h-[80px]"
                                  placeholder="Explanation for the correct answer..."
                                />
                              </div>
                              <div className="pt-2 flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setExpandedEditId(null)}>Cancel</Button>
                                <Button size="sm" onClick={() => saveExpandedEdit(q.id)} disabled={isPending}>
                                  {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                  Save Changes
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1 pr-4">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Question Text</p>
                                  <p className="text-sm font-medium text-[#1D1D1F] dark:text-white bg-white dark:bg-[#1C1C1E] p-3 rounded-xl border border-black/5 dark:border-white/5">
                                    {q.text || 'No text content'}
                                  </p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => startExpandedEdit(q)} className="h-8 rounded-lg shrink-0 border-[#0066CC]/20 text-[#0066CC] hover:bg-[#0066CC]/5">
                                  <Pencil className="w-3.5 h-3.5 mr-2" /> Quick Edit Details
                                </Button>
                              </div>

                              {q.options && Array.isArray(q.options) && q.options.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Options</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {q.options.map((opt, optIdx: number) => {
                                      const optText =
                                        typeof opt === 'string'
                                          ? opt
                                          : typeof opt === 'object' && opt !== null && 'text' in opt
                                            ? String((opt as { text?: unknown }).text ?? '—')
                                            : '—'
                                      return (
                                        <div key={optIdx} className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${q.correct_answer === optIdx ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400 font-medium' : 'bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-muted-foreground'}`}>
                                          <span className="shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-full bg-secondary text-[10px] font-bold">{String.fromCharCode(65 + optIdx)}</span>
                                          <span className="pt-0.5">{String(optText)}</span>
                                          {q.correct_answer === optIdx && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-green-500 shrink-0 mt-0.5" />}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                              {q.explanation && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Explanation</p>
                                  <div className="text-xs text-muted-foreground bg-white dark:bg-[#1C1C1E] p-3 rounded-xl border border-black/5 dark:border-white/5">
                                    {q.explanation}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CSV Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-[560px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-[#0066CC]" />
              Import Questions from CSV
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file or paste CSV data. Each row becomes a question.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Target Test *</label>
              <Select value={importTestId} onValueChange={setImportTestId}>
                <SelectTrigger><SelectValue placeholder="Select test to import into" /></SelectTrigger>
                <SelectContent>
                  {tests.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2">
                <Download className="h-3.5 w-3.5" /> Download Template
              </Button>
              <label className="cursor-pointer">
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                <Button variant="outline" size="sm" className="gap-2 pointer-events-none">
                  <Upload className="h-3.5 w-3.5" /> Upload CSV
                </Button>
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">CSV Data</label>
              <Textarea
                placeholder={`Question,Option A,Option B,Option C,Option D,Correct (A/B/C/D),Marks,Negative Marks,Difficulty\n"What is 2+2?","3","4","5","6","B","1","0","easy"`}
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                className="min-h-[120px] text-xs font-mono"
              />
              {csvText && (
                <p className="text-xs text-muted-foreground">
                  {csvText.trim().split('\n').length - 1} data row(s) detected
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowImportDialog(false)}>Cancel</Button>
              <Button onClick={handleImportCSV} disabled={importLoading} className="bg-[#0066CC] hover:bg-[#0052A3] text-white">
                {importLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Import
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Detection Dialog */}
      <Dialog open={showDuplicates} onOpenChange={setShowDuplicates}>
        <DialogContent className="sm:max-w-[600px] rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Duplicate Scan Results
            </DialogTitle>
            <DialogDescription>
              Scanned {dupScanned} questions. Found {duplicates.length} potential duplicate group(s).
            </DialogDescription>
          </DialogHeader>

          {duplicates.length === 0 ? (
            <div className="text-center py-8">
              <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">No duplicates found! Your question bank is clean.</p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {duplicates.map((dup, i) => (
                <div key={i} className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 dark:bg-yellow-500/10 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-[#1D1D1F] dark:text-white line-clamp-2">{dup.text}</p>
                    <Badge variant="secondary" className="shrink-0 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                      {dup.count}×
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Found in:</span>
                    {dup.tests.map((t, j) => (
                      <Badge key={j} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] text-red-600"
                    onClick={async () => {
                      const idsToDelete = dup.ids.slice(1) // Keep first, delete rest
                      if (!confirm(`Delete ${idsToDelete.length} duplicate(s), keeping one copy?`)) return
                      const res = await bulkDeleteQuestions(idsToDelete)
                      if (res.error) toast.error(res.error)
                      else {
                        toast.success(`Removed ${idsToDelete.length} duplicate(s)`)
                        setDuplicates(prev => prev.filter((_, idx) => idx !== i))
                        loadQuestions()
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Keep 1, delete {dup.count - 1}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
