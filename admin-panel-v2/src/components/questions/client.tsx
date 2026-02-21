"use client"

import { DataTable } from "@/components/ui/data-table"
import { createColumns, Question } from "./columns"
import { QuestionDialog } from "./question-dialog"
import { BulkUploadDialog } from "./bulk-upload-dialog"
import { useState } from "react"

interface QuestionsClientProps {
  data: Question[]
  tests: { id: string; title: string }[]
}

export function QuestionsClient({ data, tests }: QuestionsClientProps) {
  const columns = createColumns(tests)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white">Question Bank</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">Manage and bulk import questions for your tests.</p>
        </div>
        <div className="flex items-center gap-3">
          <BulkUploadDialog tests={tests} onSuccess={() => window.location.reload()} />
          <QuestionDialog tests={tests} />
        </div>
      </div>

      {editingQuestion && (
        <QuestionDialog
          tests={tests}
          initialData={editingQuestion}
          open={!!editingQuestion}
          onOpenChange={(open) => { if (!open) setEditingQuestion(null) }}
          trigger={<span className="hidden" />}
        />
      )}

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={data}
          filterKey="question_text"
          onRowClick={(row) => setEditingQuestion(row)}
        />
      </div>
    </>
  )
}
