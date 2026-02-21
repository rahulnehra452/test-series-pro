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

  return (
    <>
      <QuestionDialog
        initialData={question}
        tests={tests}
        open={showEdit}
        onOpenChange={setShowEdit}
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
          <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
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
