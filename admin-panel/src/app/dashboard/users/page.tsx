import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { UsersClientEnhanced } from "@/components/users/users-enhanced-client"

export default async function UsersPage() {
  await requireAdminRole(["super_admin", "moderator", "support_agent"])
  const supabase = createAdminClient()

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h3 className="text-lg font-semibold">Could not load users</h3>
          <p className="text-xs text-muted-foreground mt-2">Error: {error.message}</p>
        </div>
      </div>
    )
  }

  // Bug 8: Merge emails from auth.users since profiles table may not store them
  let enrichedProfiles = profiles || []
  try {
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (authData?.users) {
      const emailMap = new Map(authData.users.map(u => [u.id, u.email]))
      enrichedProfiles = enrichedProfiles.map(p => ({
        ...p,
        email: p.email || emailMap.get(p.id) || null,
      }))
    }
  } catch {
    // If auth admin call fails, continue with profiles as-is
  }

  return <UsersClientEnhanced initialData={enrichedProfiles} />
}
