'use client'

import React, { useState, useCallback, useRef, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  UploadCloud, CheckCircle, AlertTriangle, Loader2, Copy,
  Download, FileJson, FileSpreadsheet, Sparkles, Plus,
  ArrowLeft, Trash2, RotateCcw, ExternalLink, Check, X as XIcon,
  ChevronDown, ChevronUp, CircleAlert, Search, LayoutGrid, LayoutList, Undo, Redo, GripVertical
} from 'lucide-react'
import { toast } from 'sonner'
import { bulkCreateQuestions } from '@/actions/question-actions'
import { QuestionFormValues } from '@/lib/validations/question'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface Exam { id: string; title: string }
interface Series { id: string; title: string; exam_id: string }
interface Test { id: string; title: string; series_id: string }
interface Section { id: string; name: string; test_id: string }

type UploadRow = Record<string, unknown>

interface ParsedQuestion {
  id: string
  question_text: string
  options: { text: string; is_correct: boolean }[]
  marks: number
  negative_marks: number
  difficulty: string
  explanation: string
  valid: boolean
  error?: string
  duplicateOf?: number  // index of the original question (1-based)
  batch?: number        // which batch this question belongs to
}

/* Fuzzy duplicate detection — normalizes text and checks similarity */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '').trim()
}
function isDuplicate(a: string, b: string): boolean {
  const na = normalize(a), nb = normalize(b)
  if (!na || !nb) return false
  if (na === nb) return true
  // Check if one contains the other (for slight rewording)
  if (na.length > 10 && nb.length > 10) {
    if (na.includes(nb) || nb.includes(na)) return true
  }
  // Simple similarity: shared character ratio
  if (na.length > 15 && nb.length > 15) {
    const shorter = na.length < nb.length ? na : nb
    const longer = na.length >= nb.length ? na : nb
    let matches = 0
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) matches++
    }
    if (matches / shorter.length > 0.9 && Math.abs(na.length - nb.length) < 5) return true
  }
  return false
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function toNum(v: unknown, fallback: number) {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') { const n = Number(v); if (Number.isFinite(n)) return n }
  return fallback
}
function txt(...vals: unknown[]) {
  for (const v of vals) { if (typeof v === 'string' && v.trim()) return v.trim() }
  return ''
}
function parseCorrect(v: unknown, count = 4): number {
  if (typeof v === 'number' && Number.isInteger(v)) {
    if (v >= 0 && v < count) return v
    if (v >= 1 && v <= count) return v - 1
    return -1
  }
  if (typeof v !== 'string') return -1
  const n = v.trim().toUpperCase()
  if (!n) return -1
  if (n === 'A') return 0; if (n === 'B') return 1; if (n === 'C') return 2; if (n === 'D') return 3
  const num = Number(n); if (Number.isInteger(num)) { if (num >= 0 && num < count) return num; if (num >= 1 && num <= count) return num - 1 }
  return -1
}

function normalizeRow(row: UploadRow): { question: ParsedQuestion } | { error: string } {
  const qText = txt(row.Question, row.question, row.question_text, row.questionText)
  if (!qText) return { error: 'Missing question text' }

  let opts: { text: string; is_correct: boolean }[] | null = null
  let optError: string | null = null

  // Try options array first
  if (Array.isArray(row.options)) {
    if (row.options.length < 2) { optError = 'Need at least 2 options' }
    else if (typeof row.options[0] === 'string') {
      const texts = row.options.map((o: unknown) => typeof o === 'string' ? o.trim() : '').filter(Boolean)
      const ci = parseCorrect(row.correct_answer ?? row.correctAnswer ?? row.CorrectOption ?? row.correctOption, texts.length)
      if (ci < 0 || ci >= texts.length) { optError = 'Invalid correct answer index' }
      else { opts = texts.map((t: string, i: number) => ({ text: t, is_correct: i === ci })) }
    } else if (typeof row.options[0] === 'object' && row.options[0] !== null) {
      const objs = row.options as UploadRow[]
      const parsed = objs.map((o) => ({ text: txt(o.text, o.option, o.value), is_correct: Boolean(o.is_correct ?? o.isCorrect) }))
      if (parsed.some(o => !o.text)) { optError = 'Option missing text' }
      else if (parsed.filter(o => o.is_correct).length !== 1) { optError = 'Exactly one correct option needed' }
      else { opts = parsed }
    }
  }

  // Fallback: OptionA/B/C/D columns
  if (!opts && !optError) {
    const a = txt(row.OptionA, row.optionA, row.option_a)
    const b = txt(row.OptionB, row.optionB, row.option_b)
    const c = txt(row.OptionC, row.optionC, row.option_c)
    const d = txt(row.OptionD, row.optionD, row.option_d)
    if (a && b) {
      const all = [a, b, c, d].filter(Boolean)
      const ci = parseCorrect(row.CorrectOption ?? row.correctOption ?? row.correct_answer ?? row.correctAnswer, all.length)
      if (ci < 0 || ci >= all.length) { optError = 'Invalid CorrectOption (use A/B/C/D or 1-4)' }
      else { opts = all.map((t, i) => ({ text: t, is_correct: i === ci })) }
    }
  }

  if (optError) return { error: optError }
  if (!opts) return { error: 'Missing options' }

  const difficulty = txt(row.Difficulty, row.difficulty) || ''
  const explanation = txt(row.Explanation, row.explanation)

  return {
    question: {
      id: Math.random().toString(36).slice(2, 10),
      question_text: qText,
      options: opts,
      marks: toNum(row.Marks ?? row.marks, 1),
      negative_marks: toNum(row.NegativeMarks ?? row.negative_marks ?? row.negativeMarks, 0),
      difficulty,
      explanation,
      valid: true,
    }
  }
}

