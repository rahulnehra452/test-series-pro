import { createClient } from "@/lib/supabase/server"

export type AdminRole =
  | "super_admin"
  | "content_manager"
  | "moderator"
  | "support_agent"

type AdminRow = {
  id: string
  user_id: string
  role: AdminRole
  full_name: string | null
  is_active: boolean
}

export async function getCurrentAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return null

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("id, user_id, role, full_name, is_active")
    .eq("user_id", user.id)
    .maybeSingle<AdminRow>()

  if (adminError || !admin || !admin.is_active) return null

  return { supabase, user, admin }
}

export async function requireAdmin() {
  const currentAdmin = await getCurrentAdmin()
  if (!currentAdmin) {
    throw new Error("Access denied. Admin privileges required.")
  }
  return currentAdmin
}

export async function requireAdminRole(allowedRoles: AdminRole[]) {
  const currentAdmin = await requireAdmin()
  if (!allowedRoles.includes(currentAdmin.admin.role)) {
    throw new Error(`Access denied. Allowed roles: ${allowedRoles.join(", ")}.`)
  }
  return currentAdmin
}

export async function requireSuperAdmin() {
  const currentAdmin = await requireAdmin()
  if (currentAdmin.admin.role !== "super_admin") {
    throw new Error("Access denied. Super admin privileges required.")
  }
  return currentAdmin
}
