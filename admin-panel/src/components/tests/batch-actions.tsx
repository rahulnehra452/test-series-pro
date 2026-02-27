'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Trash2, ToggleRight, ToggleLeft, Loader2, GripVertical } from 'lucide-react'
import { batchToggleTests, batchDeleteTests, reorderTests } from '@/actions/advanced-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Test {
  id: string
  title: string
  is_active: boolean
  sort_order: number
}

export function BatchTestActions({ tests, seriesId }: { tests: Test[]; seriesId?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggleAll = () => {
    if (selected.size === tests.length) setSelected(new Set())
    else setSelected(new Set(tests.map(t => t.id)))
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleActivate = () => {
    startTransition(async () => {
      const res = await batchToggleTests(Array.from(selected), true)
      if (res.error) toast.error(res.error)
      else { toast.success(`${res.count} tests activated`); setSelected(new Set()); router.refresh() }
    })
  }

  const handleDeactivate = () => {
    startTransition(async () => {
      const res = await batchToggleTests(Array.from(selected), false)
      if (res.error) toast.error(res.error)
      else { toast.success(`${res.count} tests deactivated`); setSelected(new Set()); router.refresh() }
    })
  }

  const handleDelete = () => {
    if (!confirm(`Delete ${selected.size} tests? This cannot be undone.`)) return
    startTransition(async () => {
      const res = await batchDeleteTests(Array.from(selected))
      if (res.error) toast.error(res.error)
      else { toast.success(`${res.count} tests deleted`); setSelected(new Set()); router.refresh() }
    })
  }

  const moveUp = (index: number) => {
    if (index === 0 || !seriesId) return
    const ids = tests.map(t => t.id)
      ;[ids[index], ids[index - 1]] = [ids[index - 1], ids[index]]
    startTransition(async () => {
      await reorderTests(seriesId, ids)
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {/* Batch toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <Badge variant="secondary" className="text-xs font-bold">{selected.size} selected</Badge>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 rounded-lg" onClick={handleActivate} disabled={isPending}>
            <ToggleRight className="h-3 w-3 text-green-600" /> Activate
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 rounded-lg" onClick={handleDeactivate} disabled={isPending}>
            <ToggleLeft className="h-3 w-3 text-gray-400" /> Deactivate
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 rounded-lg text-red-500 hover:text-red-600" onClick={handleDelete} disabled={isPending}>
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      )}

      {/* Test list with checkboxes and reordering */}
      <div className="space-y-1">
        <div className="flex items-center px-3 py-1">
          <button onClick={toggleAll} className={`h-4 w-4 rounded border-2 mr-3 flex items-center justify-center shrink-0 ${selected.size === tests.length ? 'border-[#0066CC] bg-[#0066CC]' : 'border-gray-300 dark:border-gray-600'}`}>
            {selected.size === tests.length && <Check className="h-3 w-3 text-white" />}
          </button>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select All</span>
        </div>

        {tests.map((test, i) => (
          <div key={test.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${selected.has(test.id) ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'hover:bg-secondary/20'}`}>
            <button onClick={() => toggleOne(test.id)} className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${selected.has(test.id) ? 'border-[#0066CC] bg-[#0066CC]' : 'border-gray-300 dark:border-gray-600'}`}>
              {selected.has(test.id) && <Check className="h-3 w-3 text-white" />}
            </button>

            {seriesId && (
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveUp(i)} disabled={i === 0 || isPending} className="text-muted-foreground hover:text-[#1D1D1F] disabled:opacity-20" title="Move up">
                  <GripVertical className="h-3 w-3" />
                </button>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#1D1D1F] dark:text-white truncate">{test.title}</p>
            </div>

            <Badge variant={test.is_active ? 'default' : 'secondary'} className={`text-[9px] ${test.is_active ? 'bg-green-600 text-white' : ''}`}>
              {test.is_active ? 'Active' : 'Draft'}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
