import { createClient } from "@/lib/supabase/server"
import { UsersClient } from "@/components/users/client"

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error(error)
    return <div>Failed to load users.</div>
  }

  return (
    <div className="space-y-6">
      <UsersClient data={profiles || []} />
    </div>
  )
}
