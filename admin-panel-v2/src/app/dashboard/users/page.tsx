import { createAdminClient } from "@/lib/supabase/admin"
import { UsersClient } from "@/components/users/client"

export default async function UsersPage() {
  const supabase = createAdminClient()

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error("Users fetch error:", error)
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">Registered students and activity.</p>
        </div>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h3 className="text-lg font-semibold">Could not load users</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Make sure the RLS policy &quot;Admins can view all profiles&quot; is applied.
            Run the <code className="text-xs bg-muted px-1 py-0.5 rounded">2026-02-19_admin_panel_rls.sql</code> migration.
          </p>
          <p className="text-xs text-muted-foreground mt-2">Error: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <UsersClient data={profiles || []} />
    </div>
  )
}
