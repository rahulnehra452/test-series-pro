"use client"

import { DataTable } from "@/components/ui/data-table"
import { createColumns, Test } from "./columns"
import { TestDialog } from "./test-dialog"
import { Button } from "@/components/ui/button"
import { Download, CheckCircle, XCircle, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTransition } from "react"
import { batchToggleTests, batchDeleteTests } from "@/actions/advanced-actions"
import { useRouter } from "next/navigation"

interface TestsClientProps {
  data: Test[]
  seriesList: { id: string; title: string }[]
}

type TableRow = { original: { id: string } }
type TableLike = {
  getFilteredSelectedRowModel: () => { rows: TableRow[] }
  toggleAllRowsSelected: (selected: boolean) => void
}

export function TestsClient({ data, seriesList }: TestsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const columns = createColumns(seriesList)

  const handleBulkAction = (
    table: TableLike,
    action: 'activate' | 'deactivate' | 'delete'
  ) => {
    const selectedIds = table.getFilteredSelectedRowModel().rows.map((row) => row.original.id)
    if (selectedIds.length === 0) return

    if (action === 'delete' && !confirm(`Delete ${selectedIds.length} tests? This cannot be undone.`)) return

    startTransition(async () => {
      let res
      if (action === 'activate') res = await batchToggleTests(selectedIds, true)
      else if (action === 'deactivate') res = await batchToggleTests(selectedIds, false)
      else res = await batchDeleteTests(selectedIds)

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Bulk action completed for ${selectedIds.length} items`)
        table.toggleAllRowsSelected(false)
        router.refresh()
      }
    })
  }

  const handleExport = () => {
    if (data.length === 0) return toast.error('No tests to export')
    const cols: (keyof Test)[] = ['id', 'title', 'duration_minutes', 'total_marks', 'pass_marks', 'is_active']
    const header = cols.join(',')
    const lines = data.map(r => cols.map(c => {
      const v = r[c]
      if (v === null || v === undefined) return ''
      const s = String(v).replace(/"/g, '""')
      return s.includes(',') || s.includes('"') ? `"${s}"` : s
    }).join(','))
    const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `tests_export_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    toast.success(`Exported ${data.length} tests`)
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tests</h2>
          <p className="text-muted-foreground">Manage individual tests within series.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <TestDialog seriesList={seriesList} />
        </div>
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
