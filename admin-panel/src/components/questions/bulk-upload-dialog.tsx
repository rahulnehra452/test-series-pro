import React, { useState, useCallback } from 'react'
import { UploadCloud, FileType, CheckCircle, AlertTriangle, Loader2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { bulkCreateQuestions } from '@/actions/question-actions'
import { QuestionFormValues } from '@/lib/validations/question'

interface BulkUploadProps {
  tests: { id: string; title: string }[]
  onSuccess: () => void
}

type UploadRow = Record<string, unknown>

function toNumberOrFallback(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function getTextValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

function parseCorrectIndex(value: unknown, optionCount = 4): number {
  if (typeof value === 'number' && Number.isInteger(value)) {
    if (value >= 0 && value < optionCount) return value
    if (value >= 1 && value <= optionCount) return value - 1
    return -1
  }

  if (typeof value !== 'string') return -1

  const normalized = value.trim().toUpperCase()
  if (!normalized) return -1

  if (normalized === 'A') return 0
  if (normalized === 'B') return 1
  if (normalized === 'C') return 2
  if (normalized === 'D') return 3

  const numeric = Number(normalized)
  if (Number.isInteger(numeric)) {
    if (numeric >= 0 && numeric < optionCount) return numeric
    if (numeric >= 1 && numeric <= optionCount) return numeric - 1
  }

  return -1
}

function normalizeOptionsFromArray(row: UploadRow) {
  if (!Array.isArray(row.options)) return null

  if (row.options.length < 2) {
    return { error: 'At least 2 options are required.' }
  }

  if (typeof row.options[0] === 'string') {
    const texts = row.options
      .map((opt) => (typeof opt === 'string' ? opt.trim() : ''))
      .filter(Boolean)

    if (texts.length < 2) {
      return { error: 'At least 2 non-empty option texts are required.' }
    }

    const correctIndex = parseCorrectIndex(
      row.correct_answer ?? row.correctAnswer ?? row.CorrectOption ?? row.correctOption,
      texts.length
    )

    if (correctIndex < 0 || correctIndex >= texts.length) {
      return { error: 'Invalid correct answer index/label for options array.' }
    }

    return {
      options: texts.map((text, idx) => ({
        text,
        is_correct: idx === correctIndex,
      })),
    }
  }

  if (typeof row.options[0] === 'object' && row.options[0] !== null) {
    const optionObjects = row.options as UploadRow[]
    const normalized = optionObjects.map((opt) => ({
      text: getTextValue(opt.text, opt.option, opt.value),
      is_correct: Boolean(opt.is_correct ?? opt.isCorrect),
    }))

    if (normalized.some((opt) => !opt.text)) {
      return { error: 'Option object is missing text.' }
    }

    const correctCount = normalized.filter((opt) => opt.is_correct).length
    if (correctCount !== 1) {
      return { error: 'Exactly one option must be marked as correct.' }
    }

    return { options: normalized }
  }

  return { error: 'Unsupported options format in JSON.' }
}

function normalizeOptionsFromLegacyColumns(row: UploadRow) {
  const optionA = getTextValue(row.OptionA, row.optionA)
  const optionB = getTextValue(row.OptionB, row.optionB)
  const optionC = getTextValue(row.OptionC, row.optionC)
  const optionD = getTextValue(row.OptionD, row.optionD)

  if (!optionA || !optionB || !optionC || !optionD) return null

  const correctIndex = parseCorrectIndex(
    row.CorrectOption ?? row.correctOption ?? row.correct_answer ?? row.correctAnswer,
    4
  )

  if (correctIndex < 0 || correctIndex > 3) {
    return { error: 'Invalid CorrectOption. Use A/B/C/D or 1-4 (or 0-3).' }
  }

  const options = [optionA, optionB, optionC, optionD].map((text, idx) => ({
    text,
    is_correct: idx === correctIndex,
  }))

  return { options }
}

function normalizeJsonRows(payload: unknown): UploadRow[] | null {
  if (Array.isArray(payload)) return payload as UploadRow[]
  if (
    payload &&
    typeof payload === 'object' &&
    'questions' in payload &&
    Array.isArray((payload as { questions: unknown }).questions)
  ) {
    return (payload as { questions: UploadRow[] }).questions
  }
  return null
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Papa: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    XLSX: any;
  }
}

export function BulkUploadDialog({ tests, onSuccess }: BulkUploadProps) {
  const [open, setOpen] = useState(false)
  const [testId, setTestId] = useState<string>('')
  const [parsedData, setParsedData] = useState<QuestionFormValues[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [errors, setErrors] = useState<{ row: number, msg: string }[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [inputMode, setInputMode] = useState<'file' | 'json'>('file')
  const [rawJsonText, setRawJsonText] = useState('')
  const [needsReview, setNeedsReview] = useState(false)
  const [tagInput, setTagInput] = useState('')

  const handleParseRawJson = () => {
    if (!testId) {
      toast.error("Please select a test first")
      return
    }
    if (!rawJsonText.trim()) {
      toast.error("Please paste JSON data")
      return
    }
    try {
      const cleanedText = rawJsonText.trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      const parsed = JSON.parse(cleanedText)
      const rows = normalizeJsonRows(parsed)
      if (!rows) {
        toast.error("Invalid JSON format. Expecting an array of questions.")
        return
      }
      validateAndFormatData(rows)
    } catch {
      toast.error("Invalid JSON syntax. Please check for trailing commas or missing quotes.")
    }
  }

  const processFile = (file: File) => {
    if (!testId) {
      toast.error("Please select a test first")
      return
    }

    const fileName = file.name.toLowerCase()
    const isCsv = fileName.endsWith('.csv')
    const isXlsx = fileName.endsWith('.xlsx')
    const isJson = fileName.endsWith('.json')

    if (!isCsv && !isXlsx && !isJson) {
      toast.error("Unsupported file type. Use CSV, XLSX, or JSON.")
      return
    }

    if ((isCsv || isXlsx) && (!window.Papa || !window.XLSX)) {
      toast.error("Required libraries are still loading, please wait and try again.")
      return
    }

    const fileReader = new FileReader()

    fileReader.onload = async (e) => {
      try {
        const data = e.target?.result
        let rawJson: UploadRow[] = []

        if (isCsv) {
          const csvResult = window.Papa.parse(data as string, { header: true, skipEmptyLines: true })
          rawJson = csvResult.data
        } else if (isXlsx) {
          const workbook = window.XLSX.read(data, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          rawJson = window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
        } else if (isJson) {
          const parsed = JSON.parse(data as string) as unknown
          const rows = normalizeJsonRows(parsed)
          if (!rows) {
            toast.error("Invalid JSON. Use an array of rows or an object with a 'questions' array.")
            return
          }
          rawJson = rows
        } else {
          toast.error("Unsupported file type")
          return
        }

        validateAndFormatData(rawJson)

      } catch {
        toast.error("Error reading file")
      }
    }

    if (isCsv || isJson) {
      fileReader.readAsText(file)
    } else {
      fileReader.readAsBinaryString(file)
    }
  }

  const validateAndFormatData = (data: UploadRow[]) => {
    const formatted: QuestionFormValues[] = []
    const errs: { row: number, msg: string }[] = []

    data.forEach((row, index) => {
      const rowNum = index + 1
      if (!row || typeof row !== 'object') {
        errs.push({ row: rowNum, msg: "Row is not a valid object." })
        return
      }

      const questionText = getTextValue(
        row.Question,
        row.question,
        row.question_text,
        row.questionText,
      )
      if (!questionText) {
        errs.push({ row: rowNum, msg: "Missing question text (Question/question_text)." })
        return
      }

      const normalizedFromOptions = normalizeOptionsFromArray(row)
      const normalizedFromColumns = normalizeOptionsFromLegacyColumns(row)
      const normalizedOptions = normalizedFromOptions ?? normalizedFromColumns

      if (!normalizedOptions) {
        errs.push({
          row: rowNum,
          msg: "Missing options. Provide 'options' array or OptionA/OptionB/OptionC/OptionD.",
        })
        return
      }

      if ('error' in normalizedOptions) {
        errs.push({ row: rowNum, msg: normalizedOptions.error || "Invalid options format." })
        return
      }

      // Parse custom tags
      const userTags = tagInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
      if (needsReview) userTags.push("needs_review")
      const combinedTags = Array.from(new Set(userTags))

      formatted.push({
        test_id: testId,
        question_text: questionText,
        marks: toNumberOrFallback(row.Marks ?? row.marks, 1),
        negative_marks: toNumberOrFallback(row.NegativeMarks ?? row.negative_marks, 0),
        explanation: getTextValue(row.Explanation, row.explanation),
        options: normalizedOptions.options,
        tags: combinedTags,
      })
    })

    setErrors(errs)
    setParsedData(formatted)
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId])

  const handleUpload = async () => {
    if (parsedData.length === 0) return
    setIsUploading(true)

    try {
      const res = await bulkCreateQuestions(parsedData as QuestionFormValues[])

      if (res.error) {
        toast.error(res.error)
      }

      if (Array.isArray(res.rowIssues) && res.rowIssues.length > 0) {
        setErrors(res.rowIssues.map((issue) => ({
          row: issue.row,
          msg: issue.msg,
        })))
      }

      const inserted = typeof res.inserted === 'number' ? res.inserted : 0
      const skipped = typeof res.skipped === 'number' ? res.skipped : 0

      if (inserted > 0) {
        toast.success(
          skipped > 0
            ? `Uploaded ${inserted} questions. Skipped ${skipped}.`
            : `Uploaded ${inserted} questions successfully.`
        )
        setOpen(false)
        onSuccess()
      } else if (!res.error) {
        toast.error("No questions were uploaded.")
      }
    } catch {
      toast.error("An error occurred during bulk upload")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v)
      if (!v) { setParsedData([]); setErrors([]); setRawJsonText(''); }
    }}>
      <DialogTrigger asChild>
        <Button variant={"outline"} className="border-[#0066CC] text-[#0066CC] hover:bg-[#0066CC]/5">
          <UploadCloud className="mr-2 h-4 w-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col overflow-hidden bg-white/80 dark:bg-background/80 backdrop-blur-3xl border-white/20">
        <DialogHeader>
          <DialogTitle className="text-xl">Bulk Upload Questions</DialogTitle>
          <DialogDescription>
            Download the <a href="data:text/csv;charset=utf-8,Question,Marks,NegativeMarks,Explanation,OptionA,OptionB,OptionC,OptionD,CorrectOption%0AWhat%20is%20the%20capital%20of%20France%3F,1,0.25,Paris%20is%20the%20capital.,London,Paris,Berlin,Rome,B" download="Questions_Template.csv" className="text-blue-500 underline font-medium hover:text-blue-600 transition-colors">Template CSV</a> and upload questions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 hide-scrollbar py-2 px-1">
          {/* Step 1: Select Test */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">1. Select Destination Test</label>
            <Select onValueChange={setTestId} value={testId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a test" />
              </SelectTrigger>
              <SelectContent>
                {tests.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional Details Settings */}
          <div className="space-y-3 bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-black/5 dark:border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Optional Upload Settings</h4>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block">Assign Tags (comma separated)</label>
                <Input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  placeholder="e.g. history, mock_test, difficult"
                  className="h-8 text-xs bg-white dark:bg-[#1C1C1E] shadow-sm border-black/10 dark:border-white/10"
                />
              </div>
              <div className="flex items-center gap-2 mt-2 sm:mt-5 shrink-0 bg-white dark:bg-[#1C1C1E] px-3 h-8 rounded-md border border-black/10 dark:border-white/10 shadow-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={() => setNeedsReview(!needsReview)}>
                <input
                  id="needs_review_checkbox"
                  type="checkbox"
                  checked={needsReview}
                  onChange={e => setNeedsReview(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 pointer-events-none"
                  aria-label="Flag as needs review"
                />
                <label htmlFor="needs_review_checkbox" className="text-[11px] font-semibold cursor-pointer">
                  Flag as &quot;Needs Review&quot;
                </label>
              </div>
            </div>
          </div>

          {/* Step 2: Input Method */}
          {parsedData.length === 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">2. Provide Data</label>
                <div className="bg-muted/50 p-1 rounded-lg flex items-center border border-black/5 dark:border-white/5">
                  <button onClick={() => setInputMode('file')} className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${inputMode === 'file' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-[#1D1D1F] dark:text-white' : 'text-muted-foreground hover:text-[#1D1D1F] dark:hover:text-white'}`}>File Upload</button>
                  <button onClick={() => setInputMode('json')} className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${inputMode === 'json' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-[#1D1D1F] dark:text-white' : 'text-muted-foreground hover:text-[#1D1D1F] dark:hover:text-white'}`}>Raw JSON Prompt</button>
                </div>
              </div>

              {inputMode === 'file' ? (
                <div
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'} ${!testId && 'opacity-50 pointer-events-none'}`}
                >
                  <input
                    id="file-upload"
                    type="file"
                    title="Upload CSV, XLSX, or JSON file"
                    accept=".csv,.xlsx,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                  <FileType className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium text-center">
                    Drag & drop your file here, or click to select
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports CSV, XLSX, and JSON
                  </p>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Paste JSON output from ChatGPT/Claude:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] gap-1 px-2 font-bold bg-white dark:bg-black shadow-sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`Generate 10 multiple-choice questions about [TOPIC]. Return STRICTLY a JSON array matching this exact schema:\n[{"question_text": "...", "marks": 1, "negative_marks": 0.25, "explanation": "...", "options": [{"text": "...", "is_correct": true}, {"text": "...", "is_correct": false}, {"text": "...", "is_correct": false}, {"text": "...", "is_correct": false}]}]`);
                        toast.success("Prompt copied to clipboard!");
                      }}
                    >
                      <Copy className="h-3 w-3" /> Copy LLM Prompt
                    </Button>
                  </div>
                  <Textarea
                    value={rawJsonText}
                    onChange={(e) => setRawJsonText(e.target.value)}
                    placeholder="Paste your JSON array from LLM prompts here..."
                    className="h-44 font-mono text-xs dark:bg-black/20 resize-none border-black/10 dark:border-white/10"
                    spellCheck={false}
                  />
                  <Button
                    onClick={handleParseRawJson}
                    disabled={!testId || !rawJsonText.trim()}
                    variant="secondary"
                    className="w-full font-bold bg-[#0066CC]/10 text-[#0066CC] hover:bg-[#0066CC]/20 dark:bg-[#0066CC]/20 dark:text-[#5AC8FA] dark:hover:bg-[#0066CC]/30 border-none"
                  >
                    Parse JSON Data
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
              {/* Preview Section */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Preview: {parsedData.length} Valid Questions found
                </h3>
                <Button variant="ghost" size="sm" onClick={() => { setParsedData([]); setErrors([]) }}>
                  Remove File
                </Button>
              </div>

              {errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-xl p-4 space-y-2">
                  <h4 className="flex items-center text-red-600 text-sm font-bold">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    {errors.length} Errors Found (These rows will be skipped)
                  </h4>
                  <ul className="text-xs text-red-500 space-y-1 max-h-32 overflow-y-auto">
                    {errors.map((e, i) => (
                      <li key={i}>Row {e.row}: {e.msg}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Grid Preview */}
              <div className="border border-black/5 dark:border-white/5 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 font-medium">Question</th>
                      <th className="px-3 py-2 font-medium">Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {parsedData.slice(0, 10).map((q, i) => (
                      <tr key={i} className="bg-white/50 dark:bg-background/50">
                        <td className="px-3 py-2 truncate max-w-[200px]" title={q.question_text}>{q.question_text}</td>
                        <td className="px-3 py-2">{q.marks} ({q.negative_marks})</td>
                      </tr>
                    ))}
                    {parsedData.length > 10 && (
                      <tr>
                        <td colSpan={2} className="px-3 py-2 text-center text-muted-foreground italic bg-muted/20">
                          + {parsedData.length - 10} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        <div className="pt-4 border-t mt-auto flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={parsedData.length === 0 || isUploading} onClick={handleUpload}>
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? 'Uploading...' : `Upload ${parsedData.length} Questions`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
