import { createAdminClient } from "@/lib/supabase/admin"
import { AdminUsersClient } from "@/components/admin-users/client"
import type { AdminUser } from "@/components/admin-users/columns"

export default async function AdminUsersPage() {
  const supabase = createAdminClient()

  const { data: usersData, error } = await supabase
    .from('admin_users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    // RLS may block reads with anon key — show a helpful message instead of crashing
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Users</h2>
          <p className="text-muted-foreground">Manage system administrators and content managers.</p>
        </div>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Could not load admin users. Make sure you are logged in as a Super Admin
            and the <code className="text-xs bg-muted px-1 py-0.5 rounded">admin_users</code> table has proper RLS policies.
          </p>
          <p className="text-xs text-muted-foreground mt-2">Error: {error.message || JSON.stringify(error)}</p>
        </div>
      </div>
    )
  }

  const formattedUsers: AdminUser[] = (usersData || []).map((u: Record<string, unknown>) => ({
    ...u,
    email: (u.email as string) || "Hidden (Auth)",
  })) as AdminUser[]

  return (
    <div className="space-y-6">
      <AdminUsersClient data={formattedUsers} />
    </div>
  )
}
