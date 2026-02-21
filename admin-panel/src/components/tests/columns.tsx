"use client"

import { ColumnDef } from "@tanstack/react-table"
import { TestFormValues } from "@/lib/validations/test"
import { MoreHorizontal, Pencil, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteTest } from "@/actions/test-actions"
import { toast } from "sonner"
import { TestDialog } from "./test-dialog"
import { useState } from "react"

export type Test = TestFormValues & {
  id: string
  test_series?: { title: string } // Joined data
}

const TestActions = ({ test, seriesList }: { test: Test, seriesList: { id: string; title: string }[] }) => {
  const [showEdit, setShowEdit] = useState(false)

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this test?")) {
      const res = await deleteTest(test.id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Test deleted successfully")
      }
    }
  }

  return (
    <>
      <TestDialog
        initialData={test}
        seriesList={seriesList}
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
          <DropdownMenuItem onClick={() => window.location.href = `/dashboard/tests/${test.id}/builder`} className="text-blue-600 focus:text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" /></svg>
            Section Builder
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

export const createColumns = (seriesList: { id: string; title: string }[]): ColumnDef<Test>[] => [
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "test_series.title", // Accessing joined data
    header: "Test Series",
    cell: ({ row }) => row.original.test_series?.title || "N/A"
  },
  {
    accessorKey: "duration_minutes",
    header: "Duration",
    cell: ({ row }) => `${row.original.duration_minutes} min`
  },
  {
    accessorKey: "total_marks",
    header: "Marks",
    cell: ({ row }) => row.original.total_marks
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => (
      <div className={`text-xs font-semibold px-2 py-1 rounded-full w-fit ${row.original.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {row.original.is_active ? 'Active' : 'Inactive'}
      </div>
    )
  },
  {
    id: "actions",
    cell: ({ row }) => <TestActions test={row.original} seriesList={seriesList} />
  },
]
