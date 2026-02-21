"use client"

import { ColumnDef } from "@tanstack/react-table"
import { QuestionFormValues } from "@/lib/validations/question"
import { MoreHorizontal, Pencil, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteQuestion } from "@/actions/question-actions"
import { toast } from "sonner"
import { QuestionDialog } from "./question-dialog"
import { useState } from "react"

export type Question = QuestionFormValues & {
  id: string
  tests?: { title: string } // Joined data
}

const QuestionActions = ({ question, tests }: { question: Question, tests: { id: string; title: string }[] }) => {
  const [showEdit, setShowEdit] = useState(false)
  const [showDuplicate, setShowDuplicate] = useState(false)

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this question?")) {
      const res = await deleteQuestion(question.id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Question deleted successfully")
      }
    }
  }

  // Prepare data for duplication by giving it an empty ID
  const duplicateData: QuestionFormValues & { id: string } = {
    ...question,
    id: "",
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <QuestionDialog
        initialData={question}
        tests={tests}
        open={showEdit}
        onOpenChange={setShowEdit}
        trigger={<span className="hidden" />}
      />
      <QuestionDialog
        initialData={duplicateData}
        tests={tests}
        open={showDuplicate}
        onOpenChange={setShowDuplicate}
        trigger={<span className="hidden" />}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setShowEdit(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowDuplicate(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy mr-2 h-4 w-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export const createColumns = (tests: { id: string; title: string }[]): ColumnDef<Question>[] => [
  {
    accessorKey: "question_text",
    header: "Question",
    cell: ({ row }) => <div className="max-w-[300px] truncate" title={row.original.question_text}>{row.original.question_text}</div>
  },
  {
    accessorKey: "tests.title",
    header: "Test",
    cell: ({ row }) => row.original.tests?.title || "N/A"
  },
  {
    accessorKey: "marks",
    header: "Marks",
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: () => "MCQ" // Hardcoded for now as we only support MCQ
  },
  {
    id: "actions",
    cell: ({ row }) => <QuestionActions question={row.original} tests={tests} />
  },
]
