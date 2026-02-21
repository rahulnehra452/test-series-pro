"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns, type Profile } from "./columns"

interface UsersClientProps {
  data: Profile[]
}

export function UsersClient({ data }: UsersClientProps) {
  return (
    <>
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
        <p className="text-muted-foreground">Manage user subscriptions, suspensions, and activity.</p>
      </div>
      <DataTable columns={columns} data={data} filterKey="email" />
    </>
  )
}
