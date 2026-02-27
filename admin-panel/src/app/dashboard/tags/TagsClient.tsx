"use client"

import { useMemo, useState, useTransition, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Tag, Search, Plus, X, Hash, Palette, BarChart3,
  Merge, PenLine, Trash2, Check, Loader2,
  Sparkles, Copy, Filter, EyeOff, ChevronDown, ChevronRight,
  Zap, BookOpen, Target, Layers, Cloud, GitBranch,
  Download, AlertTriangle, Lightbulb, LayoutGrid,
  ListTree, Network, FileText, Wand2, RefreshCcw, Settings2
} from "lucide-react"
import { updateQuestionTags } from "@/actions/tag-actions"
import { toast } from "sonner"
import { htmlToPlainText } from "@/lib/utils"

interface TagInfo { name: string; count: number }
interface QuestionInfo { id: string; text: string; tags: string[]; test_id: string; test_title: string }
interface TagsClientProps { tags: TagInfo[]; questions: QuestionInfo[] }

type ViewMode = 'list' | 'compact' | 'grid'
type SortMode = 'count' | 'alpha' | 'recent'
type ToolPanel = null | 'bulk' | 'merge' | 'analytics' | 'cloud' | 'cooccurrence' | 'autotag' | 'templates' | 'duplicates' | 'coverage' | 'export'

const COLOR_PALETTE = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-800',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800',
]
const TAG_COLORS: Record<string, string> = {}
function getTagColor(tag: string): string {
  if (!TAG_COLORS[tag]) { const h = tag.split('').reduce((a, c) => a + c.charCodeAt(0), 0); TAG_COLORS[tag] = COLOR_PALETTE[h % COLOR_PALETTE.length] }
  return TAG_COLORS[tag]
}

const BG_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-pink-500',
  'bg-cyan-500', 'bg-orange-500', 'bg-indigo-500', 'bg-rose-500', 'bg-teal-500',
]
function getTagBg(tag: string): string {
  const h = tag.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return BG_COLORS[h % BG_COLORS.length]
}

// Pre-built tag templates
const TAG_TEMPLATES: { name: string; tags: string[]; icon: string }[] = [
  { name: 'UPSC Prelims', tags: ['polity', 'economy', 'history', 'geography', 'science', 'environment', 'current-affairs', 'art-culture'], icon: '🏛️' },
  { name: 'SSC CGL', tags: ['quantitative-aptitude', 'english', 'reasoning', 'general-awareness', 'computer', 'data-interpretation'], icon: '📝' },
  { name: 'Banking', tags: ['reasoning', 'quantitative-aptitude', 'english', 'general-awareness', 'computer', 'banking-awareness'], icon: '🏦' },
  { name: 'RAS', tags: ['rajasthan-gk', 'indian-history', 'geography', 'polity', 'economy', 'science', 'current-affairs', 'art-culture'], icon: '📜' },
  { name: 'Difficulty Levels', tags: ['easy', 'medium', 'hard', 'expert', 'conceptual', 'application', 'analytical'], icon: '📊' },
  { name: 'Topic Types', tags: ['theory', 'numerical', 'case-study', 'mcq-fact', 'mcq-application', 'matching', 'assertion-reason'], icon: '🧩' },
]

