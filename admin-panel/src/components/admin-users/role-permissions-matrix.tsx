"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { HelpTooltip } from "@/components/ui/help-tooltip"
import { toast } from "sonner"
import { Shield } from "lucide-react"

const roles = [
  { id: "super_admin", label: "Super Admin", color: "bg-red-100 text-red-800" },
  { id: "content_manager", label: "Content Manager", color: "bg-blue-100 text-blue-800" },
  { id: "moderator", label: "Moderator", color: "bg-amber-100 text-amber-800" },
  { id: "support_agent", label: "Support Agent", color: "bg-green-100 text-green-800" }
]

const permissions = [
  { id: "view_dashboard", label: "Access Dashboard", desc: "Basic access to admin dashboard" },
  { id: "manage_content", label: "Manage Content", desc: "Create, edit, or delete exams/tests" },
  { id: "manage_users", label: "Manage Users", desc: "Suspend students, reset passwords" },
  { id: "view_analytics", label: "View Analytics", desc: "See performance and revenue reports" },
  { id: "export_data", label: "Export Data", desc: "Export table data as CSV" },
  { id: "manage_settings", label: "Platform Settings", desc: "Change environment and platform config" },
  { id: "manage_admins", label: "Manage Admins", desc: "Create or revoke admin access" }
]

// Current default state based on our requireAdminRole middleware usage
const defaultMatrix = {
  super_admin: ["view_dashboard", "manage_content", "manage_users", "view_analytics", "export_data", "manage_settings", "manage_admins"],
  content_manager: ["view_dashboard", "manage_content", "export_data"],
  moderator: ["view_dashboard", "manage_users", "view_analytics"],
  support_agent: ["view_dashboard", "manage_users"]
}

export function RolePermissionsMatrix() {
  const handleToggle = (role: string, permission: string, currentVal: boolean) => {
    // We are simulating the update for Phase 4 UI requirement
    // In a full implementation, this would call a server action to update the `role_permissions` table
    if (role === "super_admin" && !currentVal) {
      toast.error("Super Admin permissions cannot be revoked")
      return
    }
    toast.info("Database update simulated: RBAC policies require a backend migration phase to take effect.")
  }

  return (
    <Card className="mt-8 border-slate-200 shadow-sm dark:border-slate-800">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-500" />
          <CardTitle>Role Access Matrix</CardTitle>
        </div>
        <CardDescription>
          View and manage the granular permissions granted to each administrative role.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-semibold w-[300px]">Permission</th>
                {roles.map(role => (
                  <th key={role.id} className="px-6 py-4 font-semibold text-center whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-md ${role.color}`}>{role.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {permissions.map((perm) => (
                <tr key={perm.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground mb-1">
                      {perm.label}
                      <HelpTooltip text={perm.desc} />
                    </div>
                  </td>
                  {roles.map(role => {
                    const hasPerm = defaultMatrix[role.id as keyof typeof defaultMatrix].includes(perm.id)
                    const disabled = role.id === "super_admin"
                    return (
                      <td key={`${role.id}-${perm.id}`} className="px-6 py-4 text-center">
                        <Switch
                          checked={hasPerm}
                          disabled={disabled}
                          onCheckedChange={(checked) => handleToggle(role.id, perm.id, checked)}
                          className={disabled ? "opacity-50" : ""}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
