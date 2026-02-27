"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns, Exam } from "./columns"
import { ExamDialog } from "./exam-dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Trash2, Loader2 } from "lucide-react"
import { useState, useTransition } from "react"
import { batchToggleExams, batchDeleteExams } from "@/actions/exam-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ExamsClientProps {
  data: Exam[]
}

export function ExamsClient({ data }: ExamsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleBulkAction = (
    table: any,
    action: 'activate' | 'deactivate' | 'delete'
  ) => {
    const selectedIds = table.getFilteredSelectedRowModel().rows.map((row: any) => row.original.id as string)
    if (selectedIds.length === 0) return

    if (action === 'delete' && !confirm(`Delete ${selectedIds.length} categories? This cannot be undone.`)) return

    startTransition(async () => {
      let res
      if (action === 'activate') res = await batchToggleExams(selectedIds, true)
      else if (action === 'deactivate') res = await batchToggleExams(selectedIds, false)
      else res = await batchDeleteExams(selectedIds)

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Bulk action completed for ${selectedIds.length} items`)
        table.toggleAllRowsSelected(false)
        router.refresh()
      }
    })
  }
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Exam Categories</h2>
          <p className="text-muted-foreground">Manage primary exam categories (e.g., UPSC, SSC).</p>
        </div>
        <ExamDialog />
      </div>

      <DataTable
        columns={columns}
        data={data}
        filterKey="title"
        toolbar={(table) => {
          const count = table.getFilteredSelectedRowModel().rows.length
          if (count === 0) return null

          return (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">{count} selected</span>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => handleBulkAction(table, 'activate')} disabled={isPending}>
                <CheckCircle className="h-4 w-4 text-green-600" /> Active
              </Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => handleBulkAction(table, 'deactivate')} disabled={isPending}>
                <XCircle className="h-4 w-4 text-amber-600" /> Inactive
              </Button>
              <div className="w-px h-4 bg-border mx-1" />
              <Button size="sm" variant="destructive" className="gap-2" onClick={() => handleBulkAction(table, 'delete')} disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </Button>
            </div>
          )
        }}
      />
    </>
  )
}