function normalizeJsonPayload(payload: unknown): UploadRow[] | null {
  if (Array.isArray(payload)) return payload as UploadRow[]
  if (payload && typeof payload === 'object' && 'questions' in payload && Array.isArray((payload as Record<string, unknown>).questions)) {
    return (payload as { questions: UploadRow[] }).questions
  }
  return null
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */
const CSV_TEMPLATE = `Question,OptionA,OptionB,OptionC,OptionD,CorrectOption,Marks,NegativeMarks,Difficulty,Explanation
"What is the chemical symbol for water?","H2O","CO2","NaCl","O2","A",1,0,"Easy","Water is H2O"
"Which planet is known as the Red Planet?","Venus","Mars","Jupiter","Saturn","B",1,0.25,"Medium","Mars appears red due to iron oxide on its surface"
"What is the speed of light approximately?","3×10⁸ m/s","3×10⁶ m/s","3×10¹⁰ m/s","3×10⁴ m/s","A",2,0.5,"Hard","The speed of light in vacuum is about 3×10⁸ m/s"`

const JSON_TEMPLATE = JSON.stringify([
  {
    "question_text": "What is the chemical symbol for water?",
    "options": ["H2O", "CO2", "NaCl", "O2"],
    "correct_answer": "A",
    "marks": 1,
    "negative_marks": 0,
    "difficulty": "Easy",
    "explanation": "Water is H2O"
  },
  {
    "question_text": "Which planet is known as the Red Planet?",
    "options": ["Venus", "Mars", "Jupiter", "Saturn"],
    "correct_answer": "B",
    "marks": 1,
    "negative_marks": 0.25,
    "difficulty": "Medium",
    "explanation": "Mars appears red due to iron oxide on its surface"
  }
], null, 2)

const AI_PROMPT = `Generate 20 MCQ questions in the exact JSON format below for the topic: [YOUR TOPIC HERE]

Each question must have exactly 4 options, one correct answer (A/B/C/D), marks, negative_marks, difficulty (Easy/Medium/Hard), and an explanation.

${JSON_TEMPLATE}`

/* ------------------------------------------------------------------ */
/* CDN script loaders                                                  */
/* ------------------------------------------------------------------ */
declare global { interface Window { Papa: any; XLSX: any } } // eslint-disable-line @typescript-eslint/no-explicit-any

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script'); s.src = src; s.onload = () => resolve(); s.onerror = reject
    document.head.appendChild(s)
  })
}

