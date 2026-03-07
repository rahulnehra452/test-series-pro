"use server"

import { adminUserSchema, AdminUserFormValues } from "@/lib/validations/admin-user"
import { revalidatePath } from "next/cache"
import { requireSuperAdmin } from "@/lib/auth/admin"

// Note: Creating a new user in Supabase Auth requires using the service_role key to bypass "signup" restrictions if we want to add admins directly.
// OR we can use the `supabase.auth.admin.createUser` API if we have the service role client.
// The standard `createClient` usually uses the anon key or user token.
// For Admin Panel, to create OTHER admins, we likely need a service role client or `supabase.auth.signUp` (if open) but that logs them in.
// Best practice: Use a Service Role client for user management.
// Since I don't have the SERVICE_ROLE_KEY in environment variables explicitly confirmed, I'll attempt to use the standard client but check permissions.
// actually, usually for internal tools we assume the user executing this is a Super Admin.
// But `auth.admin` functions are not available in the public client.
// I WILL ASSUME `process.env.SUPABASE_SERVICE_ROLE_KEY` is available or I cannot create auth users.
// If it fails, I'll return an error saying "Service Role Key missing".

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  : null

export async function createAdminUser(data: AdminUserFormValues) {
  if (!supabaseAdmin) {
    return { error: "Server configuration error: Service Role Key missing." }
  }

  const result = adminUserSchema.safeParse(data)
  if (!result.success) {
    return { error: "Invalid input data" }
  }

  try {
    await requireSuperAdmin()
    const password = data.password?.trim()
    if (!password || password.length < 6) {
      return { error: "Password is required and must be at least 6 characters." }
    }

    // 1. Create Auth User
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name }
    })

    if (authError) throw authError
    if (!authUser.user) throw new Error("Failed to create auth user")

    // 2. Create Admin User Profile
    const { error: profileError } = await supabaseAdmin.from('admin_users').insert({
      user_id: authUser.user.id,
      full_name: data.full_name,
      role: data.role,
      is_active: data.is_active ?? true,
    })

    if (profileError) {
      // Rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      throw profileError
    }

    revalidatePath('/dashboard/admin-users')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create admin user"
    return { error: message }
  }
}

export async function updateAdminUser(id: string, data: AdminUserFormValues) {
  const result = adminUserSchema.safeParse(data)
  if (!result.success) {
    return { error: "Invalid input data" }
  }

  try {
    const { supabase } = await requireSuperAdmin()

    const { data: adminUser, error: fetchError } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !adminUser) throw new Error("Admin user not found")

    // Update public profile
    const { error: updateError } = await supabase.from('admin_users').update({
      full_name: data.full_name,
      role: data.role,
      is_active: data.is_active,
    }).eq('id', id)

    if (updateError) throw updateError

    // Update Auth Data (Email/Password) - Needs Service Role
    if (supabaseAdmin && (data.password || data.email)) {
      const updates: Record<string, string> = {}
      if (data.email) updates.email = data.email
      if (data.password && data.password.length >= 6) updates.password = data.password

      if (Object.keys(updates).length > 0) {
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
          adminUser.user_id,
          updates
        )
        if (authUpdateError) throw authUpdateError
      }
    }

    revalidatePath('/dashboard/admin-users')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update admin user"
    return { error: message }
  }
}

export async function deleteAdminUser(id: string) {
  // Use service role to delete from Auth (which cascades to admin_users via foreign key)
  if (!supabaseAdmin) {
    return { error: "Server configuration error: Service Role Key missing." }
  }

  try {
    const { supabase, user } = await requireSuperAdmin()

    // Get auth user id
    const { data: adminUser, error: fetchError } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !adminUser) throw new Error("Admin user not found")

    if (adminUser.user_id === user.id) {
      return { error: "You cannot delete your own super admin account." }
    }

    // Delete from Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(adminUser.user_id)

    if (deleteError) throw deleteError

    revalidatePath('/dashboard/admin-users')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete admin user"
    return { error: message }
  }
}
