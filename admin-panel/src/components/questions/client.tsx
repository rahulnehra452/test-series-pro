"use client"

import { Question } from "./columns"
import { QuestionDialog } from "./question-dialog"
import { BulkUploadDialog } from "./bulk-upload-dialog"
import { useMemo, useState, useTransition } from "react"
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
import { ArrowRight, Tag, Trash2, X, ShieldAlert } from "lucide-react"
import { bulkMoveQuestions, bulkDeleteQuestions } from "@/actions/question-actions"
import { bulkAssignTags } from "@/actions/tag-actions"
import { toast } from "sonner"
import { htmlToPlainText } from "@/lib/utils"
import Link from "next/link"

interface QuestionsClientProps {
  data: Question[]
  tests: { id: string; title: string }[]
}

export function QuestionsClient({ data, tests }: QuestionsClientProps) {
  const router = useRouter()

  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [bulkAction, setBulkAction] = useState<string | null>(null)
  const [bulkTargetTest, setBulkTargetTest] = useState("")
  const [bulkTagInput, setBulkTagInput] = useState("")
  const [isPending, startTransition] = useTransition()

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return data

    return data.filter((row) => {
      const text = htmlToPlainText(row.question_text).toLowerCase()
      const testTitle = row.tests?.title?.toLowerCase() || ""
      const id = row.id.toLowerCase()
      return text.includes(query) || testTitle.includes(query) || id.includes(query)
    })
  }, [data, searchQuery])

  const validIdSet = useMemo(() => new Set(data.map((q) => q.id)), [data])
  const activeSelectedIds = useMemo(
    () => Array.from(selectedIds).filter((id) => validIdSet.has(id)),
    [selectedIds, validIdSet]
  )
  const activeSelectedSet = useMemo(() => new Set(activeSelectedIds), [activeSelectedIds])
  const selectedCount = activeSelectedIds.length
  const isAllVisibleSelected = filteredData.length > 0 && filteredData.every((q) => activeSelectedSet.has(q.id))

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (filteredData.length === 0) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (filteredData.every((q) => next.has(q.id))) {
        filteredData.forEach((q) => next.delete(q.id))
      } else {
        filteredData.forEach((q) => next.add(q.id))
      }
      return next
    })
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setBulkAction(null)
  }

  const handleBulkMove = () => {
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

  const handleBulkDelete = () => {
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
      }
    })
  }

  const handleBulkTag = () => {
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

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white">Question Bank</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">Manage and bulk import questions for your tests.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard/questions/validation">
              <ShieldAlert className="w-4 h-4 mr-2 text-indigo-500" />
              Validate Content
            </Link>
          </Button>
          <BulkUploadDialog tests={tests} onSuccess={() => router.refresh()} />
          <QuestionDialog tests={tests} />
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl animate-in slide-in-from-top-2">
          <Badge className="bg-blue-500 text-white">{selectedCount} selected</Badge>

          <Button variant="outline" size="sm" onClick={() => { setBulkAction(bulkAction === 'move' ? null : 'move') }}>
            <ArrowRight className="w-4 h-4 mr-1" /> Move to Test
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setBulkAction(bulkAction === 'tag' ? null : 'tag') }}>
            <Tag className="w-4 h-4 mr-1" /> Assign Tags
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={handleBulkDelete} disabled={isPending}>
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>

          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Action Panels */}
      {bulkAction === 'move' && (
        <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#1C1C1E] border rounded-xl">
          <span className="text-sm font-medium">Move to:</span>
          <Select value={bulkTargetTest} onValueChange={setBulkTargetTest}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select target test" />
            </SelectTrigger>
            <SelectContent>
              {tests.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleBulkMove} disabled={isPending}>
            {isPending ? 'Moving...' : 'Confirm Move'}
          </Button>
        </div>
      )}

      {bulkAction === 'tag' && (
        <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#1C1C1E] border rounded-xl">
          <span className="text-sm font-medium">Tags:</span>
          <Input
            placeholder="history, polity, geography (comma-separated)"
            value={bulkTagInput}
            onChange={(e) => setBulkTagInput(e.target.value)}
            className="max-w-[350px]"
          />
          <Button size="sm" onClick={handleBulkTag} disabled={isPending}>
            {isPending ? 'Assigning...' : 'Assign Tags'}
          </Button>
        </div>
      )}

      {editingQuestion && (
        <QuestionDialog
          tests={tests}
          initialData={editingQuestion}
          open={!!editingQuestion}
          onOpenChange={(open) => { if (!open) setEditingQuestion(null) }}
          trigger={<span className="hidden" />}
        />
      )}

      <div className="mt-2">
        <div className="mb-3">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions by text, test, or ID..."
            className="max-w-md"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Showing {filteredData.length} of {data.length} questions
          </p>
        </div>

        {/* Select All checkbox */}
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={isAllVisibleSelected}
            onChange={selectAll}
            aria-label="Select visible questions"
            className="rounded border-neutral-300"
          />
          <span className="text-xs text-muted-foreground font-medium">
            Select Visible ({filteredData.length})
          </span>
        </div>

        {/* Question rows with checkboxes */}
        <div className="space-y-1">
          {filteredData.length === 0 && (
            <div className="text-sm text-muted-foreground border rounded-xl p-6 text-center bg-white dark:bg-[#1C1C1E]">
              No questions match your search.
            </div>
          )}

          {filteredData.map((row) => (
            <div
              key={row.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedIds.has(row.id)
                ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                : 'bg-white dark:bg-[#1C1C1E] border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                }`}
            >
              <input
                type="checkbox"
                checked={activeSelectedSet.has(row.id)}
                onChange={() => toggleSelect(row.id)}
                aria-label={`Select question ${row.id}`}
                className="rounded border-neutral-300 shrink-0"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1 min-w-0" onClick={() => setEditingQuestion(row)}>
                <div className="text-sm font-medium line-clamp-1">
                  {htmlToPlainText(row.question_text) || "Untitled"}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {row.tests?.title || 'Unassigned'}
                  </span>
                  <span className="text-xs text-green-600 font-bold">+{row.marks}</span>
                  {row.negative_marks > 0 && <span className="text-xs text-red-500 font-bold">-{row.negative_marks}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
