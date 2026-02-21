import { createClient } from "@/lib/supabase/server"
import { AdminUsersClient } from "@/components/admin-users/client"
import { AdminUser } from "@/components/admin-users/columns"

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: usersData, error } = await supabase
    .from('admin_users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return <div>Failed to load users</div>
  }

  // Without email in `admin_users`, we can't show it easily without a joined view.
  // I'll just map it to an empty string for now to satisfy the type.
  const formattedUsers: AdminUser[] = (usersData || []).map((u: any) => ({
    ...u,
    email: u.email || "Hidden (Auth)", // Placeholder
  }))

  return (
    <div className="space-y-6">
      <AdminUsersClient data={formattedUsers} />
    </div>
  )
}
