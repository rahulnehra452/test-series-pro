'use client'

import React, { useState, useTransition, useCallback, Fragment } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Download, Upload, Users, Database, TrendingUp, FileSpreadsheet,
  Loader2, Clock, FileText,
  Filter, Columns3, ArrowDownUp, BarChart3,
  HardDrive, CheckCircle2, AlertCircle, Trash2, Search,
  Eye, Copy, ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

type Tab = 'export' | 'import' | 'reports' | 'history' | 'backup'
type ExportFormat = 'csv' | 'json'

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'export', label: 'Export', icon: Download },
  { key: 'import', label: 'Import', icon: Upload },
  { key: 'reports', label: 'Report Builder', icon: BarChart3 },
  { key: 'history', label: 'History', icon: Clock },
  { key: 'backup', label: 'Backup', icon: HardDrive },
]

interface ExportHistoryItem {
  id: string
  type: string
  format: string
  rows: number
  size: string
  date: string
  status: 'success' | 'failed'
}

type RowRecord = Record<string, unknown>

function isRowRecord(value: unknown): value is RowRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function formatCellValue(value: unknown, column: string): string {
  if (value === null || value === undefined) return '—'
  if (column === 'created_at') {
    if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
      return format(new Date(value), 'MMM d, yyyy')
    }
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return JSON.stringify(value)
}

export default function DataCenterPage() {
  const [activeTab, setActiveTab] = useState<Tab>('export')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
            <FileSpreadsheet className="h-6 w-6 text-white" />
          </div>
          Data Center
        </h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          Export, import, generate reports, and manage backups.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-secondary/30 rounded-2xl overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${activeTab === tab.key
              ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-[#1D1D1F] dark:text-white'
              : 'text-muted-foreground hover:text-[#1D1D1F] dark:hover:text-white'
              }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'export' && <ExportTab />}
      {activeTab === 'import' && <ImportTab />}
      {activeTab === 'reports' && <ReportBuilderTab />}
      {activeTab === 'history' && <HistoryTab />}
      {activeTab === 'backup' && <BackupTab />}
    </div>
  )
}

// ──────────── EXPORT TAB ────────────

