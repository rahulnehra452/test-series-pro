"use client"

import { DataTable } from "@/components/ui/data-table"
import { createColumns, Test } from "./columns"
import { TestDialog } from "./test-dialog"

interface TestsClientProps {
  data: Test[]
  seriesList: { id: string; title: string }[]
}

export function TestsClient({ data, seriesList }: TestsClientProps) {
  const columns = createColumns(seriesList)

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tests</h2>
          <p className="text-muted-foreground">Manage individual tests within series.</p>
        </div>
        <TestDialog seriesList={seriesList} />
      </div>

      <DataTable columns={columns} data={data} filterKey="title" />
    </>
  )
}
