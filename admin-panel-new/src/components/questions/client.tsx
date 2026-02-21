"use client"

import { DataTable } from "@/components/ui/data-table"
import { createColumns, Question } from "./columns"
import { QuestionDialog } from "./question-dialog"

interface QuestionsClientProps {
  data: Question[]
  tests: { id: string; title: string }[]
}

export function QuestionsClient({ data, tests }: QuestionsClientProps) {
  const columns = createColumns(tests)

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Question Bank</h2>
          <p className="text-muted-foreground">Manage questions for your tests.</p>
        </div>
        <QuestionDialog tests={tests} />
      </div>

      <DataTable columns={columns} data={data} filterKey="question_text" />
    </>
  )
}