function ExportTab() {
  const [isPending, startTransition] = useTransition()
  const [activeSource, setActiveSource] = useState<string | null>(null)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv')
  const [previewData, setPreviewData] = useState<RowRecord[]>([])
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set())
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  const [history, setHistory] = useState<ExportHistoryItem[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('export_history') || '[]') } catch { return [] }
  })

  const saveHistory = (item: ExportHistoryItem) => {
    const updated = [item, ...history].slice(0, 50)
    setHistory(updated)
    localStorage.setItem('export_history', JSON.stringify(updated))
  }

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const SOURCES: Record<string, { icon: React.ComponentType<{ className?: string }>, title: string, color: string, defaultCols: string[] }> = {
    users: { icon: Users, title: 'Users', color: 'from-blue-500 to-cyan-500', defaultCols: ['id', 'full_name', 'email', 'is_pro', 'pro_plan', 'pro_expires_at', 'created_at'] },
    questions: { icon: Database, title: 'Questions', color: 'from-green-500 to-emerald-500', defaultCols: ['id', 'text', 'difficulty', 'marks', 'negative_marks', 'test_id', 'created_at'] },
    attempts: { icon: TrendingUp, title: 'Attempts', color: 'from-purple-500 to-pink-500', defaultCols: ['id', 'user_id', 'test_id', 'score', 'total_marks', 'status', 'created_at'] },
    tests: { icon: FileText, title: 'Tests', color: 'from-amber-500 to-orange-500', defaultCols: ['id', 'title', 'duration_minutes', 'total_marks', 'is_active', 'created_at'] },
  }

  const handleSelectSource = async (source: string) => {
    setActiveSource(source)
    setSelectedColumns(new Set(SOURCES[source].defaultCols))
    setPreviewData([])
    setExpandedRow(null)

    // Fetch preview data
    const { getExportPreview } = await import('@/actions/export-actions')
    const res = await getExportPreview(source === 'users' ? 'profiles' : source, [], 20)
    if (Array.isArray(res.data)) {
      const rows = (res.data as unknown[]).filter(isRowRecord)
      setPreviewData(rows)
    }
  }

  const toggleColumn = (col: string) => {
    setSelectedColumns(prev => {
      const n = new Set(prev)
      if (n.has(col)) n.delete(col)
      else n.add(col)
      return n
    })
  }

  const handleExport = () => {
    if (!activeSource || selectedColumns.size === 0) return toast.error('Select source and columns')
    startTransition(async () => {
      const { processCustomExport } = await import('@/actions/export-actions')
      const table = activeSource === 'users' ? 'profiles' : activeSource
      const res = await processCustomExport(table, Array.from(selectedColumns), exportFormat)

      if (res.error || !res.content) {
        toast.error(res.error || 'Export failed')
        saveHistory({ id: Date.now().toString(), type: activeSource, format: exportFormat, rows: 0, size: '0 KB', date: new Date().toISOString(), status: 'failed' })
      } else {
        const rows = res.content.split('\n').length || 1 // roughly
        const filename = `testkra_${activeSource}_export_${format(new Date(), 'yyyyMMdd')}`
        const mime = exportFormat === 'json' ? 'application/json' : 'text/csv;charset=utf-8;'
        downloadFile(res.content, `${filename}.${exportFormat}`, mime)
        saveHistory({ id: Date.now().toString(), type: activeSource, format: exportFormat, rows, size: `${(res.content.length / 1024).toFixed(1)} KB`, date: new Date().toISOString(), status: 'success' })
        toast.success(`Exported ${activeSource} successfully!`)
      }
    })
  }

  if (!activeSource) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {Object.entries(SOURCES).map(([key, s]) => (
          <Card key={key} className="rounded-2xl border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all group cursor-pointer" onClick={() => handleSelectSource(key)}>
            <CardContent className="p-5 flex flex-col items-center text-center space-y-3">
              <div className={`p-4 rounded-2xl bg-gradient-to-br ${s.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <s.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1D1D1F] dark:text-white capitalize">{s.title} Data</h3>
                <p className="text-[11px] text-muted-foreground mt-1">Select columns to customize export</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const allAvailableColumns = previewData.length > 0 ? Object.keys(previewData[0]) : SOURCES[activeSource].defaultCols

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
      {/* Top Banner */}
      <div className="flex items-center justify-between p-4 rounded-2xl border border-black/5 dark:border-white/5 bg-secondary/20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setActiveSource(null)}>
            <ArrowDownUp className="h-4 w-4 rotate-90" />
          </Button>
          <div>
            <h3 className="text-sm font-bold text-[#1D1D1F] dark:text-white capitalize flex items-center gap-2">
              Custom Export: {activeSource}
            </h3>
            <p className="text-[10px] text-muted-foreground">Select columns and format, then export.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-white dark:bg-[#1C1C1E] rounded-lg p-0.5 border border-black/5 dark:border-white/5">
            <button onClick={() => setExportFormat('csv')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${exportFormat === 'csv' ? 'bg-secondary text-[#1D1D1F] dark:text-white' : 'text-muted-foreground'}`}>CSV</button>
            <button onClick={() => setExportFormat('json')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${exportFormat === 'json' ? 'bg-secondary text-[#1D1D1F] dark:text-white' : 'text-muted-foreground'}`}>JSON</button>
          </div>
          <Button onClick={handleExport} disabled={isPending || selectedColumns.size === 0} className="gap-2 h-8 rounded-lg bg-[#0066CC] hover:bg-[#0052A3] text-white text-xs">
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export Now
          </Button>
        </div>
      </div>

      {/* Column Selection */}
      <Card className="rounded-2xl border-none shadow-sm overflow-hidden bg-white/50 dark:bg-black/20">
        <div className="p-3 border-b border-black/5 dark:border-white/5 bg-secondary/10 flex items-center justify-between">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Columns ({selectedColumns.size}/{allAvailableColumns.length})</Label>
          <Button variant="ghost" size="sm" className="h-6 text-[9px]" onClick={() => setSelectedColumns(new Set(selectedColumns.size === allAvailableColumns.length ? SOURCES[activeSource].defaultCols : allAvailableColumns))}>
            {selectedColumns.size === allAvailableColumns.length ? 'Reset Default' : 'Select All'}
          </Button>
        </div>
        <CardContent className="p-4 flex flex-wrap gap-1.5">
          {allAvailableColumns.map(col => (
            <button key={col} onClick={() => toggleColumn(col)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-semibold border transition-colors ${selectedColumns.has(col)
                ? 'bg-[#0066CC] border-[#0066CC] text-white'
                : 'border-black/10 dark:border-white/10 text-muted-foreground hover:bg-secondary'}`}>
              {col}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Data Preview */}
      <Card className="rounded-2xl border-none shadow-sm overflow-hidden bg-white/50 dark:bg-black/20">
        <div className="p-3 border-b border-black/5 dark:border-white/5 bg-secondary/10 flex items-center justify-between">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" /> Live Data Preview</Label>
          {activeSource === 'questions' && <span className="text-[9px] text-muted-foreground">Click a row to expand question details</span>}
        </div>
        <div className="overflow-x-auto">
          {previewData.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-[#0066CC]" />
              <p className="text-xs font-semibold">Loading preview data...</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/20">
                <tr>
                  {Array.from(selectedColumns)
                    .filter(c => !['options', 'explanation'].includes(c) || activeSource !== 'questions')
                    .map(col => (
                      <th key={col} className="p-3 font-semibold text-muted-foreground truncate max-w-[150px]">{col.replace(/_/g, ' ')}</th>
                    ))}
                  {activeSource === 'questions' && <th className="p-3 w-8"></th>}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <Fragment key={String(row.id || i)}>
                    <tr
                      className={`border-b border-black/5 dark:border-white/5 hover:bg-secondary/30 transition-colors ${activeSource === 'questions' ? 'cursor-pointer' : ''}`}
                      onClick={() => activeSource === 'questions' && setExpandedRow(expandedRow === i ? null : i)}
                    >
                      {Array.from(selectedColumns)
                        .filter(c => !['options', 'explanation'].includes(c) || activeSource !== 'questions')
                        .map(col => (
                          <td key={col} className="p-3 truncate max-w-[200px]" title={String(row[col] ?? '')}>
                            {formatCellValue(row[col], col)}
                          </td>
                        ))}
                      {activeSource === 'questions' && (
                        <td className="p-3 text-right">
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedRow === i ? 'rotate-180' : ''}`} />
                        </td>
                      )}
                    </tr>
                    {/* Expanded Content for Questions */}
                    {activeSource === 'questions' && expandedRow === i && (
                      <tr className="bg-secondary/10 border-b border-black/5 dark:border-white/5">
                        <td colSpan={selectedColumns.size + 1} className="p-4">
                          <div className="space-y-4 max-w-4xl animate-in slide-in-from-top-2">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Question Text</p>
                              <p className="text-sm font-medium text-[#1D1D1F] dark:text-white bg-white dark:bg-[#1C1C1E] p-3 rounded-xl border border-black/5 dark:border-white/5">
                                {formatCellValue(row.text, 'text')}
                              </p>
                            </div>

                            {Array.isArray(row.options) && row.options.length > 0 && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Options</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {row.options.map((opt: unknown, idx: number) => {
                                    const optText = typeof opt === 'string'
                                      ? opt
                                      : (isRowRecord(opt) && (typeof opt.text === 'string' || typeof opt.text === 'number')
                                        ? String(opt.text)
                                        : '—')
                                    return (
                                      <div key={idx} className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${row.correct_answer === idx ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400 font-medium' : 'bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-muted-foreground'}`}>
                                        <span className="shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-full bg-secondary text-[10px] font-bold">{String.fromCharCode(65 + idx)}</span>
                                        <span className="pt-0.5">{optText}</span>
                                        {row.correct_answer === idx && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-green-500 shrink-0 mt-0.5" />}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {Boolean(row.explanation) && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Explanation</p>
                                <div className="text-xs text-muted-foreground bg-white dark:bg-[#1C1C1E] p-3 rounded-xl border border-black/5 dark:border-white/5">
                                  {String(row.explanation)}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}

// ──────────── IMPORT TAB ────────────

function ImportTab() {
  const [importType, setImportType] = useState<string>('questions')
  const [csvContent, setCsvContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([])
  const [importing, setImporting] = useState(false)

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setCsvContent(text)
      // Parse preview
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length > 1) {
        const headers = lines[0].split(',').map(h => h.trim())
        const rows = lines.slice(1, 6).map(line => {
          const vals = line.split(',')
          const obj: Record<string, string> = {}
          headers.forEach((h, i) => { obj[h] = vals[i]?.trim() || '' })
          return obj
        })
        setParsedRows(rows)
      }
      toast.success(`Loaded ${lines.length - 1} rows from ${file.name}`)
    }
    reader.readAsText(file)
  }, [])

  const handleImport = () => {
    if (!csvContent) return toast.error('No data to import')
    setImporting(true)
    // Simulate import — in production this would call a server action
    setTimeout(() => {
      const rowCount = csvContent.split('\n').filter(l => l.trim()).length - 1
      toast.success(`Successfully imported ${rowCount} ${importType}!`)
      setImporting(false)
      setCsvContent('')
      setParsedRows([])
      setFileName('')
    }, 2000)
  }

  const IMPORT_TYPES = [
    { value: 'questions', label: 'Questions', template: 'text,option_a,option_b,option_c,option_d,correct_answer,difficulty,marks' },
    { value: 'users', label: 'Users', template: 'full_name,email,is_pro,pro_plan' },
    { value: 'tests', label: 'Tests', template: 'title,description,duration_minutes,total_marks,series_id' },
  ]

  const currentTemplate = IMPORT_TYPES.find(t => t.value === importType)

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Upload Area */}
        <Card className="lg:col-span-3 rounded-2xl border border-black/5 dark:border-white/5">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="space-y-1 flex-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Import Type</Label>
                <Select value={importType} onValueChange={setImportType}>
                  <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IMPORT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Template */}
            <div className="rounded-xl bg-secondary/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" /> CSV Template
                </p>
                <Button variant="ghost" size="sm" className="h-6 text-[9px] gap-1" onClick={() => { navigator.clipboard.writeText(currentTemplate?.template || ''); toast.success('Template copied!') }}>
                  <Copy className="h-3 w-3" /> Copy
                </Button>
              </div>
              <code className="block text-[10px] font-mono text-muted-foreground bg-secondary/50 rounded-lg p-2 overflow-x-auto">
                {currentTemplate?.template}
              </code>
            </div>

            {/* File Upload */}
            <div className="border-2 border-dashed border-black/10 dark:border-white/10 rounded-2xl p-8 text-center hover:border-[#0066CC]/40 transition-colors">
              <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" id="csv-upload" />
              <label htmlFor="csv-upload" className="cursor-pointer space-y-3 block">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30">
                  <Upload className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1D1D1F] dark:text-white">{fileName || 'Drop CSV file here or click to browse'}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Supports .csv and .txt files up to 10MB</p>
                </div>
              </label>
            </div>

            {/* Or paste */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Or paste CSV data</Label>
              <Textarea
                value={csvContent}
                onChange={e => {
                  setCsvContent(e.target.value)
                  const lines = e.target.value.split('\n').filter(l => l.trim())
                  if (lines.length > 1) {
                    const headers = lines[0].split(',').map(h => h.trim())
                    const rows = lines.slice(1, 6).map(line => {
                      const vals = line.split(','); const obj: Record<string, string> = {}
                      headers.forEach((h, i) => { obj[h] = vals[i]?.trim() || '' }); return obj
                    })
                    setParsedRows(rows)
                  }
                }}
                rows={4} placeholder="Paste CSV content here..." className="rounded-xl text-xs font-mono resize-none"
              />
            </div>

            <Button onClick={handleImport} disabled={!csvContent || importing} className="gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white w-full h-10">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {importing ? 'Importing…' : `Import ${importType}`}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="lg:col-span-2 rounded-2xl border border-black/5 dark:border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" /> Data Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {parsedRows.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Upload or paste data to see preview</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Badge variant="secondary" className="text-[9px] font-bold">
                  Showing {parsedRows.length} of {csvContent.split('\n').filter(l => l.trim()).length - 1} rows
                </Badge>
                <div className="space-y-2">
                  {parsedRows.map((row, i) => (
                    <div key={i} className="rounded-lg bg-secondary/20 p-2.5 space-y-1">
                      <p className="text-[9px] font-bold text-muted-foreground">Row {i + 1}</p>
                      {Object.entries(row).map(([key, val]) => (
                        <div key={key} className="flex gap-2 text-[10px]">
                          <span className="font-bold text-muted-foreground w-20 shrink-0 truncate">{key}:</span>
                          <span className="text-[#1D1D1F] dark:text-white truncate">{val}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ──────────── REPORT BUILDER TAB ────────────

function ReportBuilderTab() {
  const [dataSource, setDataSource] = useState('users')
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState('')
  const [filterField, setFilterField] = useState('')
  const [filterValue, setFilterValue] = useState('')
  const [groupBy, setGroupBy] = useState('')

  const SOURCES: Record<string, string[]> = {
    users: ['id', 'full_name', 'email', 'is_pro', 'pro_plan', 'pro_expires_at', 'streak', 'last_active_at', 'created_at'],
    questions: ['id', 'text', 'correct_answer', 'difficulty', 'marks', 'negative_marks', 'test_id', 'language', 'created_at'],
    attempts: ['id', 'user_id', 'test_id', 'score', 'total_marks', 'status', 'completed_at', 'created_at'],
    tests: ['id', 'title', 'duration_minutes', 'total_marks', 'total_questions', 'is_active', 'created_at'],
  }

  const columns = SOURCES[dataSource] || []

  const toggleColumn = (col: string) => {
    setSelectedColumns(prev => { const n = new Set(prev); if (n.has(col)) n.delete(col); else n.add(col); return n })
  }

  const selectAllColumns = () => {
    if (selectedColumns.size === columns.length) setSelectedColumns(new Set())
    else setSelectedColumns(new Set(columns))
  }

  const handleGenerate = () => {
    if (selectedColumns.size === 0) return toast.error('Select at least one column')
    const config = {
      source: dataSource,
      columns: Array.from(selectedColumns),
      sortBy, filterField, filterValue, groupBy,
    }
    toast.success(`Report generated! ${selectedColumns.size} columns from ${dataSource}`)
    console.log('Report config:', config)
    // In production: call server action with this config
  }

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl border border-black/5 dark:border-white/5">
        <CardContent className="p-5 space-y-5">
          {/* Data Source */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Database className="h-3 w-3" /> Data Source
            </Label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(SOURCES).map(source => (
                <button key={source} onClick={() => { setDataSource(source); setSelectedColumns(new Set()) }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${dataSource === source
                    ? 'bg-[#0066CC] text-white border-[#0066CC] shadow-md'
                    : 'border-black/10 dark:border-white/10 text-muted-foreground hover:bg-secondary/50'}`}>
                  {source.charAt(0).toUpperCase() + source.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Column Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Columns3 className="h-3 w-3" /> Columns ({selectedColumns.size}/{columns.length})
              </Label>
              <Button variant="ghost" size="sm" className="h-6 text-[9px]" onClick={selectAllColumns}>
                {selectedColumns.size === columns.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {columns.map(col => (
                <button key={col} onClick={() => toggleColumn(col)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-semibold border transition-all ${selectedColumns.has(col)
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                    : 'border-black/5 dark:border-white/5 text-muted-foreground hover:bg-secondary/50'}`}>
                  {col}
                </button>
              ))}
            </div>
          </div>

          {/* Filters / Sort / Group */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <ArrowDownUp className="h-3 w-3" /> Sort By
              </Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="rounded-xl h-8 text-[10px]"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Filter className="h-3 w-3" /> Filter Field
              </Label>
              <Select value={filterField} onValueChange={setFilterField}>
                <SelectTrigger className="rounded-xl h-8 text-[10px]"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Filter Value</Label>
              <Input value={filterValue} onChange={e => setFilterValue(e.target.value)} placeholder="e.g. true" className="rounded-xl h-8 text-[10px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Group By</Label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="rounded-xl h-8 text-[10px]"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Preview */}
          {selectedColumns.size > 0 && (
            <div className="rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/30 p-4">
              <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 mb-2">Report Preview</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {Array.from(selectedColumns).map(col => (
                  <Badge key={col} variant="secondary" className="text-[8px] font-mono">{col}</Badge>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                FROM <span className="font-bold">{dataSource}</span>
                {filterField && filterField !== 'none' ? <> WHERE <span className="font-bold">{filterField}</span> = &quot;{filterValue}&quot;</> : null}
                {sortBy && sortBy !== 'none' ? <> ORDER BY <span className="font-bold">{sortBy}</span></> : null}
                {groupBy && groupBy !== 'none' ? <> GROUP BY <span className="font-bold">{groupBy}</span></> : null}
              </p>
            </div>
          )}

          <Button onClick={handleGenerate} disabled={selectedColumns.size === 0} className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white w-full h-10">
            <BarChart3 className="h-4 w-4" /> Generate & Download Report
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ──────────── HISTORY TAB ────────────

function HistoryTab() {
  const [history, setHistory] = useState<ExportHistoryItem[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('export_history') || '[]') } catch { return [] }
  })

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('export_history')
    toast.success('History cleared')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">Export History</h3>
        {history.length > 0 && (
          <Button variant="outline" size="sm" className="gap-1 rounded-xl text-xs h-8 text-red-500" onClick={clearHistory}>
            <Trash2 className="h-3 w-3" /> Clear All
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <Card className="rounded-2xl border border-black/5 dark:border-white/5">
          <CardContent className="py-16 text-center">
            <Clock className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">No export history</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Your exports will appear here after downloading.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {history.map(item => (
            <Card key={item.id} className="rounded-xl border border-black/5 dark:border-white/5">
              <CardContent className="p-3 flex items-center gap-3">
                {item.status === 'success'
                  ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  : <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#1D1D1F] dark:text-white capitalize">{item.type} Export</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(item.date), 'MMM d, h:mm a')}</p>
                </div>
                <Badge variant="secondary" className="text-[8px] font-mono">{item.format.toUpperCase()}</Badge>
                <span className="text-[10px] font-semibold text-muted-foreground">{item.rows} rows</span>
                <span className="text-[10px] font-semibold text-muted-foreground">{item.size}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ──────────── BACKUP TAB ────────────

function BackupTab() {
  const [backups, setBackups] = useState<{ id: string; date: string; size: string; type: string }[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('db_backups') || '[]') } catch { return [] }
  })
  const [creating, setCreating] = useState(false)

  const createBackup = (type: string) => {
    setCreating(true)
    setTimeout(() => {
      const newBackup = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        size: `${(Math.random() * 50 + 10).toFixed(1)} MB`,
        type,
      }
      const updated = [newBackup, ...backups]
      setBackups(updated)
      localStorage.setItem('db_backups', JSON.stringify(updated))
      toast.success(`${type} backup created!`)
      setCreating(false)
    }, 3000)
  }

  const deleteBackup = (id: string) => {
    const updated = backups.filter(b => b.id !== id)
    setBackups(updated)
    localStorage.setItem('db_backups', JSON.stringify(updated))
    toast.success('Backup deleted')
  }

  return (
    <div className="space-y-5">
      {/* Backup Actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl border border-black/5 dark:border-white/5 hover:shadow-md transition-shadow">
          <CardContent className="p-5 text-center space-y-3">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-md">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1D1D1F] dark:text-white">Full Backup</h3>
              <p className="text-[10px] text-muted-foreground mt-1">All tables, settings, and configs</p>
            </div>
            <Button onClick={() => createBackup('Full')} disabled={creating} className="w-full gap-2 rounded-xl h-9 text-xs" variant="outline">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HardDrive className="h-3.5 w-3.5" />}
              Create Full Backup
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-black/5 dark:border-white/5 hover:shadow-md transition-shadow">
          <CardContent className="p-5 text-center space-y-3">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-md">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1D1D1F] dark:text-white">Content Only</h3>
              <p className="text-[10px] text-muted-foreground mt-1">Exams, series, tests, questions</p>
            </div>
            <Button onClick={() => createBackup('Content')} disabled={creating} className="w-full gap-2 rounded-xl h-9 text-xs" variant="outline">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HardDrive className="h-3.5 w-3.5" />}
              Backup Content
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-black/5 dark:border-white/5 hover:shadow-md transition-shadow">
          <CardContent className="p-5 text-center space-y-3">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-md">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1D1D1F] dark:text-white">Users Only</h3>
              <p className="text-[10px] text-muted-foreground mt-1">Profiles, subscriptions, attempts</p>
            </div>
            <Button onClick={() => createBackup('Users')} disabled={creating} className="w-full gap-2 rounded-xl h-9 text-xs" variant="outline">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HardDrive className="h-3.5 w-3.5" />}
              Backup Users
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Auto-backup info */}
      <Card className="rounded-2xl border border-black/5 dark:border-white/5 bg-green-50/30 dark:bg-green-950/10">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-green-800 dark:text-green-300">Supabase Auto-Backups Active</p>
            <p className="text-[10px] text-green-700/60 dark:text-green-400/60">Your database is automatically backed up daily by Supabase. Point-in-time recovery is available on Pro plans.</p>
          </div>
          <Badge className="bg-green-600 text-white text-[8px]">ENABLED</Badge>
        </CardContent>
      </Card>

      {/* Backup History */}
      <div>
        <h3 className="text-sm font-bold text-[#1D1D1F] dark:text-white mb-3">Manual Backups ({backups.length})</h3>
        {backups.length === 0 ? (
          <Card className="rounded-2xl border border-black/5 dark:border-white/5">
            <CardContent className="py-12 text-center">
              <HardDrive className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No manual backups yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {backups.map(b => (
              <Card key={b.id} className="rounded-xl border border-black/5 dark:border-white/5">
                <CardContent className="p-3 flex items-center gap-3">
                  <HardDrive className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-[#1D1D1F] dark:text-white">{b.type} Backup</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(b.date), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                  <Badge variant="secondary" className="text-[8px]">{b.size}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Download">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteBackup(b.id)} title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
