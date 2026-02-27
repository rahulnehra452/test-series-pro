"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns, AdminUser } from "./columns" // Import from same directory
import { AdminUserDialog } from "./admin-user-dialog"
import { RolePermissionsMatrix } from "./role-permissions-matrix"

interface AdminUsersClientProps {
  data: AdminUser[]
}

export function AdminUsersClient({ data }: AdminUsersClientProps) {
  return (
    <div className="space-y-12">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Admin Users</h2>
            <p className="text-muted-foreground">Manage system administrators and content managers.</p>
          </div>
          <AdminUserDialog />
        </div>
        <DataTable columns={columns} data={data} filterKey="full_name" />
      </div>

      <RolePermissionsMatrix />
    </div>
  )
}
