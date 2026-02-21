"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns, AdminUser } from "./columns" // Import from same directory
import { AdminUserDialog } from "./admin-user-dialog"

interface AdminUsersClientProps {
  data: AdminUser[]
}

export function AdminUsersClient({ data }: AdminUsersClientProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Users</h2>
          <p className="text-muted-foreground">Manage system administrators and content managers.</p>
        </div>
        <AdminUserDialog />
      </div>

      <DataTable columns={columns} data={data} filterKey="full_name" />
    </>
  )
}
