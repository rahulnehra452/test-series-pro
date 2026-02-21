"use client"

import { ColumnDef } from "@tanstack/react-table"
import { AdminUserFormValues } from "@/lib/validations/admin-user"
import { MoreHorizontal, Pencil, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteAdminUser } from "@/actions/admin-user-actions"
import { toast } from "sonner"
import { AdminUserDialog } from "./admin-user-dialog"
import { useState } from "react"

export type AdminUser = AdminUserFormValues & {
  id: string
}

const AdminUserActions = ({ user }: { user: AdminUser }) => {
  const [showEdit, setShowEdit] = useState(false)

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this user?")) {
      const res = await deleteAdminUser(user.id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("User deleted successfully")
      }
    }
  }

  return (
    <>
      <AdminUserDialog
        initialData={user}
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

export const columns: ColumnDef<AdminUser>[] = [
  {
    accessorKey: "full_name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <span className="capitalize">{row.original.role.replace('_', ' ')}</span>
    )
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
    cell: ({ row }) => <AdminUserActions user={row.original} />
  },
]