export function TagsClient({ tags, questions }: TagsClientProps) {
  const [search, setSearch] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [questionRows, setQuestionRows] = useState<QuestionInfo[]>(questions)
  const [newTagByQuestion, setNewTagByQuestion] = useState<Record<string, string>>({})
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sortMode, setSortMode] = useState<SortMode>('count')
  const [questionSearch, setQuestionSearch] = useState("")
  const [showBulkTag, setShowBulkTag] = useState(false)
  const [bulkTagValue, setBulkTagValue] = useState("")
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [showRenameTag, setShowRenameTag] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [mergeFrom, setMergeFrom] = useState("")
  const [mergeTo, setMergeTo] = useState("")
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())
  const [showUntagged, setShowUntagged] = useState(false)
  const [activePanel, setActivePanel] = useState<ToolPanel>(null)
  const [autoTagProgress, setAutoTagProgress] = useState<{ done: number; total: number } | null>(null)

  // ── Computed Data ──
  const computedTags = useMemo(() => {
    const tagMap = new Map<string, number>()
    questionRows.forEach(q => q.tags.forEach(t => tagMap.set(t, (tagMap.get(t) || 0) + 1)))
    let result = Array.from(tagMap.entries()).map(([name, count]) => ({ name, count }))
    switch (sortMode) {
      case 'alpha': result.sort((a, b) => a.name.localeCompare(b.name)); break
      case 'count': result.sort((a, b) => b.count - a.count); break
      case 'recent': result.reverse(); break
    }
    return result
  }, [questionRows, sortMode])

  const filteredTags = computedTags.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
  const untaggedCount = questionRows.filter(q => q.tags.length === 0).length
  const totalTagApplications = computedTags.reduce((s, t) => s + t.count, 0)

  // Co-occurrence matrix
  const cooccurrence = useMemo(() => {
    const pairs = new Map<string, number>()
    questionRows.forEach(q => {
      for (let i = 0; i < q.tags.length; i++) {
        for (let j = i + 1; j < q.tags.length; j++) {
          const key = [q.tags[i], q.tags[j]].sort().join('|||')
          pairs.set(key, (pairs.get(key) || 0) + 1)
        }
      }
    })
    return Array.from(pairs.entries())
      .map(([key, count]) => { const [a, b] = key.split('|||'); return { tagA: a, tagB: b, count } })
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }, [questionRows])

  // Duplicate detection (Levenshtein-like similarity)
  const duplicates = useMemo(() => {
    const tagNames = computedTags.map(t => t.name)
    const similar: { a: string; b: string; score: number }[] = []
    for (let i = 0; i < tagNames.length; i++) {
      for (let j = i + 1; j < tagNames.length; j++) {
        const a = tagNames[i], b = tagNames[j]
        // Simple similarity: shared character ratio
        const longer = a.length > b.length ? a : b
        const shorter = a.length > b.length ? b : a
        if (longer.includes(shorter) || shorter.length > 2 && longer.startsWith(shorter.slice(0, -1))) {
          similar.push({ a, b, score: shorter.length / longer.length })
        }
      }
    }
    return similar.sort((a, b) => b.score - a.score).slice(0, 15)
  }, [computedTags])

  // Test coverage map
  const testCoverage = useMemo(() => {
    const map = new Map<string, { title: string; total: number; tagged: number }>()
    questionRows.forEach(q => {
      const e = map.get(q.test_title) || { title: q.test_title, total: 0, tagged: 0 }
      e.total++
      if (q.tags.length > 0) e.tagged++
      map.set(q.test_title, e)
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [questionRows])

  // Test tag distribution
  const testTagMap = useMemo(() => {
    const map = new Map<string, { title: string; tagCount: number; questionCount: number }>()
    questionRows.forEach(q => {
      const e = map.get(q.test_title) || { title: q.test_title, tagCount: 0, questionCount: 0 }
      e.questionCount++; e.tagCount += q.tags.length
      map.set(q.test_title, e)
    })
    return Array.from(map.values()).sort((a, b) => b.questionCount - a.questionCount)
  }, [questionRows])

  const filteredQuestions = useMemo(() => {
    let result = questionRows
    if (selectedTag) result = result.filter(q => q.tags.includes(selectedTag))
    if (showUntagged) result = result.filter(q => q.tags.length === 0)
    if (questionSearch) {
      const s = questionSearch.toLowerCase()
      result = result.filter(q => htmlToPlainText(q.text).toLowerCase().includes(s) || q.test_title.toLowerCase().includes(s) || q.tags.some(t => t.includes(s)))
    }
    return result
  }, [questionRows, selectedTag, showUntagged, questionSearch])

  const getSuggestions = useCallback((text: string): string[] => {
    const plainText = htmlToPlainText(text).toLowerCase()
    return computedTags.map(t => t.name).filter(tag => plainText.includes(tag) || tag.split(/[-_ ]/).some(w => w.length > 3 && plainText.includes(w))).slice(0, 4)
  }, [computedTags])

  // ── Handlers ──
  const handleAddTag = (qId: string, currentTags: string[]) => {
    const raw = (newTagByQuestion[qId] || "").trim()
    if (!raw) return
    const parsed = Array.from(new Set(raw.split(",").map(t => t.trim().toLowerCase()).filter(Boolean)))
    const toAdd = parsed.filter(t => !currentTags.includes(t))
    if (toAdd.length === 0) { toast.info("Tags already exist"); setNewTagByQuestion(p => ({ ...p, [qId]: '' })); return }
    const updated = [...currentTags, ...toAdd]
    startTransition(async () => {
      setActiveQuestionId(qId)
      const res = await updateQuestionTags(qId, updated)
      if (res.error) toast.error(res.error)
      else { setQuestionRows(prev => prev.map(q => q.id === qId ? { ...q, tags: updated } : q)); setNewTagByQuestion(p => ({ ...p, [qId]: '' })); toast.success(`${toAdd.length} tag(s) added`) }
      setActiveQuestionId(null)
    })
  }

  const handleRemoveTag = (qId: string, currentTags: string[], tagToRemove: string) => {
    const updated = currentTags.filter(t => t !== tagToRemove)
    startTransition(async () => {
      setActiveQuestionId(qId)
      const res = await updateQuestionTags(qId, updated)
      if (res.error) toast.error(res.error)
      else { setQuestionRows(prev => prev.map(q => q.id === qId ? { ...q, tags: updated } : q)); toast.success("Tag removed") }
      setActiveQuestionId(null)
    })
  }

  const handleBulkTag = () => {
    if (!bulkTagValue.trim() || selectedQuestions.size === 0) return
    const newTags = bulkTagValue.split(",").map(t => t.trim().toLowerCase()).filter(Boolean)
    startTransition(async () => {
      for (const qId of selectedQuestions) {
        const q = questionRows.find(x => x.id === qId); if (!q) continue
        const updated = Array.from(new Set([...q.tags, ...newTags]))
        await updateQuestionTags(qId, updated)
        setQuestionRows(prev => prev.map(x => x.id === qId ? { ...x, tags: updated } : x))
      }
      toast.success(`Added tags to ${selectedQuestions.size} questions`)
      setSelectedQuestions(new Set()); setBulkTagValue(""); setShowBulkTag(false)
    })
  }

  const handleRenameTag = () => {
    if (!showRenameTag || !renameValue.trim()) return
    const oldTag = showRenameTag, newTag = renameValue.trim().toLowerCase()
    if (oldTag === newTag) return
    startTransition(async () => {
      for (const q of questionRows.filter(x => x.tags.includes(oldTag))) {
        const updated = q.tags.map(t => t === oldTag ? newTag : t)
        await updateQuestionTags(q.id, updated)
        setQuestionRows(prev => prev.map(x => x.id === q.id ? { ...x, tags: updated } : x))
      }
      toast.success(`Renamed "${oldTag}" → "${newTag}"`)
      setShowRenameTag(null); setRenameValue("")
      if (selectedTag === oldTag) setSelectedTag(newTag)
    })
  }

  const handleMergeTags = () => {
    if (!mergeFrom.trim() || !mergeTo.trim() || mergeFrom === mergeTo) return
    startTransition(async () => {
      for (const q of questionRows.filter(x => x.tags.includes(mergeFrom))) {
        const updated = Array.from(new Set(q.tags.map(t => t === mergeFrom ? mergeTo : t)))
        await updateQuestionTags(q.id, updated)
        setQuestionRows(prev => prev.map(x => x.id === q.id ? { ...x, tags: updated } : x))
      }
      toast.success(`Merged "${mergeFrom}" → "${mergeTo}"`)
      setActivePanel(null); setMergeFrom(""); setMergeTo("")
    })
  }

  const handleDeleteTag = (tagName: string) => {
    if (!confirm(`Remove "${tagName}" from all questions?`)) return
    startTransition(async () => {
      for (const q of questionRows.filter(x => x.tags.includes(tagName))) {
        const updated = q.tags.filter(t => t !== tagName)
        await updateQuestionTags(q.id, updated)
        setQuestionRows(prev => prev.map(x => x.id === q.id ? { ...x, tags: updated } : x))
      }
      toast.success(`Deleted "${tagName}" globally`)
      if (selectedTag === tagName) setSelectedTag(null)
    })
  }

  const handleApplySuggestion = (qId: string, currentTags: string[], suggestion: string) => {
    if (currentTags.includes(suggestion)) return
    const updated = [...currentTags, suggestion]
    startTransition(async () => {
      setActiveQuestionId(qId)
      const res = await updateQuestionTags(qId, updated)
      if (res.error) toast.error(res.error)
      else { setQuestionRows(prev => prev.map(q => q.id === qId ? { ...q, tags: updated } : q)); toast.success(`Added "${suggestion}"`) }
      setActiveQuestionId(null)
    })
  }

  // Auto-tag all untagged questions
  const handleAutoTagAll = () => {
    const untagged = questionRows.filter(q => q.tags.length === 0)
    if (untagged.length === 0) { toast.info("No untagged questions"); return }
    setAutoTagProgress({ done: 0, total: untagged.length })
    startTransition(async () => {
      let done = 0
      for (const q of untagged) {
        const suggestions = getSuggestions(q.text)
        if (suggestions.length > 0) {
          await updateQuestionTags(q.id, suggestions)
          setQuestionRows(prev => prev.map(x => x.id === q.id ? { ...x, tags: suggestions } : x))
        }
        done++
        setAutoTagProgress({ done, total: untagged.length })
      }
      toast.success(`Auto-tagged ${done} questions`)
      setAutoTagProgress(null)
    })
  }

  // Apply template tags to selected questions
  const handleApplyTemplate = (templateTags: string[]) => {
    if (selectedQuestions.size === 0) { toast.info("Select questions first, or use Bulk Tag mode"); return }
    startTransition(async () => {
      for (const qId of selectedQuestions) {
        const q = questionRows.find(x => x.id === qId); if (!q) continue
        const updated = Array.from(new Set([...q.tags, ...templateTags]))
        await updateQuestionTags(qId, updated)
        setQuestionRows(prev => prev.map(x => x.id === qId ? { ...x, tags: updated } : x))
      }
      toast.success(`Applied template to ${selectedQuestions.size} questions`)
      setSelectedQuestions(new Set())
    })
  }

  // Export tags as CSV
  const handleExportTags = () => {
    const lines = ['question_text,test,tags']
    questionRows.forEach(q => {
      const text = htmlToPlainText(q.text).replace(/,/g, ';').replace(/\n/g, ' ').slice(0, 200)
      lines.push(`"${text}","${q.test_title}","${q.tags.join(', ')}"`)
    })
    const csv = lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'question_tags_export.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${questionRows.length} questions with tags`)
  }

  const togglePanel = (panel: ToolPanel) => setActivePanel(prev => prev === panel ? null : panel)

  const TOOLS: { key: ToolPanel; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'bulk', label: 'Bulk Tag', icon: Layers },
    { key: 'merge', label: 'Merge', icon: Merge },
    { key: 'autotag', label: 'Auto-Tag', icon: Wand2 },
    { key: 'templates', label: 'Templates', icon: LayoutGrid },
    { key: 'duplicates', label: 'Duplicates', icon: AlertTriangle },
    { key: 'cloud', label: 'Tag Cloud', icon: Cloud },
    { key: 'cooccurrence', label: 'Co-occurrence', icon: Network },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'coverage', label: 'Coverage', icon: Target },
    { key: 'export', label: 'Export', icon: Download },
  ]

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#1D1D1F] dark:text-white flex items-center gap-2">
            <Tag className="h-7 w-7 text-[#0066CC]" />
            Tag Manager
          </h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Build and optimize your question ontology.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1 font-semibold gap-1 text-xs rounded-full bg-secondary/50"><Hash className="h-3.5 w-3.5" />{computedTags.length} tags</Badge>
          <Badge variant="secondary" className="px-3 py-1 font-semibold gap-1 text-xs rounded-full bg-secondary/50"><Target className="h-3.5 w-3.5" />{totalTagApplications} mapped uses</Badge>
        </div>
      </div>

      {/* Stats Row */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.08] shadow-sm rounded-3xl p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {[
          { icon: Hash, label: 'Unique Tags', value: computedTags.length, color: 'text-violet-600', bg: 'bg-violet-500/10' },
          { icon: BookOpen, label: 'Tagged Qs', value: questionRows.length - untaggedCount, color: 'text-green-600', bg: 'bg-green-500/10' },
          { icon: EyeOff, label: 'Untagged Qs', value: untaggedCount, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { icon: Layers, label: 'Avg Tags/Q', value: questionRows.length ? (totalTagApplications / questionRows.length).toFixed(1) : '0', color: 'text-blue-600', bg: 'bg-blue-500/10' },
          { icon: GitBranch, label: 'Co-Pairs', value: cooccurrence.length, color: 'text-pink-600', bg: 'bg-pink-500/10' },
        ].map((s, idx) => (
          <div key={s.label} className={`flex-1 flex items-center gap-3 ${idx !== 4 ? 'md:border-r border-black/[0.04] dark:border-white/[0.08]' : ''} pr-4 md:pr-0`}>
            <div className={`p-2.5 rounded-2xl ${s.bg}`}>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold text-[#1D1D1F] dark:text-white leading-tight">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tools Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-secondary/10 dark:bg-black/10 rounded-2xl p-2.5 mb-6">
        <div className="flex items-center gap-1.5 flex-wrap">
          {TOOLS.slice(0, 3).map(tool => (
            <Button key={tool.key} variant={activePanel === tool.key ? "default" : "ghost"} size="sm" className={`gap-2 rounded-xl text-xs font-semibold h-8 px-3 transition-all ${activePanel === tool.key ? 'bg-[#0066CC] shadow-sm' : 'hover:bg-secondary/60'}`} onClick={() => togglePanel(tool.key)}>
              <tool.icon className="h-4 w-4" /> {tool.label}
            </Button>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={['templates', 'duplicates', 'cloud', 'cooccurrence', 'analytics', 'coverage', 'export'].includes(activePanel as string) ? "default" : "ghost"} size="sm" className="gap-2 rounded-xl text-xs font-semibold h-8 px-3">
                <Settings2 className="h-4 w-4" /> Advanced Tools <ChevronDown className="h-3 w-3 opacity-50 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 rounded-2xl shadow-xl p-2 border-black/5 dark:border-white/5">
              <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-1">Analysis & Management</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5 mx-1" />
              {TOOLS.slice(3).map(tool => (
                <DropdownMenuItem key={tool.key} onClick={() => togglePanel(tool.key)} className="gap-2 text-xs rounded-xl font-medium cursor-pointer">
                  <tool.icon className="h-4 w-4 text-muted-foreground" /> {tool.label}
                  {activePanel === tool.key && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 max-w-full overflow-x-auto hide-scrollbar">
          <Button variant={showUntagged ? "default" : "secondary"} size="sm" className="gap-2 rounded-xl text-xs font-semibold h-8 px-3" onClick={() => { setShowUntagged(!showUntagged); setSelectedTag(null) }}>
            <EyeOff className="h-4 w-4" /> View Untagged <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-black/10 dark:bg-white/10 text-foreground font-bold hover:bg-black/10">{untaggedCount}</Badge>
          </Button>
          <div className="w-px h-5 bg-black/10 dark:bg-white/10 mx-1 shrink-0" />
          <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 rounded-xl p-0.5 shrink-0">
            {(['list', 'compact', 'grid'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all capitalize ${viewMode === v ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════ TOOL PANELS ═══════ */}

      {/* Bulk Tag */}
      {activePanel === 'bulk' && (
        <Card className="rounded-2xl border-2 border-[#0066CC]/20 bg-blue-50/30 dark:bg-blue-950/10">
          <CardContent className="p-4">
            <p className="text-xs font-bold mb-2 flex items-center gap-2"><Layers className="h-4 w-4 text-[#0066CC]" /> Bulk Tag — Select questions below, then apply</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px] font-bold">{selectedQuestions.size} selected</Badge>
              <Input value={bulkTagValue} onChange={e => setBulkTagValue(e.target.value)} placeholder="Tags (comma separated)" className="flex-1 rounded-xl h-8 text-xs min-w-[150px]" />
              <Button size="sm" className="gap-1 rounded-xl h-8 text-xs bg-[#0066CC] text-white" onClick={handleBulkTag} disabled={isPending || selectedQuestions.size === 0}>
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Apply
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl" onClick={() => setSelectedQuestions(new Set(filteredQuestions.map(q => q.id)))}>Select All</Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSelectedQuestions(new Set()); setActivePanel(null) }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Merge */}
      {activePanel === 'merge' && (
        <Card className="rounded-2xl border-2 border-purple-200/50 dark:border-purple-800/30 bg-purple-50/30 dark:bg-purple-950/10">
          <CardContent className="p-4">
            <p className="text-xs font-bold mb-2 flex items-center gap-2"><Merge className="h-4 w-4 text-purple-600" /> Merge Tags</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Input value={mergeFrom} onChange={e => setMergeFrom(e.target.value)} placeholder="From tag" className="rounded-xl h-8 text-xs w-36" list="merge-tags" />
              <span className="text-xs text-muted-foreground font-bold">→</span>
              <Input value={mergeTo} onChange={e => setMergeTo(e.target.value)} placeholder="Into tag" className="rounded-xl h-8 text-xs w-36" list="merge-tags" />
              <Button size="sm" className="gap-1 rounded-xl h-8 text-xs bg-purple-600 text-white" onClick={handleMergeTags} disabled={isPending}>
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Merge className="h-3 w-3" />} Merge
              </Button>
            </div>
            <datalist id="merge-tags">{computedTags.map(t => <option key={t.name} value={t.name} />)}</datalist>
          </CardContent>
        </Card>
      )}

      {/* Auto-Tag Engine */}
      {activePanel === 'autotag' && (
        <Card className="rounded-2xl border-2 border-green-200/50 dark:border-green-800/30 bg-green-50/30 dark:bg-green-950/10">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-bold flex items-center gap-2"><Wand2 className="h-4 w-4 text-green-600" /> Auto-Tag Engine</p>
            <p className="text-[10px] text-muted-foreground">Automatically tags untagged questions by matching their text against existing tag names. Questions containing tag keywords will get those tags applied.</p>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-[10px]">{untaggedCount} untagged questions</Badge>
              <Badge variant="secondary" className="text-[10px]">{computedTags.length} known tags to match</Badge>
            </div>
            {autoTagProgress && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                  <span>Processing...</span>
                  <span>{autoTagProgress.done}/{autoTagProgress.total}</span>
                </div>
                <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all" style={{ width: `${(autoTagProgress.done / autoTagProgress.total) * 100}%` }} />
                </div>
              </div>
            )}
            <Button onClick={handleAutoTagAll} disabled={isPending || untaggedCount === 0} className="gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white h-9 text-xs">
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              Auto-Tag {untaggedCount} Questions
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Templates */}
      {activePanel === 'templates' && (
        <Card className="rounded-2xl border border-black/5 dark:border-white/5">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-bold flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-indigo-600" /> Tag Templates — Pre-built tag sets for exams</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {TAG_TEMPLATES.map(tmpl => (
                <div key={tmpl.name} className="rounded-xl border border-black/5 dark:border-white/5 p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold flex items-center gap-2">
                      <span>{tmpl.icon}</span> {tmpl.name}
                    </p>
                    <Button size="sm" variant="outline" className="h-6 text-[9px] rounded-lg gap-1" onClick={() => handleApplyTemplate(tmpl.tags)} disabled={isPending}>
                      <Plus className="h-2.5 w-2.5" /> Apply
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tmpl.tags.map(t => (
                      <Badge key={t} variant="secondary" className={`text-[8px] font-medium border ${getTagColor(t)}`}>#{t}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Select questions first (using Bulk Tag mode), then click Apply on a template.</p>
          </CardContent>
        </Card>
      )}

      {/* Duplicate Detection */}
      {activePanel === 'duplicates' && (
        <Card className="rounded-2xl border border-black/5 dark:border-white/5">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-bold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Duplicate / Similar Tags ({duplicates.length})</p>
            {duplicates.length === 0 ? (
              <div className="text-center py-6">
                <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-green-700 dark:text-green-400">No duplicates found!</p>
                <p className="text-[10px] text-muted-foreground">Your tags are clean.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {duplicates.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/30 dark:border-amber-800/20">
                    <Badge className={`text-[9px] border ${getTagColor(d.a)}`}>#{d.a}</Badge>
                    <span className="text-[10px] text-muted-foreground">≈</span>
                    <Badge className={`text-[9px] border ${getTagColor(d.b)}`}>#{d.b}</Badge>
                    <span className="text-[9px] text-muted-foreground ml-auto">{Math.round(d.score * 100)}% similar</span>
                    <Button size="sm" variant="ghost" className="h-6 text-[9px] gap-1 text-purple-600" onClick={() => { setMergeFrom(d.a); setMergeTo(d.b); setActivePanel('merge') }}>
                      <Merge className="h-3 w-3" /> Merge
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tag Cloud */}
      {activePanel === 'cloud' && (
        <Card className="rounded-2xl border border-black/5 dark:border-white/5">
          <CardContent className="p-6">
            <p className="text-xs font-bold mb-4 flex items-center gap-2"><Cloud className="h-4 w-4 text-blue-600" /> Tag Cloud — Size = Frequency</p>
            <div className="flex flex-wrap items-center justify-center gap-2 min-h-[120px]">
              {computedTags.map(t => {
                const maxCount = Math.max(1, computedTags[0]?.count || 1)
                const scale = 0.6 + (t.count / maxCount) * 1.4 // 0.6x to 2x
                const opacity = 0.4 + (t.count / maxCount) * 0.6
                return (
                  <button key={t.name} onClick={() => { setSelectedTag(t.name); setShowUntagged(false); setActivePanel(null) }}
                    className={`px-3 py-1 rounded-xl font-bold border transition-all hover:shadow-md hover:scale-105 ${getTagColor(t.name)} ${selectedTag === t.name ? 'ring-2 ring-[#0066CC]' : ''}`}
                    style={{ fontSize: `${Math.round(scale * 11)}px`, opacity }}>
                    #{t.name}
                    <span className="text-[8px] ml-0.5 opacity-60">{t.count}</span>
                  </button>
                )
              })}
              {computedTags.length === 0 && <p className="text-xs text-muted-foreground">No tags yet</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Co-occurrence */}
      {activePanel === 'cooccurrence' && (
        <Card className="rounded-2xl border border-black/5 dark:border-white/5">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-bold flex items-center gap-2"><Network className="h-4 w-4 text-pink-600" /> Tag Co-occurrence — Tags that appear together</p>
            {cooccurrence.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No co-occurring tags yet. Questions need 2+ tags.</p>
            ) : (
              <div className="space-y-1.5">
                {cooccurrence.map((pair, i) => {
                  const maxPair = cooccurrence[0]?.count || 1
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-muted-foreground w-5">#{i + 1}</span>
                      <Badge className={`text-[9px] border ${getTagColor(pair.tagA)}`}>#{pair.tagA}</Badge>
                      <GitBranch className="h-3 w-3 text-muted-foreground/30" />
                      <Badge className={`text-[9px] border ${getTagColor(pair.tagB)}`}>#{pair.tagB}</Badge>
                      <div className="flex-1 h-3 bg-secondary/20 rounded-full overflow-hidden ml-2">
                        <div className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full" style={{ width: `${(pair.count / maxPair) * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-bold w-8 text-right">{pair.count}×</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analytics */}
      {activePanel === 'analytics' && (
        <Card className="rounded-2xl border border-black/5 dark:border-white/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-green-600" /> Tag Distribution</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {testTagMap.slice(0, 10).map(t => (
                <div key={t.title} className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold w-40 truncate">{t.title}</span>
                  <div className="flex-1 h-5 bg-secondary/30 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all" style={{ width: `${Math.min(100, (t.tagCount / Math.max(1, t.questionCount)) * 33)}%` }} />
                  </div>
                  <span className="text-[9px] font-bold text-muted-foreground w-24 text-right">{t.tagCount} tags / {t.questionCount} Qs</span>
                </div>
              ))}
            </div>
            {/* Mini bar chart */}
            <div className="pt-3 border-t border-black/5 dark:border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Top 15 Tags</p>
              <div className="flex items-end gap-[2px] h-16">
                {computedTags.slice(0, 15).map(t => {
                  const max = Math.max(1, computedTags[0]?.count || 1)
                  return (
                    <div key={t.name} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                      <div className={`w-full rounded-t-sm ${getTagBg(t.name)}`} style={{ height: `${Math.max(8, (t.count / max) * 100)}%` }} />
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black text-white text-[7px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">{t.name}: {t.count}</div>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-[2px] mt-0.5">
                {computedTags.slice(0, 15).map(t => <span key={t.name} className="flex-1 text-[6px] font-bold text-muted-foreground text-center truncate">{t.name}</span>)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coverage Heatmap */}
      {activePanel === 'coverage' && (
        <Card className="rounded-2xl border border-black/5 dark:border-white/5">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-bold flex items-center gap-2"><Target className="h-4 w-4 text-orange-600" /> Tag Coverage by Test</p>
            <div className="space-y-2">
              {testCoverage.map(t => {
                const pct = t.total > 0 ? Math.round((t.tagged / t.total) * 100) : 0
                const color = pct >= 80 ? 'from-green-500 to-emerald-500' : pct >= 50 ? 'from-amber-500 to-orange-500' : 'from-red-500 to-rose-500'
                return (
                  <div key={t.title} className="flex items-center gap-3">
                    <span className="text-[10px] font-semibold w-44 truncate">{t.title}</span>
                    <div className="flex-1 h-6 bg-secondary/20 rounded-lg overflow-hidden relative">
                      <div className={`h-full bg-gradient-to-r ${color} rounded-lg transition-all`} style={{ width: `${pct}%` }} />
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">{pct}%</span>
                    </div>
                    <span className="text-[9px] font-bold text-muted-foreground w-16 text-right">{t.tagged}/{t.total} Qs</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export */}
      {activePanel === 'export' && (
        <Card className="rounded-2xl border border-black/5 dark:border-white/5">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-bold flex items-center gap-2"><Download className="h-4 w-4 text-indigo-600" /> Export Tag Data</p>
            <p className="text-[10px] text-muted-foreground">Download all questions with their tags as a CSV file. Columns: question_text, test, tags.</p>
            <Button onClick={handleExportTags} className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white h-9 text-xs">
              <FileText className="h-3.5 w-3.5" /> Export {questionRows.length} Questions with Tags (CSV)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ═══════ MAIN LAYOUT ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* ── Left Sidebar: Tags ── */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search tags..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl h-9 text-xs" />
          </div>
          <div className="flex items-center gap-0.5 bg-secondary/30 rounded-lg p-0.5">
            {([['count', 'Popular'], ['alpha', 'A-Z'], ['recent', 'Recent']] as [SortMode, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setSortMode(key)}
                className={`flex-1 px-2 py-1 rounded-md text-[9px] font-bold transition-all ${sortMode === key ? 'bg-white dark:bg-[#2C2C2E] shadow-sm' : 'text-muted-foreground'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="bg-transparent">
            <div className="flex flex-col space-y-0.5 max-h-[60vh] overflow-y-auto hide-scrollbar">
              <button onClick={() => { setSelectedTag(null); setShowUntagged(false) }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${!selectedTag && !showUntagged ? 'bg-primary/5 text-primary' : 'hover:bg-secondary/50 text-[#1D1D1F] dark:text-gray-300'}`}>
                <span className="flex items-center gap-2"><ListTree className="w-4 h-4 opacity-50" /> All Data</span>
                <span className="text-[10px] opacity-60 font-mono tracking-tighter">{questionRows.length}</span>
              </button>
              {filteredTags.map(tag => (
                <div key={tag.name} className="group relative">
                  <button onClick={() => { setSelectedTag(tag.name); setShowUntagged(false) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors ${selectedTag === tag.name ? 'bg-primary/5 text-primary font-bold' : 'hover:bg-secondary/50 text-muted-foreground font-medium'}`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${getTagColor(tag.name).split(' ')[0]}`} />
                    <span className="flex-1 text-left truncate">{tag.name}</span>
                    <span className="text-[10px] opacity-40 font-mono tracking-tighter">{tag.count}</span>
                  </button>
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-sm shadow-md rounded-lg px-1 py-0.5 z-10 border border-black/5 dark:border-white/5">
                    <button onClick={() => { setShowRenameTag(tag.name); setRenameValue(tag.name) }} className="p-1 hover:bg-secondary/80 rounded-md transition-colors" title="Rename"><PenLine className="h-3 w-3 text-muted-foreground" /></button>
                    <button onClick={() => { navigator.clipboard.writeText(tag.name); toast.success('Copied!') }} className="p-1 hover:bg-secondary/80 rounded-md transition-colors" title="Copy"><Copy className="h-3 w-3 text-muted-foreground" /></button>
                    <button onClick={() => handleDeleteTag(tag.name)} className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors" title="Delete"><Trash2 className="h-3 w-3 text-red-500" /></button>
                  </div>
                </div>
              ))}
              {filteredTags.length === 0 && (
                <div className="text-center py-10 text-xs text-muted-foreground"><Palette className="h-8 w-8 mx-auto mb-2 opacity-10" />No tags found</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Questions ── */}
        <div className="lg:col-span-3 space-y-3">
          {/* Rename bar */}
          {showRenameTag && (
            <Card className="rounded-xl border-2 border-amber-200/50 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/10">
              <CardContent className="p-3 flex items-center gap-2 flex-wrap">
                <PenLine className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-xs font-bold shrink-0">Rename &quot;{showRenameTag}&quot; →</span>
                <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} className="rounded-lg h-7 text-xs w-32" />
                <Button size="sm" className="h-7 text-[10px] rounded-lg bg-amber-600 text-white" onClick={handleRenameTag} disabled={isPending}>
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setShowRenameTag(null)}>Cancel</Button>
              </CardContent>
            </Card>
          )}

          {/* Question search + header */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search questions by text, test, or tag..." value={questionSearch} onChange={e => setQuestionSearch(e.target.value)} className="pl-9 rounded-xl h-9 text-xs" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
              {showUntagged ? `Untagged (${filteredQuestions.length})` : selectedTag ? `#${selectedTag} (${filteredQuestions.length})` : `All (${filteredQuestions.length})`}
            </span>
          </div>

          {/* Questions */}
          {filteredQuestions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/10 dark:border-white/10 bg-secondary/10 flex flex-col items-center justify-center py-20 text-center">
              <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
              <p className="text-sm font-bold text-muted-foreground">No questions found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try a different filter or clear your search terms.</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-1.5'}>
              {filteredQuestions.map(q => {
                const plainText = htmlToPlainText(q.text) || "Untitled Question"
                const isExpanded = expandedQuestions.has(q.id)
                const isSelected = selectedQuestions.has(q.id)
                const suggestions = getSuggestions(q.text).filter(s => !q.tags.includes(s))

                return (
                  <div key={q.id} className={`rounded-2xl border transition-all ${isSelected ? 'border-[#0066CC] bg-blue-50/40 dark:bg-blue-900/10 shadow-sm' : 'border-black/5 dark:border-white/5 bg-white dark:bg-[#1C1C1E] hover:border-black/10 dark:hover:border-white/10'}`}>
                    <div className={viewMode === 'compact' ? 'p-3' : 'p-4'}>
                      <div className="flex items-start gap-2">
                        {activePanel === 'bulk' && (
                          <button onClick={() => { const n = new Set(selectedQuestions); if (n.has(q.id)) n.delete(q.id); else n.add(q.id); setSelectedQuestions(n) }}
                            className={`mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-[#0066CC] bg-[#0066CC]' : 'border-gray-300 dark:border-gray-600'}`}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </button>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-1.5">
                            <button onClick={() => { const n = new Set(expandedQuestions); if (n.has(q.id)) n.delete(q.id); else n.add(q.id); setExpandedQuestions(n) }}
                              className="mt-0.5 shrink-0 text-muted-foreground hover:text-[#1D1D1F] dark:hover:text-white">
                              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold text-[#1D1D1F] dark:text-white ${isExpanded ? '' : 'line-clamp-1'}`}>{plainText}</p>
                              <p className="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-1"><BookOpen className="h-2.5 w-2.5" /> {q.test_title}</p>
                            </div>
                          </div>

                          {/* Tags row */}
                          <div className="flex items-center flex-wrap gap-1 mt-1.5 ml-4">
                            {q.tags.map(tag => (
                              <Badge key={tag} className={`text-[8px] font-semibold cursor-pointer border group/tag ${getTagColor(tag)}`}
                                onClick={() => handleRemoveTag(q.id, q.tags, tag)}>
                                #{tag}<X className="w-2 h-2 ml-0.5 opacity-0 group-hover/tag:opacity-100 transition-opacity" />
                              </Badge>
                            ))}
                            {q.tags.length === 0 && <span className="text-[8px] text-amber-600 font-medium flex items-center gap-0.5"><EyeOff className="h-2.5 w-2.5" /> No tags</span>}
                            <div className="flex items-center gap-0.5">
                              <Input placeholder="+ tag" value={newTagByQuestion[q.id] || ""} onChange={e => setNewTagByQuestion(p => ({ ...p, [q.id]: e.target.value }))}
                                className="h-5 w-20 text-[9px] rounded-md border-solid border-black/15 dark:border-white/15 bg-secondary/30 placeholder:text-muted-foreground/60" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(q.id, q.tags) } }} />
                              <Button size="icon" variant="ghost" className="h-5 w-5" disabled={isPending && activeQuestionId === q.id} onClick={() => handleAddTag(q.id, q.tags)}>
                                {isPending && activeQuestionId === q.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Plus className="w-2.5 h-2.5" />}
                              </Button>
                            </div>
                          </div>

                          {/* Suggestions */}
                          {suggestions.length > 0 && isExpanded && (
                            <div className="flex items-center gap-1 mt-1.5 ml-4">
                              <Sparkles className="h-3 w-3 text-purple-500 shrink-0" />
                              <span className="text-[8px] text-muted-foreground font-medium shrink-0">Suggested:</span>
                              {suggestions.map(s => (
                                <button key={s} onClick={() => handleApplySuggestion(q.id, q.tags, s)}
                                  className="px-1.5 py-0.5 rounded-md text-[8px] font-medium border border-dashed border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors">
                                  +{s}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
