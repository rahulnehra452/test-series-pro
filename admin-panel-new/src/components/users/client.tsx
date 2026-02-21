"use client"

import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  is_pro: boolean
  created_at: string
  last_active_at: string | null
}

const columns: ColumnDef<Profile>[] = [
  {
    accessorKey: "full_name",
    header: "Name",
    cell: ({ row }) => row.original.full_name || "N/A",
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.original.email || "N/A",
  },
  {
    accessorKey: "is_pro",
    header: "Plan",
    cell: ({ row }) => (
      <Badge variant={row.original.is_pro ? "default" : "secondary"}>
        {row.original.is_pro ? "PRO" : "Free"}
      </Badge>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Joined",
    cell: ({ row }) =>
      format(new Date(row.original.created_at), "MMM d, yyyy"),
  },
  {
    accessorKey: "last_active_at",
    header: "Last Active",
    cell: ({ row }) =>
      row.original.last_active_at
        ? format(new Date(row.original.last_active_at), "MMM d, HH:mm")
        : "Never",
  },
]

interface UsersClientProps {
  data: Profile[]
}

export function UsersClient({ data }: UsersClientProps) {
  return (
    <>
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
        <p className="text-muted-foreground">Registered students and activity.</p>
      </div>
      <DataTable columns={columns} data={data} filterKey="email" />
    </>
  )
}
