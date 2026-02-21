import React, { useState, useCallback } from 'react'
import { UploadCloud, FileType, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { createQuestion } from '@/actions/question-actions'
import { QuestionFormValues } from '@/lib/validations/question'

interface BulkUploadProps {
  tests: { id: string; title: string }[]
  onSuccess: () => void
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [parsedData, setParsedData] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [errors, setErrors] = useState<{ row: number, msg: string }[]>([])
  const [isDragActive, setIsDragActive] = useState(false)

  const processFile = (file: File) => {
    if (!testId) {
      toast.error("Please select a test first")
      return
    }

    if (!window.Papa || !window.XLSX) {
      toast.error("Required libraries are still loading, please wait and try again.")
      return
    }

    const fileReader = new FileReader()

    fileReader.onload = async (e) => {
      try {
        const data = e.target?.result
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let rawJson: any[] = []

        if (file.name.endsWith('.csv')) {
          const csvResult = window.Papa.parse(data as string, { header: true, skipEmptyLines: true })
          rawJson = csvResult.data
        } else if (file.name.endsWith('.xlsx')) {
          const workbook = window.XLSX.read(data, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          rawJson = window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
        } else {
          toast.error("Unsupported file type")
          return
        }

        validateAndFormatData(rawJson)

      } catch {
        toast.error("Error reading file")
      }
    }

    if (file.name.endsWith('.csv')) {
      fileReader.readAsText(file)
    } else {
      fileReader.readAsBinaryString(file)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validateAndFormatData = (data: any[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatted: any[] = []
    const errs: { row: number, msg: string }[] = []

    data.forEach((row, index) => {
      if (!row.Question || !row.OptionA || !row.OptionB || !row.OptionC || !row.OptionD || !row.CorrectOption) {
        errs.push({ row: index + 1, msg: "Missing required columns (Question, Options A-D, or CorrectOption)" })
        return
      }

      const correctChar = String(row.CorrectOption).trim().toUpperCase()
      let correctIndex = -1
      if (correctChar === 'A') correctIndex = 0
      if (correctChar === 'B') correctIndex = 1
      if (correctChar === 'C') correctIndex = 2
      if (correctChar === 'D') correctIndex = 3

      if (correctIndex === -1) {
        errs.push({ row: index + 1, msg: `Invalid CorrectOption: ${correctChar}. Must be A, B, C, or D.` })
        return
      }

      formatted.push({
        test_id: testId,
        question_text: row.Question,
        marks: Number(row.Marks) || 1,
        negative_marks: Number(row.NegativeMarks) || 0,
        explanation: row.Explanation || "",
        options: [
          { text: row.OptionA, is_correct: correctIndex === 0 },
          { text: row.OptionB, is_correct: correctIndex === 1 },
          { text: row.OptionC, is_correct: correctIndex === 2 },
          { text: row.OptionD, is_correct: correctIndex === 3 },
        ]
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
      let successCount = 0
      for (const q of parsedData) {
        const res = await createQuestion(q as QuestionFormValues)
        if (!res.error) successCount++
      }

      toast.success(`Successfully uploaded ${successCount} questions`)
      setOpen(false)
      onSuccess()
    } catch {
      toast.error("An error occurred during bulk upload")
    } finally {
      setIsUploading(false)
      setParsedData([])
      setErrors([])
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v)
      if (!v) { setParsedData([]); setErrors([]) }
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
            Download the <a href="/template.csv" download className="text-blue-500 underline font-medium hover:text-blue-600 transition-colors">template CSV</a> and upload it here.
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

          {/* Step 2: Dropzone */}
          {parsedData.length === 0 ? (
            <div className="space-y-2">
              <label className="text-sm font-semibold">2. Upload File (.csv, .xlsx)</label>
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
                  title="Upload CSV or XLSX file"
                  accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <FileType className="h-10 w-10 text-muted-foreground mb-4" />
                <p className="text-sm font-medium text-center">
                  Drag & drop your file here, or click to select
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports CSV and XLSX
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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
