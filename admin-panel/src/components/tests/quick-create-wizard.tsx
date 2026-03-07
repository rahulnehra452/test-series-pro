'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createExam } from '@/actions/exam-actions'
import { createTestSeries } from '@/actions/test-series-actions'
import { createTest, getWizardData } from '@/actions/test-actions'
import { createTestSection } from '@/actions/section-actions'
import {
  FileText,
  Plus,
  Loader2,
  Sparkles,
  Timer,
  BookOpen,
  LayoutList,
  Target,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Exam {
  id: string
  title: string
}

interface Series {
  id: string
  title: string
  exam_id: string
}

interface Section {
  name: string
  durationMinutes: number
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function QuickCreateWizard({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()

  // State
  const [loading, setLoading] = useState(false)

  // Data cache
  const [exams, setExams] = useState<Exam[]>([])
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  // Step 1 — Exam & Series selection
  const [selectedExamId, setSelectedExamId] = useState('')
  const [selectedSeriesId, setSelectedSeriesId] = useState('')
  const [creatingNewExam, setCreatingNewExam] = useState(false)
  const [creatingNewSeries, setCreatingNewSeries] = useState(false)
  const [newExamTitle, setNewExamTitle] = useState('')
  const [newSeriesTitle, setNewSeriesTitle] = useState('')
  const [newSeriesDescription, setNewSeriesDescription] = useState('')

  // Step 2 — Test details
  const [testTitle, setTestTitle] = useState('')
  const [testDescription, setTestDescription] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('60')
  const [totalMarks, setTotalMarks] = useState('100')

  // Step 3 — Sections
  const [sections, setSections] = useState<Section[]>([])
  const [newSectionName, setNewSectionName] = useState('')
  const [newSectionDuration, setNewSectionDuration] = useState('30')

  // Load data on open
  const loadData = useCallback(async () => {
    if (dataLoaded) return
    const { exams: examData, series: seriesData, error } = await getWizardData()
    if (error) {
      toast.error('Failed to load test metadata', { description: error })
      return
    }
    setExams(examData || [])
    setSeriesList(seriesData || [])
    setDataLoaded(true)
  }, [dataLoaded])

  // Data Loading & Reset Effect
  useEffect(() => {
    if (open) {
      loadData()
      // Reset state
      setSelectedExamId('')
      setSelectedSeriesId('')
      setCreatingNewExam(false)
      setCreatingNewSeries(false)
      setNewExamTitle('')
      setNewSeriesTitle('')
      setNewSeriesDescription('')
      setTestTitle('')
      setTestDescription('')
      setDurationMinutes('60')
      setTotalMarks('100')
      setSections([])
    }
  }, [open, loadData])

  // Filter series by selected exam
  const filteredSeries = seriesList.filter(s => s.exam_id === selectedExamId)

  // Add section
  const addSection = () => {
    const name = newSectionName.trim()
    if (!name) return
    setSections(prev => [...prev, { name, durationMinutes: parseInt(newSectionDuration) || 30 }])
    setNewSectionName('')
    setNewSectionDuration('30')
  }

  // Remove section
  const removeSection = (index: number) => {
    setSections(prev => prev.filter((_, i) => i !== index))
  }

  // Validate before submission
  const isValid = () => {
    const hasExam = selectedExamId || (creatingNewExam && newExamTitle.trim())
    const hasSeries = selectedSeriesId || (creatingNewSeries && newSeriesTitle.trim())
    const hasDetails = testTitle.trim() && parseInt(durationMinutes) > 0 && parseInt(totalMarks) > 0
    return hasExam && hasSeries && hasDetails
  }

  // Submit everything
  const handleSubmit = async () => {
    setLoading(true)
    try {
      let examId = selectedExamId
      let seriesId = selectedSeriesId

      // Create exam if inline
      if (creatingNewExam && newExamTitle.trim()) {
        const slug = newExamTitle.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        const result = await createExam({
          title: newExamTitle.trim(),
          slug,
          icon_url: '',
          is_active: true,
        })
        if (result.error || !result.id) throw new Error(result.error || 'Failed to find created exam ID')
        examId = result.id
      }

      // Create series if inline
      if (creatingNewSeries && newSeriesTitle.trim()) {
        const result = await createTestSeries({
          title: newSeriesTitle.trim(),
          description: newSeriesDescription.trim() || undefined,
          exam_id: examId,
          price: 0,
          cover_image_url: undefined,
          is_active: true,
        })
        if (result.error || !result.id) throw new Error(result.error || 'Failed to find created series ID')
        seriesId = result.id
      }

      // Create test
      const testResult = await createTest({
        title: testTitle.trim(),
        description: testDescription.trim() || undefined,
        series_id: seriesId,
        duration_minutes: parseInt(durationMinutes),
        total_marks: parseInt(totalMarks),
        pass_marks: 0,
        is_active: true,
      })
      if (testResult.error || !testResult.id) throw new Error(testResult.error || 'Failed to create test')

      const newTestId = testResult.id

      // Create sections
      if (newTestId && sections.length > 0) {
        for (const section of sections) {
          await createTestSection(newTestId, section.name, section.durationMinutes)
        }
      }

      toast.success('Test created successfully!', {
        description: sections.length > 0
          ? `Created with ${sections.length} section(s). Redirecting to test builder…`
          : 'Redirecting to tests page…',
      })

      onOpenChange(false)

      if (newTestId) {
        router.push(`/dashboard/tests/${newTestId}/builder`)
      } else {
        router.push('/dashboard/tests')
      }
      router.refresh()
    } catch (err) {
      toast.error('Failed to create test', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: '1024px', width: '95vw' }} className="p-0 gap-0 overflow-hidden rounded-[32px] border border-black/5 dark:border-white/5 bg-[#F5F5F7] dark:bg-[#1C1C1E] shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-8 pt-8 pb-6 bg-white dark:bg-[#2C2C2E] border-b border-black/5 dark:border-white/5 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2.5 text-2xl font-extrabold text-[#1D1D1F] dark:text-white tracking-tight">
                <div className="p-2 rounded-xl bg-[#0066CC]/10 dark:bg-[#0066CC]/20 shadow-inner">
                  <Sparkles className="h-6 w-6 text-[#0066CC] dark:text-[#5AC8FA]" />
                </div>
                Quick Create Test
              </DialogTitle>
              <p className="text-sm font-medium text-muted-foreground mt-2 ml-[52px]">
                Configure and publish a new test instantly from a single powerful view.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body - Single Pane 2 Column Grid */}
        <div className="grid lg:grid-cols-2 gap-px bg-black/5 dark:bg-white/5 overflow-y-auto max-h-[85vh] hide-scrollbar">

          {/* Left Column: Core Identity & Classification */}
          <div className="bg-white dark:bg-[#2C2C2E] p-8 space-y-8">

            {/* Identity */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1D1D1F] dark:text-white uppercase tracking-wider mb-2">
                <FileText className="h-4 w-4 text-[#0066CC]" />
                Test Identity
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">TEST NAME *</Label>
                <Input placeholder="e.g. Full Length Mock Test #1" value={testTitle} onChange={(e) => setTestTitle(e.target.value)} className="h-11 rounded-xl text-sm font-semibold bg-[#F5F5F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 focus-visible:ring-[#0066CC]" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">DESCRIPTION (OPTIONAL)</Label>
                <Textarea placeholder="Brief test overview or instructions..." value={testDescription} onChange={(e) => setTestDescription(e.target.value)} className="min-h-[80px] rounded-xl text-sm bg-[#F5F5F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 focus-visible:ring-[#0066CC] resize-none" />
              </div>
            </div>

            <div className="h-px bg-black/5 dark:bg-white/5" />

            {/* Classification */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1D1D1F] dark:text-white uppercase tracking-wider mb-2">
                <BookOpen className="h-4 w-4 text-purple-500" />
                Classification
              </div>

              {/* Exam Category */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">EXAM CATEGORY *</Label>
                {!creatingNewExam ? (
                  <div className="flex gap-2">
                    <div className="flex-1 bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-xl">
                      <Select value={selectedExamId} onValueChange={(v) => { setSelectedExamId(v); setSelectedSeriesId('') }}>
                        <SelectTrigger className="h-11 rounded-xl border-black/5 dark:border-white/5 bg-transparent font-medium">
                          <SelectValue placeholder="Select existing parent exam" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-black/5 dark:border-white/5 shadow-xl">
                          {exams.map((exam) => (
                            <SelectItem key={exam.id} value={exam.id} className="rounded-lg">{exam.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="outline" onClick={() => setCreatingNewExam(true)} className="shrink-0 h-11 w-11 rounded-xl border-black/5 dark:border-white/5 bg-[#F5F5F7] dark:bg-[#1C1C1E] hover:bg-black/5 dark:hover:bg-white/5" title="Create new category">
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center bg-purple-500/5 dark:bg-purple-500/10 p-1.5 rounded-xl border border-purple-500/20">
                    <Input placeholder="Enter new exam name..." value={newExamTitle} onChange={(e) => setNewExamTitle(e.target.value)} className="h-10 border-none bg-transparent shadow-none focus-visible:ring-0 font-semibold" autoFocus />
                    <Button type="button" onClick={() => { setCreatingNewExam(false); setNewExamTitle('') }} className="shrink-0 h-8 rounded-lg bg-white dark:bg-[#2C2C2E] text-muted-foreground hover:text-red-500 shadow-sm text-[10px] uppercase font-bold tracking-wider px-3">
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {/* Test Series */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">TEST SERIES *</Label>
                {!creatingNewSeries ? (
                  <div className="flex gap-2">
                    <div className="flex-1 bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-xl flex items-center pr-1">
                      <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId} disabled={!selectedExamId && !creatingNewExam}>
                        <SelectTrigger className="h-11 rounded-xl border-none bg-transparent font-medium shadow-none focus:ring-0">
                          <SelectValue placeholder={selectedExamId || creatingNewExam ? 'Select test series' : 'Select exam first'} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-black/5 dark:border-white/5 shadow-xl">
                          {filteredSeries.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="rounded-lg">{s.title}</SelectItem>
                          ))}
                          {filteredSeries.length === 0 && (selectedExamId || creatingNewExam) && (
                            <div className="px-3 py-4 text-xs font-medium text-center text-muted-foreground">No series found. Create a new one.</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="outline" onClick={() => setCreatingNewSeries(true)} className="shrink-0 h-11 px-3 rounded-xl border-black/5 dark:border-white/5 bg-[#F5F5F7] dark:bg-[#1C1C1E] hover:bg-black/5 dark:hover:bg-white/5 gap-1.5" disabled={!selectedExamId && !creatingNewExam}>
                      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-bold text-muted-foreground hidden lg:inline">New</span>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 bg-indigo-500/5 dark:bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20">
                    <div className="flex gap-2 items-center">
                      <Input placeholder="Enter new series name..." value={newSeriesTitle} onChange={(e) => setNewSeriesTitle(e.target.value)} className="h-9 border-none bg-white dark:bg-[#2C2C2E] shadow-sm font-semibold text-sm" autoFocus />
                      <Button type="button" onClick={() => { setCreatingNewSeries(false); setNewSeriesTitle(''); setNewSeriesDescription('') }} className="shrink-0 h-8 rounded-lg bg-white dark:bg-[#2C2C2E] text-muted-foreground hover:text-red-500 shadow-sm text-[10px] uppercase font-bold tracking-wider px-3">
                        Cancel
                      </Button>
                    </div>
                    <Textarea placeholder="Brief series description (optional)" value={newSeriesDescription} onChange={(e) => setNewSeriesDescription(e.target.value)} className="min-h-[50px] text-xs bg-white dark:bg-[#2C2C2E] border-none shadow-sm resize-none" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Configuration & Sections */}
          <div className="bg-white dark:bg-[#2C2C2E] p-8 space-y-8">

            {/* Configuration */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1D1D1F] dark:text-white uppercase tracking-wider mb-2">
                <Target className="h-4 w-4 text-orange-500" />
                Parameters
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1"><Timer className="h-3 w-3" /> Time (Min) *</Label>
                  <Input type="number" min="1" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} className="h-11 rounded-xl text-lg font-bold text-center bg-[#F5F5F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 tabular-nums focus-visible:ring-orange-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1"><Target className="h-3 w-3" /> Total Marks *</Label>
                  <Input type="number" min="1" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} className="h-11 rounded-xl text-lg font-bold text-center bg-[#F5F5F7] dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 tabular-nums focus-visible:ring-orange-500" />
                </div>
              </div>
            </div>

            <div className="h-px bg-black/5 dark:bg-white/5" />

            {/* Sections */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#1D1D1F] dark:text-white uppercase tracking-wider">
                  <LayoutList className="h-4 w-4 text-green-500" />
                  Sections
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">Optional</span>
              </div>

              {/* Add Section Field */}
              <div className="flex gap-2 items-center bg-[#F5F5F7] dark:bg-[#1C1C1E] p-1.5 rounded-xl border border-black/5 dark:border-white/5">
                <Input placeholder="Section Name (e.g. Physics)" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSection() } }} className="h-9 border-none bg-transparent shadow-none focus-visible:ring-0 text-sm font-medium" />
                <div className="w-px h-5 bg-black/10 dark:bg-white/10" />
                <Input type="number" min="1" placeholder="Min" value={newSectionDuration} onChange={(e) => setNewSectionDuration(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSection() } }} className="h-9 w-20 border-none bg-transparent shadow-none focus-visible:ring-0 text-sm font-medium text-center tabular-nums" title="Duration in minutes" />
                <Button type="button" onClick={addSection} disabled={!newSectionName.trim()} className="shrink-0 h-9 px-3 rounded-lg bg-green-500 hover:bg-green-600 text-white shadow-sm gap-1 ml-1 font-bold text-xs transition-colors">
                  <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Add</span>
                </Button>
              </div>

              {/* Current Sections */}
              {sections.length > 0 ? (
                <div className="space-y-2 mt-4">
                  {sections.map((s, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-black/5 dark:border-white/5 bg-white dark:bg-[#2C2C2E] shadow-sm px-4 py-2.5 group">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1D1D1F] dark:text-white leading-none">{s.name}</p>
                          <p className="text-[10px] text-muted-foreground font-medium mt-1 flex items-center gap-1"><Timer className="h-2.5 w-2.5" /> {s.durationMinutes} minutes</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 rounded-lg" onClick={() => removeSection(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 px-4 rounded-xl border border-dashed border-black/10 dark:border-white/10 mt-4">
                  <LayoutList className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs font-medium text-muted-foreground">No sections added.</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Test will be treated as a single block.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-8 py-5 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#2C2C2E]">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl px-5 h-11 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !isValid()} className="rounded-xl px-6 h-11 text-sm font-bold bg-[#0066CC] hover:bg-[#0052A3] text-white shadow-md transition-all">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {loading ? 'Creating...' : 'Create & Open Builder'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
