'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Library,
  FileText,
  Users,
  BarChart3,
  Settings,
  ShieldAlert,
  GraduationCap,
  Database,
  LogOut,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type AdminRole = 'super_admin' | 'content_manager' | 'moderator' | 'support_agent';

interface SidebarItem {
  name: string;
  href: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  roles: AdminRole[];
}

interface SidebarGroup {
  category: string;
  items: SidebarItem[];
}

const sidebarItems: SidebarGroup[] = [
  {
    category: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'content_manager', 'moderator', 'support_agent'] },
    ]
  },
  {
    category: 'Content',
    items: [
      { name: 'Exam Categories', href: '/dashboard/exams', icon: GraduationCap, roles: ['super_admin', 'content_manager'] },
      { name: 'Test Series', href: '/dashboard/series', icon: Library, roles: ['super_admin', 'content_manager'] },
      { name: 'Tests', href: '/dashboard/tests', icon: FileText, roles: ['super_admin', 'content_manager'] },
      { name: 'Question Bank', href: '/dashboard/questions', icon: Database, roles: ['super_admin', 'content_manager'] },
    ]
  },
  {
    category: 'Operations',
    items: [
      { name: 'Users', href: '/dashboard/users', icon: Users, roles: ['super_admin', 'moderator', 'support_agent'] },
      { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, roles: ['super_admin', 'moderator'] },
    ]
  },
  {
    category: 'System',
    items: [
      { name: 'Configuration', href: '/dashboard/config', icon: Settings, roles: ['super_admin'] },
      { name: 'Admin Settings', href: '/dashboard/admin-users', icon: ShieldAlert, roles: ['super_admin'] },
    ]
  }
]

interface AdminInfo {
  full_name: string | null
  role: string
  email: string | null
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [admin, setAdmin] = useState<AdminInfo | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    async function loadAdminInfo() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('full_name, role')
        .eq('user_id', user.id)
        .single()

      setAdmin({
        full_name: adminUser?.full_name || user.user_metadata?.full_name || 'Admin User',
        role: adminUser?.role || 'admin',
        email: user.email || null,
      })
    }
    loadAdminInfo()
  }, [])

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = admin?.full_name
    ? admin.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD'

  const roleLabel = admin?.role
    ? admin.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : 'Admin'

  return (
    <div className="flex h-screen w-64 flex-col bg-transparent pt-4 pb-4 px-3 dark:text-neutral-300">
      <div className="p-4 mb-2">
        <h1 className="text-xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-2">
          TestKra. Admin
        </h1>
        <p className="text-xs text-muted-foreground/80 font-medium">Mission Control</p>
      </div>

      <div className="flex-1 overflow-auto py-2 hide-scrollbar">
        <nav className="grid items-start px-2 text-sm font-medium">
          {sidebarItems.map((group, index) => {
            const filteredItems = group.items.filter(i =>
              admin?.role ? i.roles.includes(admin.role as AdminRole) : false
            )

            if (filteredItems.length === 0 && admin !== null) return null

            return (
              <div key={index} className="mb-6">
                <h3 className="mb-2 px-3 text-[0.65rem] font-bold text-[#86868B] dark:text-[#98989D] uppercase tracking-widest">
                  {group.category}
                </h3>
                <div className="space-y-[2px]">
                  {filteredItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                          isActive
                            ? "bg-white dark:bg-[#2C2C2E] shadow-sm text-black dark:text-white font-semibold"
                            : "text-[#4b4b4d] dark:text-[#A1A1A6] hover:bg-white/50 dark:hover:bg-[#2c2c2e]/50 hover:text-black dark:hover:text-white"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", isActive ? "text-[#0066CC]" : "opacity-70")} />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto px-2">
        <div className="rounded-2xl bg-white/60 dark:bg-[#1C1C1E]/60 p-4 border border-black/5 dark:border-white/5 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#0066CC] to-[#5AC8FA] flex items-center justify-center text-white shadow-sm ring-2 ring-white/50 dark:ring-black/50">
              <span className="text-xs font-bold">{initials}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate text-[#1D1D1F] dark:text-white">{admin?.full_name || 'Admin User'}</p>
              <p className="text-[10px] text-[#86868B] truncate font-medium uppercase tracking-wider">{roleLabel}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-8 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-500/10 dark:hover:bg-red-500/20"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}
