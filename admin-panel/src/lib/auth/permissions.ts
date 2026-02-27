/**
 * Role-Based Access Control (RBAC) — Granular Permission Matrix
 *
 * Roles:
 *  - super_admin:    Full access to everything
 *  - content_manager: Manage content (exams, series, tests, questions)
 *  - moderator:      View content + manage users + handle reports
 *  - support_agent:  View-only + user support actions
 */

import { AdminRole } from "@/lib/auth/admin"

// Permission identifiers
export type Permission =
  // Content
  | 'content.create'
  | 'content.edit'
  | 'content.delete'
  | 'content.view'
  | 'content.bulk_manage'
  | 'content.ai_generate'
  // Users
  | 'users.view'
  | 'users.edit'
  | 'users.suspend'
  | 'users.grant_pro'
  | 'users.delete'
  // Subscriptions
  | 'subscriptions.view'
  | 'subscriptions.manage'
  // System
  | 'system.config'
  | 'system.admin_users'
  | 'system.audit_log'
  | 'system.analytics'
  // Reports
  | 'reports.view'
  | 'reports.resolve'

// The permission matrix — which roles get which permissions
const PERMISSION_MATRIX: Record<AdminRole, Permission[]> = {
  super_admin: [
    'content.create', 'content.edit', 'content.delete', 'content.view', 'content.bulk_manage', 'content.ai_generate',
    'users.view', 'users.edit', 'users.suspend', 'users.grant_pro', 'users.delete',
    'subscriptions.view', 'subscriptions.manage',
    'system.config', 'system.admin_users', 'system.audit_log', 'system.analytics',
    'reports.view', 'reports.resolve',
  ],
  content_manager: [
    'content.create', 'content.edit', 'content.delete', 'content.view', 'content.bulk_manage', 'content.ai_generate',
    'system.analytics',
  ],
  moderator: [
    'content.view',
    'users.view', 'users.edit', 'users.suspend',
    'subscriptions.view',
    'system.analytics',
    'reports.view', 'reports.resolve',
  ],
  support_agent: [
    'content.view',
    'users.view', 'users.edit',
    'subscriptions.view',
    'reports.view',
  ],
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return PERMISSION_MATRIX[role]?.includes(permission) ?? false
}

/**
 * Check if a role has ALL of the given permissions
 */
export function hasAllPermissions(role: AdminRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p))
}

/**
 * Check if a role has ANY of the given permissions
 */
export function hasAnyPermission(role: AdminRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p))
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: AdminRole): Permission[] {
  return PERMISSION_MATRIX[role] || []
}

/**
 * Get a human-readable label for a permission
 */
export function getPermissionLabel(permission: Permission): string {
  const labels: Record<Permission, string> = {
    'content.create': 'Create Content',
    'content.edit': 'Edit Content',
    'content.delete': 'Delete Content',
    'content.view': 'View Content',
    'content.bulk_manage': 'Bulk Manage Questions',
    'content.ai_generate': 'Use AI Generator',
    'users.view': 'View Users',
    'users.edit': 'Edit Users',
    'users.suspend': 'Suspend Users',
    'users.grant_pro': 'Grant PRO Status',
    'users.delete': 'Delete Users',
    'subscriptions.view': 'View Subscriptions',
    'subscriptions.manage': 'Manage Subscriptions',
    'system.config': 'System Configuration',
    'system.admin_users': 'Manage Admin Users',
    'system.audit_log': 'View Audit Log',
    'system.analytics': 'View Analytics',
    'reports.view': 'View Reports',
    'reports.resolve': 'Resolve Reports',
  }
  return labels[permission] || permission
}
