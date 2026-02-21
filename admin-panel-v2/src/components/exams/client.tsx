"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns, Exam } from "./columns"
import { ExamDialog } from "./exam-dialog"

interface ExamsClientProps {
  data: Exam[]
}

export function ExamsClient({ data }: ExamsClientProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Exam Categories</h2>
          <p className="text-muted-foreground">Manage primary exam categories (e.g., UPSC, SSC).</p>
        </div>
        <ExamDialog />
      </div>

      <DataTable columns={columns} data={data} filterKey="title" />
    </>
  )
}
