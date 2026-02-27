'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { History, RotateCcw, Loader2 } from 'lucide-react'
import { getQuestionVersions, restoreQuestionVersion } from '@/actions/advanced-actions'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Version {
  id: string
  text: string
  difficulty: string
  created_at: string
}

export function VersionHistory({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false)
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const loadVersions = async () => {
    setLoading(true)
    const res = await getQuestionVersions(questionId)
    if (res.data) setVersions(res.data as Version[])
    setLoading(false)
  }

  const handleOpen = () => {
    setOpen(!open)
    if (!open) loadVersions()
  }

  const handleRestore = (versionId: string) => {
    startTransition(async () => {
      const res = await restoreQuestionVersion(questionId, versionId)
      if (res.error) toast.error(res.error)
      else {
        toast.success('Version restored!')
        loadVersions()
      }
    })
  }

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={handleOpen} className="gap-1 text-xs h-7">
        <History className="h-3 w-3" /> History
      </Button>

      {open && (
        <div className="mt-2 rounded-xl border border-black/5 dark:border-white/5 bg-white dark:bg-[#1C1C1E] p-3 space-y-2 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="text-center py-4"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
          ) : versions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No previous versions.</p>
          ) : (
            versions.map(v => (
              <div key={v.id} className="flex items-start gap-2 py-2 border-b border-black/[0.03] dark:border-white/[0.03] last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#1D1D1F] dark:text-white line-clamp-2">{v.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[8px] h-4">{v.difficulty}</Badge>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(v.created_at), 'MMM d, h:mm a')}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 shrink-0" onClick={() => handleRestore(v.id)} disabled={isPending}>
                  <RotateCcw className="h-3 w-3" /> Restore
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
