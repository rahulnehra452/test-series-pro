"use client"

import { ColumnDef } from "@tanstack/react-table"
import { TestSeriesFormValues } from "@/lib/validations/test-series"
import { MoreHorizontal, Pencil, Trash, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteTestSeries, duplicateTestSeries } from "@/actions/test-series-actions"
import { toast } from "sonner"
import { TestSeriesDialog } from "./test-series-dialog"
import { useState } from "react"
import { useRouter } from "next/navigation"

export type TestSeries = TestSeriesFormValues & {
  id: string
  exams?: { title: string } // Joined data
}

const TestSeriesActions = ({ series, exams }: { series: TestSeries, exams: { id: string; title: string }[] }) => {
  const router = useRouter()
  const [showEdit, setShowEdit] = useState(false)

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this test series?")) {
      const res = await deleteTestSeries(series.id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Test Series deleted successfully")
      }
    }
  }

  const handleDuplicate = async () => {
    toast.loading("Duplicating series…")
    const res = await duplicateTestSeries(series.id)
    toast.dismiss()
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Test series duplicated!")
      router.refresh()
    }
  }

  return (
    <>
      <TestSeriesDialog
        initialData={series}
        exams={exams}
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
          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

// We need to pass the exams list to the columns definition to pass to the edit dialog
// This is a bit tricky with basic columns. We can use a factory function or just props in the component that renders DataTable.
// For now, let's keep it simple: we might not be able to edit directly from here effectively without context.
// Actually, we can just pass the exams list to the page and render the actions there, but DataTable is generic.
// A common pattern is to make the `columns` definition receive the extra data or use a custom Cell component that uses a hook/context.
// SIMPLEST FIX: The Page Component will create the columns array dynamically with the exams data.

export const createColumns = (exams: { id: string; title: string }[]): ColumnDef<TestSeries>[] => [
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "exams.title", // Accessing joined data
    header: "Exam Category",
    cell: ({ row }) => row.original.exams?.title || "N/A"
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => {
      const price = parseFloat(`${row.original.price}`)
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(price)
      return price === 0 ? "Free" : formatted
    }
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
    cell: ({ row }) => <TestSeriesActions series={row.original} exams={exams} />
  },
]