/* ------------------------------------------------------------------ */
/* COMPONENT                                                           */
/* ------------------------------------------------------------------ */
export function BulkUploadClient({
  exams, series, tests, sections,
}: {
  exams: Exam[]; series: Series[]; tests: Test[]; sections: Section[]
}) {
  /* Step state */
  const [step, setStep] = useState(1)

  /* Step 1: Config */
  const [examId, setExamId] = useState('')
  const [seriesId, setSeriesId] = useState('')
  const [testId, setTestId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [defaultDifficulty, setDefaultDifficulty] = useState('')
  const [defaultMarks, setDefaultMarks] = useState(1)
  const [defaultNegMarks, setDefaultNegMarks] = useState(0)
  const [defaultTags, setDefaultTags] = useState('')
  const [importTab, setImportTab] = useState<'file' | 'json' | 'templates'>('file')
  const [rawJson, setRawJson] = useState('')
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* Step 2: Parsed data */
  const [questions, setQuestions] = useState<ParsedQuestion[]>([])
  const [parseErrors, setParseErrors] = useState<{ row: number; msg: string }[]>([])
  const [editingCell, setEditingCell] = useState<{ qId: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const editRef = useRef<HTMLInputElement>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [addMoreOpen, setAddMoreOpen] = useState(false)
  const [addMoreJson, setAddMoreJson] = useState('')
  const [batchLog, setBatchLog] = useState<{ count: number; errors: number; ts: number }[]>([])
  const batchCounter = useRef(0)

  /* Step 2: Search, Filter, Bulk Select */
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'errors' | 'duplicates' | 'valid'>('all')
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const pageSize = 50
  const [isCompact, setIsCompact] = useState(false)

  /* ---- Undo / Redo & Drag & Drop ---- */
  const history = useRef<ParsedQuestion[][]>([])
  const historyIdx = useRef(-1)
  const [isUndoRedoing, setIsUndoRedoing] = useState(false)
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [draggedOpt, setDraggedOpt] = useState<{ qId: string, idx: number } | null>(null)

  /* Step 3: Upload */
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    inserted: number; skipped: number; rowIssues: { row: number; msg: string }[]
  } | null>(null)

  /* Derived data for cascading dropdowns */
  const filteredSeries = useMemo(() => examId ? series.filter(s => s.exam_id === examId) : series, [examId, series])
  const filteredTests = useMemo(() => seriesId ? tests.filter(t => t.series_id === seriesId) : tests, [seriesId, tests])
  const filteredSections = useMemo(() => testId ? sections.filter(s => s.test_id === testId) : [], [testId, sections])

  const validCount = questions.filter(q => q.valid).length
  const errorCount = questions.filter(q => !q.valid).length
  const duplicateCount = questions.filter(q => q.duplicateOf).length

  /* ---- Auto-Save & Restore to LocalStorage ---- */
  const STORAGE_KEY = 'testkra_bulk_upload_state'

  /* Computed Display Questions */
  const displayedQuestions = useMemo(() => {
    return questions.filter(q => {
      if (filterMode === 'errors' && q.valid) return false
      if (filterMode === 'duplicates' && !q.duplicateOf) return false
      if (filterMode === 'valid' && (!q.valid || q.duplicateOf)) return false
      if (searchQuery) {
        const qLower = q.question_text.toLowerCase()
        const sLower = searchQuery.toLowerCase()
        if (!qLower.includes(sLower)) return false
      }
      return true
    })
  }, [questions, filterMode, searchQuery])

  React.useEffect(() => setPage(1), [searchQuery, filterMode])

  React.useEffect(() => {
    if (isUndoRedoing) { setIsUndoRedoing(false); return }
    history.current = history.current.slice(0, historyIdx.current + 1)
    history.current.push(questions)
    if (history.current.length > 30) history.current.shift()
    historyIdx.current = history.current.length - 1
  }, [questions]) // eslint-disable-line react-hooks/exhaustive-deps

  const undo = () => {
    if (historyIdx.current > 0) {
      setIsUndoRedoing(true)
      historyIdx.current--
      setQuestions(history.current[historyIdx.current])
    }
  }
  const redo = () => {
    if (historyIdx.current < history.current.length - 1) {
      setIsUndoRedoing(true)
      historyIdx.current++
      setQuestions(history.current[historyIdx.current])
    }
  }

  const totalPages = Math.ceil(displayedQuestions.length / pageSize)
  const paginatedQuestions = useMemo(() => {
    return displayedQuestions.slice((page - 1) * pageSize, page * pageSize)
  }, [displayedQuestions, page, pageSize])

  /* Bulk Actions */
  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
  }
  const toggleAllSelection = () => {
    if (selectedRows.length === displayedQuestions.length && displayedQuestions.length > 0) {
      setSelectedRows([])
    } else {
      setSelectedRows(displayedQuestions.map(q => q.id))
    }
  }
  const deleteSelected = () => {
    setQuestions(prev => prev.filter(q => !selectedRows.includes(q.id)))
    setSelectedRows([])
    toast.success(`Deleted ${selectedRows.length} questions`)
  }
  const bulkSetDifficulty = (diff: string) => {
    setQuestions(prev => prev.map(q => selectedRows.includes(q.id) ? { ...q, difficulty: diff } : q))
    toast.success(`Updated difficulty for ${selectedRows.length} questions`)
  }
  const bulkSetMarks = (marks: number) => {
    setQuestions(prev => prev.map(q => selectedRows.includes(q.id) ? { ...q, marks } : q))
    toast.success(`Updated marks for ${selectedRows.length} questions`)
  }
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(displayedQuestions, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `testkra_export_${displayedQuestions.length}_questions.json`; a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${displayedQuestions.length} questions`)
  }

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.questions?.length > 0) {
          toast('Unsaved progress found', {
            description: `Restore ${parsed.questions.length} questions from your previous session?`,
            action: {
              label: 'Restore',
              onClick: () => {
                setQuestions(parsed.questions)
                setParseErrors(parsed.parseErrors || [])
                setBatchLog(parsed.batchLog || [])
                batchCounter.current = parsed.batchCounter || 0
                if (parsed.testId) setTestId(parsed.testId)
                if (parsed.seriesId) setSeriesId(parsed.seriesId)
                if (parsed.examId) setExamId(parsed.examId)
                setStep(2)
              }
            },
            cancel: {
              label: 'Discard',
              onClick: () => localStorage.removeItem(STORAGE_KEY)
            },
            duration: 15000,
          })
        }
      }
    } catch { /* safe ignore */ }
  }, [])

  React.useEffect(() => {
    if (questions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        questions, parseErrors, batchLog, batchCounter: batchCounter.current,
        testId, seriesId, examId
      }))
    } else if (step === 1 && questions.length === 0) {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [questions, parseErrors, batchLog, step, testId, seriesId, examId])

  /* Load parsing libs when needed */
  const ensureLibs = useCallback(async () => {
    await Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'),
    ])
  }, [])

  /* ---- Parsing (supports append mode for "Add More") ---- */
  const processRows = useCallback((rows: UploadRow[], append = false) => {
    const parsed: ParsedQuestion[] = []
    const errs: { row: number; msg: string }[] = []
    const currentBatch = batchCounter.current + 1
    batchCounter.current = currentBatch

    rows.forEach((row, i) => {
      const result = normalizeRow(row)
      if ('error' in result) {
        errs.push({ row: i + 1, msg: result.error })
      } else {
        const q = result.question
        q.batch = currentBatch
        // Apply bulk defaults
        if (!q.difficulty && defaultDifficulty) q.difficulty = defaultDifficulty
        if (q.marks === 1 && defaultMarks !== 1) q.marks = defaultMarks
        if (q.negative_marks === 0 && defaultNegMarks !== 0) q.negative_marks = defaultNegMarks
        parsed.push(q)
      }
    })

    if (parsed.length === 0 && errs.length > 0) {
      toast.error(`All ${errs.length} rows had errors. Check the data format.`)
      return
    }

    // Duplicate detection: compare new questions against existing ones
    const existingQuestions = append ? questions : []
    parsed.forEach((newQ) => {
      const dupIdx = existingQuestions.findIndex(existingQ => isDuplicate(newQ.question_text, existingQ.question_text))
      if (dupIdx >= 0) {
        newQ.duplicateOf = dupIdx + 1
      }
    })

    const dupCount = parsed.filter(q => q.duplicateOf).length
    const totalAfter = (append ? questions.length : 0) + parsed.length

    if (append) {
      setQuestions(prev => [...prev, ...parsed])
      setParseErrors(prev => [...prev, ...errs])
      setBatchLog(prev => [...prev, { count: parsed.length, errors: errs.length, ts: Date.now() }])
      toast.success(`✅ ${parsed.length} questions added (${totalAfter} total)${dupCount > 0 ? ` — ⚠️ ${dupCount} possible duplicates` : ''}`)
      setAddMoreOpen(false)
      setAddMoreJson('')
    } else {
      setQuestions(parsed)
      setParseErrors(errs)
      setBatchLog([{ count: parsed.length, errors: errs.length, ts: Date.now() }])
      toast.success(`Parsed ${parsed.length} questions (${errs.length} errors)${dupCount > 0 ? ` — ⚠️ ${dupCount} possible duplicates` : ''}`)
      setStep(2)
    }
  }, [defaultDifficulty, defaultMarks, defaultNegMarks, questions])

  /* ---- Add More (append batch in Step 2) ---- */
  const handleAddMore = useCallback(() => {
    if (!addMoreJson.trim()) { toast.error('Paste JSON data'); return }
    try {
      const cleaned = addMoreJson.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      const parsed = JSON.parse(cleaned)
      const rows = normalizeJsonPayload(parsed)
      if (!rows) { toast.error('Invalid JSON. Use an array or { "questions": [...] }'); return }
      processRows(rows, true)
    } catch {
      toast.error('Invalid JSON syntax. Check for trailing commas or missing quotes.')
    }
  }, [addMoreJson, processRows])

  /* ---- Toggle correct answer ---- */
  const toggleCorrect = (qId: string, optionIdx: number) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q
      return { ...q, options: q.options.map((o, i) => ({ ...o, is_correct: i === optionIdx })) }
    }))
  }

  const handleParseJson = useCallback(() => {
    if (!testId) { toast.error('Select a test first'); return }
    if (!rawJson.trim()) { toast.error('Paste JSON data'); return }
    try {
      const cleaned = rawJson.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      const parsed = JSON.parse(cleaned)
      const rows = normalizeJsonPayload(parsed)
      if (!rows) { toast.error('Invalid JSON. Use an array or { "questions": [...] }'); return }
      processRows(rows)
    } catch {
      toast.error('Invalid JSON syntax. Check for trailing commas or missing quotes.')
    }
  }, [rawJson, testId, processRows])

  const handleFile = useCallback(async (file: File) => {
    if (!testId) { toast.error('Select a test first'); return }
    const name = file.name.toLowerCase()
    const isCsv = name.endsWith('.csv')
    const isXlsx = name.endsWith('.xlsx')
    const isJson = name.endsWith('.json')
    if (!isCsv && !isXlsx && !isJson) { toast.error('Use CSV, XLSX, or JSON files'); return }

    if (isCsv || isXlsx) {
      try { await ensureLibs() } catch { toast.error('Failed to load parsing libraries'); return }
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        let rows: UploadRow[] = []
        if (isCsv) {
          rows = window.Papa.parse(data as string, { header: true, skipEmptyLines: true }).data
        } else if (isXlsx) {
          const wb = window.XLSX.read(data, { type: 'binary' })
          rows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
        } else {
          const parsed = JSON.parse(data as string) as unknown
          const r = normalizeJsonPayload(parsed)
          if (!r) { toast.error('Invalid JSON format'); return }
          rows = r
        }
        processRows(rows)
      } catch { toast.error('Error reading file') }
    }
    if (isCsv || isJson) reader.readAsText(file)
    else reader.readAsBinaryString(file)
  }, [testId, processRows, ensureLibs])

  /* ---- Drag & Drop ---- */
  const onDragEnter = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragActive(true) }, [])
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragActive(false) }, [])
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault() }, [])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragActive(false)
    if (e.dataTransfer.files?.length) handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  /* ---- Inline Editing ---- */
  const isQValid = (q: ParsedQuestion) => {
    if (!q.question_text.trim()) return false
    const validOpts = q.options.filter(o => o.text.trim())
    if (validOpts.length < 2) return false
    const correctOpts = q.options.filter(o => o.is_correct)
    if (correctOpts.length !== 1) return false
    return true
  }

  const startEdit = (qId: string, field: string, value: string) => {
    setEditingCell({ qId, field }); setEditValue(value)
    setTimeout(() => editRef.current?.focus(), 50)
  }
  const commitEdit = () => {
    if (!editingCell) return
    setQuestions(prev => prev.map(q => {
      if (q.id !== editingCell.qId) return q
      const updated = { ...q }
      if (editingCell.field === 'question_text') updated.question_text = editValue
      else if (editingCell.field === 'marks') updated.marks = toNum(editValue, q.marks)
      else if (editingCell.field === 'negative_marks') updated.negative_marks = toNum(editValue, q.negative_marks)
      else if (editingCell.field === 'difficulty') updated.difficulty = editValue
      else if (editingCell.field === 'explanation') updated.explanation = editValue
      else if (editingCell.field.startsWith('option_')) {
        const idx = parseInt(editingCell.field.split('_')[1])
        updated.options = updated.options.map((o, i) => i === idx ? { ...o, text: editValue } : o)
      }
      updated.valid = isQValid(updated)
      return updated
    }))
    setEditingCell(null)
  }
  const deleteRow = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id))
    setSelectedRows(prev => prev.filter(r => r !== id))
  }

  /* ---- Upload ---- */
  const handleUpload = async () => {
    if (validCount === 0) { toast.error('No valid questions to upload'); return }
    setIsUploading(true)

    const bulkTags = defaultTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)

    const payload: QuestionFormValues[] = questions
      .filter(q => q.valid && !q.duplicateOf)
      .map(q => ({
        test_id: testId,
        question_text: q.question_text,
        options: q.options,
        marks: q.marks,
        negative_marks: q.negative_marks,
        explanation: q.explanation || undefined,
        tags: bulkTags.length > 0 ? bulkTags : undefined,
        difficulty: q.difficulty || defaultDifficulty || undefined,
      }))

    try {
      let inserted = 0, skipped = 0;
      let rowIssues: { row: number, msg: string, type?: string }[] = [];
      let lastErr = null;

      for (let i = 0; i < payload.length; i += 50) {
        const chunk = payload.slice(i, i + 50)
        const res = await bulkCreateQuestions(chunk)
        if (res.error) { lastErr = res.error; break }
        inserted += (typeof res.inserted === 'number' ? res.inserted : 0)
        skipped += (typeof res.skipped === 'number' ? res.skipped : 0)
        if (Array.isArray(res.rowIssues)) {
          rowIssues = rowIssues.concat(res.rowIssues.map(issue => ({ ...issue, row: issue.row + i })))
        }
      }

      setUploadResult({ inserted, skipped, rowIssues })
      if (lastErr) toast.error(lastErr)
      else toast.success(`Uploaded ${inserted} questions!`)
      setStep(3)
      localStorage.removeItem(STORAGE_KEY)
    } catch { toast.error('Upload failed') }
    finally { setIsUploading(false) }
  }

  const resetWizard = () => {
    setStep(1); setQuestions([]); setParseErrors([]); setUploadResult(null)
    setRawJson(''); setDefaultTags('')
  }

  /* ---- Template Downloads ---- */
  const downloadCSV = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'testkra_questions_template.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Template downloaded')
  }
  const downloadJSON = () => {
    const blob = new Blob([JSON_TEMPLATE], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'testkra_questions_template.json'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Template downloaded')
  }
  const copyForAI = () => {
    navigator.clipboard.writeText(AI_PROMPT)
    toast.success('AI prompt copied! Paste it into ChatGPT or Gemini.')
  }

  /* ---- Correct answer labels ---- */
  const correctLabel = (opts: { is_correct: boolean }[]) => {
    const idx = opts.findIndex(o => o.is_correct)
    return idx >= 0 ? String.fromCharCode(65 + idx) : '?'
  }

  /* ================================================================== */
  /* RENDER                                                              */
  /* ================================================================== */
  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/20">
            <UploadCloud className="h-6 w-6 text-white" />
          </div>
          Bulk Upload
        </h2>
        <p className="text-sm font-medium text-muted-foreground mt-2">
          Import questions from CSV, XLSX, or JSON files into any test. Use AI-ready templates for blazing-fast creation.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-3">
        {[
          { num: 1, label: 'Configure & Import' },
          { num: 2, label: 'Review & Edit' },
          { num: 3, label: 'Upload Report' },
        ].map(({ num, label }, i) => (
          <React.Fragment key={num}>
            {i > 0 && <div className={`flex-1 h-0.5 rounded transition-colors ${step >= num ? 'bg-violet-500' : 'bg-neutral-200 dark:bg-neutral-800'}`} />}
            <div className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step > num ? 'bg-violet-500 text-white' :
                step === num ? 'bg-violet-500 text-white ring-4 ring-violet-500/20' :
                  'bg-neutral-200 dark:bg-neutral-800 text-muted-foreground'
                }`}>
                {step > num ? <Check className="h-4 w-4" /> : num}
              </div>
              <span className={`text-sm font-semibold hidden sm:inline ${step >= num ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* ============================================================ */}
      {/* STEP 1: Configure & Import                                    */}
      {/* ============================================================ */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Test Selector */}
          <Card className="border shadow-none rounded-2xl">
            <CardContent className="p-6 space-y-5">
              <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">1. Select Target Test</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Exam (optional)</Label>
                  <Select value={examId} onValueChange={(v) => { setExamId(v); setSeriesId(''); setTestId('') }}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="All Exams" /></SelectTrigger>
                    <SelectContent>{exams.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Series (optional)</Label>
                  <Select value={seriesId} onValueChange={(v) => { setSeriesId(v); setTestId('') }}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="All Series" /></SelectTrigger>
                    <SelectContent>{filteredSeries.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Test *</Label>
                  <Select value={testId} onValueChange={setTestId}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select a Test" /></SelectTrigger>
                    <SelectContent>{filteredTests.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {filteredSections.length > 0 && (
                <div className="space-y-1.5 max-w-xs">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Section (optional)</Label>
                  <Select value={sectionId} onValueChange={setSectionId}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="No section" /></SelectTrigger>
                    <SelectContent>{filteredSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bulk Defaults */}
          <Card className="border shadow-none rounded-2xl">
            <CardContent className="p-6 space-y-5">
              <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">2. Default Settings</h3>
              <p className="text-xs text-muted-foreground -mt-3">Applied to all imported rows unless the row specifies its own value.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Difficulty</Label>
                  <Select value={defaultDifficulty} onValueChange={setDefaultDifficulty}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Marks</Label>
                  <Input type="number" value={defaultMarks} onChange={e => setDefaultMarks(Number(e.target.value) || 1)} className="rounded-xl h-11" min={1} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Neg. Marks</Label>
                  <Input type="number" value={defaultNegMarks} onChange={e => setDefaultNegMarks(Number(e.target.value) || 0)} className="rounded-xl h-11" min={0} step={0.25} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tags (comma sep)</Label>
                  <Input value={defaultTags} onChange={e => setDefaultTags(e.target.value)} placeholder="physics, jee" className="rounded-xl h-11" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Import Methods */}
          <Card className="border shadow-none rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white p-6 pb-4">3. Import Questions</h3>
              {/* Tabs */}
              <div className="flex border-b px-6">
                {([
                  { id: 'file' as const, label: 'File Upload', icon: FileSpreadsheet },
                  { id: 'json' as const, label: 'Paste JSON', icon: FileJson },
                  { id: 'templates' as const, label: 'Templates', icon: Sparkles },
                ]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setImportTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${importTab === tab.id
                      ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <tab.icon className="h-4 w-4" /> {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {importTab === 'file' && (
                  <div
                    onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${isDragActive
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10'
                      : 'border-neutral-300 dark:border-neutral-700 hover:border-violet-400 hover:bg-violet-50/30 dark:hover:bg-violet-500/5'
                      }`}
                  >
                    <UploadCloud className={`h-12 w-12 mx-auto mb-4 transition-colors ${isDragActive ? 'text-violet-500' : 'text-muted-foreground'}`} />
                    <p className="text-lg font-bold text-[#1D1D1F] dark:text-white mb-1">
                      {isDragActive ? 'Drop your file here' : 'Drag & drop or click to browse'}
                    </p>
                    <span className="text-sm text-muted-foreground block">
                      Supports <Badge variant="secondary" className="mx-1 font-mono text-[10px]">.csv</Badge>
                      <Badge variant="secondary" className="mx-1 font-mono text-[10px]">.xlsx</Badge>
                      <Badge variant="secondary" className="mx-1 font-mono text-[10px]">.json</Badge>
                    </span>
                    <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.json" title="Upload questions file" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} className="hidden" />
                  </div>
                )}

                {importTab === 'json' && (
                  <div className="space-y-4">
                    <Textarea
                      value={rawJson}
                      onChange={e => setRawJson(e.target.value)}
                      placeholder={'[\n  {\n    "question_text": "Your question here?",\n    "options": ["A", "B", "C", "D"],\n    "correct_answer": "B",\n    "marks": 1\n  }\n]'}
                      className="font-mono text-sm min-h-[250px] rounded-xl bg-neutral-950 text-emerald-400 border-neutral-800 placeholder:text-neutral-600"
                    />
                    <Button onClick={handleParseJson} disabled={!testId || !rawJson.trim()} className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white gap-2 h-11 px-6">
                      <FileJson className="h-4 w-4" /> Parse JSON
                    </Button>
                  </div>
                )}

                {importTab === 'templates' && (
                  <div className="grid sm:grid-cols-3 gap-5">
                    <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border dark:border-white/5 space-y-4">
                      <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center border border-green-200 dark:border-green-800">
                        <FileSpreadsheet className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1D1D1F] dark:text-white mb-1">CSV Template</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">Opens in Excel or Google Sheets. Fill in rows, save, and upload.</p>
                      </div>
                      <Button onClick={downloadCSV} variant="outline" size="sm" className="rounded-lg gap-2 w-full">
                        <Download className="h-3.5 w-3.5" /> Download .csv
                      </Button>
                    </div>
                    <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border dark:border-white/5 space-y-4">
                      <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border border-blue-200 dark:border-blue-800">
                        <FileJson className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1D1D1F] dark:text-white mb-1">JSON Template</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">Structured format perfect for programmatic generation.</p>
                      </div>
                      <Button onClick={downloadJSON} variant="outline" size="sm" className="rounded-lg gap-2 w-full">
                        <Download className="h-3.5 w-3.5" /> Download .json
                      </Button>
                    </div>
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 border border-violet-200 dark:border-violet-800/50 space-y-4">
                      <div className="h-12 w-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center border border-violet-200 dark:border-violet-800">
                        <Sparkles className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-violet-900 dark:text-violet-300 mb-1">Copy for AI ✨</h4>
                        <p className="text-xs text-violet-800/70 dark:text-violet-400/70 leading-relaxed">
                          Copies a prompt + template to your clipboard. Paste it into ChatGPT or Gemini to auto-generate questions.
                        </p>
                      </div>
                      <Button onClick={copyForAI} size="sm" className="rounded-lg gap-2 w-full bg-violet-600 hover:bg-violet-700 text-white">
                        <Copy className="h-3.5 w-3.5" /> Copy AI Prompt
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 2: Review & Edit                                         */}
      {/* ============================================================ */}
      {step === 2 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Stats Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="text-sm px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> {validCount} valid
            </Badge>
            {errorCount > 0 && (
              <Badge className="text-sm px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0">
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> {errorCount} errors
              </Badge>
            )}
            {duplicateCount > 0 && (
              <Badge className="text-sm px-3 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-0">
                <CircleAlert className="h-3.5 w-3.5 mr-1.5" /> {duplicateCount} duplicates
              </Badge>
            )}
            {parseErrors.length > 0 && (
              <Badge className="text-sm px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> {parseErrors.length} skipped rows
              </Badge>
            )}
            <span className="text-sm font-bold text-foreground ml-auto">{questions.length} total questions</span>
          </div>

          {/* Batch History */}
          {batchLog.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Batches:</span>
              {batchLog.map((b, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] font-mono">
                  Batch {i + 1}: {b.count} questions {b.errors > 0 ? `(${b.errors} errors)` : '✓'}
                </Badge>
              ))}
            </div>
          )}

          {/* Parse errors (skipped rows) */}
          {parseErrors.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-2">Rows skipped during parsing</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {parseErrors.map((e, i) => (
                  <p key={i} className="text-xs text-amber-800 dark:text-amber-400">
                    <span className="font-mono font-bold">Row {e.row}:</span> {e.msg}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Add More Panel */}
          <div className="border rounded-2xl overflow-hidden bg-white dark:bg-black/40">
            <button
              onClick={() => setAddMoreOpen(!addMoreOpen)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Plus className="h-4 w-4 text-violet-500" />
                <span className="text-sm font-bold text-[#1D1D1F] dark:text-white">Add More Questions</span>
                <span className="text-xs text-muted-foreground">(paste another batch of JSON)</span>
              </div>
              {addMoreOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {addMoreOpen && (
              <div className="border-t p-5 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <Textarea
                  value={addMoreJson}
                  onChange={e => setAddMoreJson(e.target.value)}
                  placeholder={'Paste your next batch of JSON questions here...\n[\n  { "question_text": "...", "options": [...], "correct_answer": "B" }\n]'}
                  className="font-mono text-sm min-h-[150px] rounded-xl bg-neutral-950 text-emerald-400 border-neutral-800 placeholder:text-neutral-600"
                />
                <div className="flex items-center gap-3">
                  <Button onClick={handleAddMore} disabled={!addMoreJson.trim()} className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white gap-2 h-10 px-5">
                    <Plus className="h-4 w-4" /> Add {addMoreJson.trim() ? 'Batch' : ''}
                  </Button>
                  <Button onClick={copyForAI} variant="outline" size="sm" className="rounded-lg gap-2">
                    <Copy className="h-3.5 w-3.5" /> Copy AI Prompt
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Preview Table with Toolbar */}
          <div className="border rounded-2xl overflow-hidden bg-white dark:bg-black/40">
            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-neutral-900 border-b">
              <div className="flex items-center gap-3 w-full lg:max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <Select value={filterMode} onValueChange={(v: 'all' | 'valid' | 'errors' | 'duplicates') => setFilterMode(v)}>
                  <SelectTrigger className="w-[140px] h-9 shrink-0">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ({questions.length})</SelectItem>
                    <SelectItem value="valid">✅ Valid ({validCount})</SelectItem>
                    <SelectItem value="errors">❌ Errors ({errorCount})</SelectItem>
                    <SelectItem value="duplicates">⚠ Dups ({duplicateCount})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 hide-scrollbar">
                {selectedRows.length > 0 ? (
                  <>
                    <Select onValueChange={v => bulkSetDifficulty(v)}>
                      <SelectTrigger className="h-9 w-[130px] shrink-0">
                        <SelectValue placeholder="Set Diff..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select onValueChange={v => bulkSetMarks(Number(v))}>
                      <SelectTrigger className="h-9 w-[130px] shrink-0">
                        <SelectValue placeholder="Set Marks..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Mark</SelectItem>
                        <SelectItem value="2">2 Marks</SelectItem>
                        <SelectItem value="4">4 Marks</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={deleteSelected} variant="destructive" size="sm" className="h-9 whitespace-nowrap gap-1.5 shrink-0 px-3">
                      <Trash2 className="h-4 w-4" /> Delete ({selectedRows.length})
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={exportJSON} variant="outline" size="sm" className="h-9 gap-1.5 whitespace-nowrap bg-white dark:bg-black">
                      <Download className="h-4 w-4 text-muted-foreground" /> Export
                    </Button>
                    <div className="flex items-center mx-1 border-r border-l px-1 h-6">
                      <Button onClick={undo} disabled={historyIdx.current <= 0} variant="ghost" size="sm" className="h-8 w-8 p-0"><Undo className="h-4 w-4" /></Button>
                      <Button onClick={redo} disabled={historyIdx.current >= history.current.length - 1} variant="ghost" size="sm" className="h-8 w-8 p-0"><Redo className="h-4 w-4" /></Button>
                    </div>
                    <Button
                      onClick={() => setIsCompact(!isCompact)}
                      variant="outline"
                      size="sm"
                      title={isCompact ? "Switch to comfortable view" : "Switch to compact view"}
                      className="h-9 w-9 p-0 shrink-0 bg-white dark:bg-black"
                    >
                      {isCompact ? <LayoutList className="h-4 w-4 text-muted-foreground" /> : <LayoutGrid className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="overflow-x-auto h-[600px] overflow-y-auto relative outline-none hide-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-20 shadow-sm">
                  <tr className="bg-neutral-50 dark:bg-neutral-900 border-b">
                    <th className="px-4 py-3 w-10 text-center">
                      <input
                        type="checkbox"
                        title="Select all rows"
                        aria-label="Select all rows"
                        className="cursor-pointer rounded border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 accent-violet-600"
                        checked={displayedQuestions.length > 0 && selectedRows.length === displayedQuestions.length}
                        onChange={toggleAllSelection}
                      />
                    </th>
                    <th className="text-left px-2 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground w-12">#</th>
                    <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground min-w-[200px]">Question</th>
                    <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">A</th>
                    <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">B</th>
                    <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">C</th>
                    <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">D</th>
                    <th className="text-center px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground w-8">Ans</th>
                    <th className="text-center px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground w-12">Marks</th>
                    <th className="text-center px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground w-12">Diff</th>
                    <th className="text-center px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground w-10" />
                  </tr>
                </thead>
                <tbody>
                  {paginatedQuestions.map((q, idx) => (
                    <React.Fragment key={q.id}>
                      <tr
                        id={`q-row-${idx + 1}`}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(idx + (page - 1) * pageSize)); setDraggedIdx(idx + (page - 1) * pageSize) }}
                        onDragOver={(e) => { e.preventDefault() }}
                        onDrop={(e) => {
                          e.preventDefault()
                          const targetIdx = idx + (page - 1) * pageSize
                          if (draggedIdx === null || draggedIdx === targetIdx) return
                          setQuestions(prev => {
                            const arr = [...prev]
                            const item = arr.splice(draggedIdx, 1)[0]
                            arr.splice(targetIdx, 0, item)
                            return arr
                          })
                          setDraggedIdx(null)
                        }}
                        className={`border-b transition-colors cursor-move ${draggedIdx === idx + (page - 1) * pageSize ? 'opacity-50' : ''} ${selectedRows.includes(q.id) ? 'bg-violet-50/50 dark:bg-violet-900/10' : q.duplicateOf ? 'bg-orange-50/50 dark:bg-orange-900/5' : !q.valid ? 'bg-red-50/50 dark:bg-red-900/5' : 'bg-white dark:bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900/30'}`}
                      >
                        <td className={`px-4 text-center ${isCompact ? 'py-1.5' : 'py-3'}`}>
                          <div className="flex items-center gap-1.5 justify-center">
                            <GripVertical className="h-3 w-3 text-neutral-300 dark:text-neutral-700 cursor-grab" />
                            <input
                              type="checkbox"
                              title="Select row"
                              aria-label="Select row"
                              className="cursor-pointer rounded border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 accent-violet-600"
                              checked={selectedRows.includes(q.id)}
                              onChange={() => toggleRowSelection(q.id)}
                            />
                          </div>
                        </td>
                        <td className={`px-2 font-mono text-muted-foreground flex flex-col items-start gap-1 ${isCompact ? 'py-1.5 text-[10px]' : 'py-3 text-xs'}`}>
                          <button onClick={() => setExpandedRow(expandedRow === q.id ? null : q.id)} className="hover:text-violet-600 transition-colors" title="Expand">
                            {idx + 1 + (page - 1) * pageSize}
                          </button>
                          {(() => {
                            let s = 0;
                            if (q.question_text.length > 20) s++
                            if (q.options.every(o => o.text.length > 2)) s++
                            if (q.explanation && q.explanation.length > 10) s++
                            if (q.difficulty) s++
                            return s >= 3 ? <div title="High Quality" className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]" /> :
                              s >= 2 ? <div title="Medium Quality" className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.5)]" /> :
                                <div title="Low Quality" className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
                          })()}
                        </td>
                        {/* Question text + duplicate warning */}
                        <td className={`px-4 max-w-[300px] ${isCompact ? 'py-1.5 text-xs' : 'py-3'}`}>
                          <div className="flex items-start gap-1.5">
                            {q.duplicateOf && (
                              <button onClick={() => document.getElementById(`q-row-${q.duplicateOf}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 hover:bg-orange-200 transition-colors shrink-0 mt-0.5">⚠ Dup of Q{q.duplicateOf}</button>
                            )}
                            {editingCell?.qId === q.id && editingCell.field === 'question_text' ? (
                              <Input ref={editRef} value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null) }} className="h-8 text-xs rounded-lg flex-1" />
                            ) : (
                              <span onClick={() => startEdit(q.id, 'question_text', q.question_text)} className="cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-500/10 px-1.5 py-0.5 rounded-md text-xs block truncate flex-1">{q.question_text}</span>
                            )}
                          </div>
                        </td>
                        {/* Options — click option to toggle correct */}
                        {[0, 1, 2, 3].map(oi => (
                          <td key={oi} className={`px-4 max-w-[120px] ${isCompact ? 'py-1.5' : 'py-3'}`}>
                            {q.options[oi] ? (
                              editingCell?.qId === q.id && editingCell.field === `option_${oi}` ? (
                                <Input ref={editRef} value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null) }} className="h-8 text-xs rounded-lg" />
                              ) : (
                                <span
                                  onClick={() => startEdit(q.id, `option_${oi}`, q.options[oi].text)}
                                  className={`cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-500/10 px-1.5 py-0.5 rounded-md text-xs block truncate ${q.options[oi].is_correct ? 'font-bold text-emerald-700 dark:text-emerald-400' : ''}`}
                                >
                                  {q.options[oi].text}
                                </span>
                              )
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                        ))}
                        {/* Correct */}
                        <td className={`px-4 text-center ${isCompact ? 'py-1.5' : 'py-3'}`}>
                          <Badge className={`font-mono border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 ${isCompact ? 'text-[9px]' : 'text-[10px]'}`}>{correctLabel(q.options)}</Badge>
                        </td>
                        {/* Marks */}
                        <td className={`px-4 text-center ${isCompact ? 'py-1.5' : 'py-3'}`}>
                          {editingCell?.qId === q.id && editingCell.field === 'marks' ? (
                            <Input ref={editRef} value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null) }} className="h-8 text-xs rounded-lg w-14 text-center" type="number" />
                          ) : (
                            <span onClick={() => startEdit(q.id, 'marks', String(q.marks))} className="cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-500/10 px-1.5 py-0.5 rounded-md text-xs font-mono">{q.marks}</span>
                          )}
                        </td>
                        {/* Difficulty */}
                        <td className={`px-4 text-center ${isCompact ? 'py-1.5' : 'py-3'}`}>
                          <Badge variant="secondary" className={`text-[9px] font-bold uppercase ${q.difficulty === 'Easy' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            q.difficulty === 'Medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                              q.difficulty === 'Hard' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                ''
                            }`}>{q.difficulty || '—'}</Badge>
                        </td>
                        {/* Delete */}
                        <td className={`px-4 text-center ${isCompact ? 'py-1.5' : 'py-3'}`}>
                          <button onClick={() => deleteRow(q.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors text-muted-foreground hover:text-red-600" title="Remove row">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                      {/* Expanded Row — full question details */}
                      {expandedRow === q.id && (
                        <tr className="border-b">
                          <td colSpan={11} className="p-0">
                            <div className="p-5 bg-neutral-50/50 dark:bg-neutral-900/20 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                              <div>
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Full Question</Label>
                                {editingCell?.qId === q.id && editingCell.field === 'question_text' ? (
                                  <Input ref={editRef} value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null) }} className="text-sm rounded-lg" />
                                ) : (
                                  <p onClick={() => startEdit(q.id, 'question_text', q.question_text)} className="text-sm cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-500/10 px-2 py-1.5 rounded-lg">{q.question_text}</p>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {q.options.map((opt, oi) => (
                                  <div
                                    key={oi}
                                    draggable
                                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(oi)); setDraggedOpt({ qId: q.id, idx: oi }) }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                      e.preventDefault()
                                      if (!draggedOpt || draggedOpt.qId !== q.id || draggedOpt.idx === oi) return
                                      setQuestions(prev => prev.map(oldQ => {
                                        if (oldQ.id !== q.id) return oldQ
                                        const newOpts = [...oldQ.options]
                                        const moved = newOpts.splice(draggedOpt.idx, 1)[0]
                                        newOpts.splice(oi, 0, moved)
                                        return { ...oldQ, options: newOpts }
                                      }))
                                      setDraggedOpt(null)
                                    }}
                                    onClick={() => toggleCorrect(q.id, oi)}
                                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-move transition-all ${draggedOpt?.qId === q.id && draggedOpt?.idx === oi ? 'opacity-50' : ''
                                      } ${opt.is_correct
                                        ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
                                        : 'border-neutral-200 dark:border-neutral-800 hover:border-violet-300 hover:bg-violet-50/30 dark:hover:border-violet-700 dark:hover:bg-violet-900/10'
                                      }`}
                                    title="Click to toggle correct | Drag to reorder"
                                  >
                                    <GripVertical className="h-4 w-4 text-neutral-400 group-hover:text-neutral-500 cursor-grab shrink-0 -ml-1" />
                                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${opt.is_correct ? 'bg-emerald-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-muted-foreground'
                                      }`}>
                                      {String.fromCharCode(65 + oi)}
                                    </div>
                                    <span className={`text-sm flex-1 ${opt.is_correct ? 'font-semibold text-emerald-800 dark:text-emerald-300' : ''}`}>{opt.text}</span>
                                    {opt.is_correct && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
                                  </div>
                                ))}
                              </div>
                              {q.explanation && (
                                <div>
                                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Explanation</Label>
                                  {editingCell?.qId === q.id && editingCell.field === 'explanation' ? (
                                    <Input ref={editRef} value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null) }} className="text-sm rounded-lg" />
                                  ) : (
                                    <p onClick={() => startEdit(q.id, 'explanation', q.explanation)} className="text-sm text-muted-foreground cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-500/10 px-2 py-1.5 rounded-lg">{q.explanation}</p>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Marks: <strong className="text-foreground">{q.marks}</strong></span>
                                <span>Neg: <strong className="text-foreground">{q.negative_marks}</strong></span>
                                <span>Difficulty: <strong className="text-foreground">{q.difficulty || '—'}</strong></span>
                                {q.batch && <Badge variant="secondary" className="text-[10px]">Batch {q.batch}</Badge>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-neutral-50/50 dark:bg-neutral-900/50 border-t">
                <span className="text-xs text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, displayedQuestions.length)} of {displayedQuestions.length} entries
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 px-3">
                    Previous
                  </Button>
                  <span className="text-xs font-bold text-foreground mx-2">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8 px-3">
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-2">
            <Button onClick={() => setStep(1)} variant="outline" className="rounded-xl gap-2 h-11">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={handleUpload} disabled={isUploading || validCount === 0} className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white gap-2 h-11 px-8">
              {isUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><UploadCloud className="h-4 w-4" /> Upload {validCount} Questions</>}
            </Button>
          </div>
        </div>
      )
      }

      {/* ============================================================ */}
      {/* STEP 3: Upload Report                                         */}
      {/* ============================================================ */}
      {
        step === 3 && uploadResult && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border shadow-none rounded-3xl overflow-hidden">
              <div className={`p-8 sm:p-12 text-center ${uploadResult.inserted > 0 ? 'bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-900/10 dark:to-transparent' : 'bg-gradient-to-b from-red-50 to-white dark:from-red-900/10 dark:to-transparent'}`}>
                <div className={`h-20 w-20 mx-auto rounded-3xl flex items-center justify-center mb-6 shadow-xl ${uploadResult.inserted > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}>
                  {uploadResult.inserted > 0 ? <CheckCircle className="h-10 w-10 text-white" /> : <XIcon className="h-10 w-10 text-white" />}
                </div>
                <h3 className="text-3xl font-extrabold text-[#1D1D1F] dark:text-white mb-2">
                  {uploadResult.inserted > 0 ? 'Upload Complete!' : 'Upload Failed'}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {uploadResult.inserted > 0
                    ? `Successfully inserted ${uploadResult.inserted} question${uploadResult.inserted > 1 ? 's' : ''} into the test.`
                    : 'No questions were inserted. Check the error details below.'}
                </p>
              </div>

              <CardContent className="p-6 sm:p-8 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <div className="text-center p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900">
                    <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{uploadResult.inserted}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-500 mt-1">Inserted</p>
                  </div>
                  <div className="text-center p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900">
                    <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">{uploadResult.skipped}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-500 mt-1">Skipped</p>
                  </div>
                </div>

                {/* Errors */}
                {uploadResult.rowIssues.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-red-900 dark:text-red-300 mb-2">Failed Rows</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {uploadResult.rowIssues.map((issue, i) => (
                        <p key={i} className="text-xs text-red-800 dark:text-red-400">
                          <span className="font-mono font-bold">Row {issue.row}:</span> {issue.msg}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <Button onClick={resetWizard} variant="outline" className="rounded-xl gap-2 h-11">
                    <RotateCcw className="h-4 w-4" /> Upload More
                  </Button>
                  <Button asChild className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white gap-2 h-11">
                    <a href="/dashboard/questions/bulk">
                      <ExternalLink className="h-4 w-4" /> View in Bulk Manager
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      }
    </div >
  )
}
