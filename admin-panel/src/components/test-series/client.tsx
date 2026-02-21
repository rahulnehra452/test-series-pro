"use client"

import { DataTable } from "@/components/ui/data-table"
import { createColumns, TestSeries } from "./columns"
import { TestSeriesDialog } from "./test-series-dialog"

interface SeriesClientProps {
  data: TestSeries[]
  exams: { id: string; title: string }[]
}

export function SeriesClient({ data, exams }: SeriesClientProps) {
  const columns = createColumns(exams)

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Test Series</h2>
          <p className="text-muted-foreground">Manage test bundles and packages.</p>
        </div>
        <TestSeriesDialog exams={exams} />
      </div>

      <DataTable columns={columns} data={data} filterKey="title" />
    </>
  )
}
