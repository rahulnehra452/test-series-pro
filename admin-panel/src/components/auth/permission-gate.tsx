'use client'

import { createContext, useContext, ReactNode } from 'react'
import { AdminRole } from '@/lib/auth/admin'
import { Permission, hasPermission, hasAnyPermission } from '@/lib/auth/permissions'

// Context to provide the current admin role across client components
const AdminRoleContext = createContext<AdminRole | null>(null)

export function AdminRoleProvider({ role, children }: { role: AdminRole; children: ReactNode }) {
  return (
    <AdminRoleContext.Provider value={role}>
      {children}
    </AdminRoleContext.Provider>
  )
}

export function useAdminRole(): AdminRole | null {
  return useContext(AdminRoleContext)
}

/**
 * PermissionGate — Only renders children if the current admin has the required permission(s).
 *
 * Usage:
 * <PermissionGate permission="content.delete">
 *   <DeleteButton />
 * </PermissionGate>
 *
 * Or with multiple permissions (any match):
 * <PermissionGate permissions={['users.edit', 'users.suspend']} require="any">
 *   <EditSection />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  permissions,
  require = 'any',
  fallback = null,
  children,
}: {
  permission?: Permission
  permissions?: Permission[]
  require?: 'any' | 'all'
  fallback?: ReactNode
  children: ReactNode
}) {
  const role = useAdminRole()
  if (!role) return <>{fallback}</>

  if (permission) {
    return hasPermission(role, permission) ? <>{children}</> : <>{fallback}</>
  }

  if (permissions) {
    if (require === 'all') {
      return permissions.every(p => hasPermission(role, p)) ? <>{children}</> : <>{fallback}</>
    }
    return hasAnyPermission(role, permissions) ? <>{children}</> : <>{fallback}</>
  }

  return <>{children}</>
}
