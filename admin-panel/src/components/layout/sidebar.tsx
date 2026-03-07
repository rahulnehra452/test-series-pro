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
  Zap,
  CreditCard,
  Shield,
  Sparkles,
  ChevronDown,
  HelpCircle,
  UploadCloud,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuickCreateWizard } from '@/components/tests/quick-create-wizard'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationCenter } from '@/components/notification-center'

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
      { name: 'Performance', href: '/dashboard/performance', icon: BarChart3, roles: ['super_admin', 'moderator'] },
    ]
  },
  {
    category: 'Content',
    items: [
      { name: 'Exam Categories', href: '/dashboard/exams', icon: GraduationCap, roles: ['super_admin', 'content_manager'] },
      { name: 'Test Series', href: '/dashboard/series', icon: Library, roles: ['super_admin', 'content_manager'] },
      { name: 'Tests', href: '/dashboard/tests', icon: FileText, roles: ['super_admin', 'content_manager'] },
      { name: 'Question Bank', href: '/dashboard/questions', icon: Database, roles: ['super_admin', 'content_manager'] },
      { name: 'Bulk Manager', href: '/dashboard/questions/bulk', icon: Database, roles: ['super_admin', 'content_manager'] },
      { name: 'Bulk Upload', href: '/dashboard/questions/upload', icon: UploadCloud, roles: ['super_admin', 'content_manager'] },
      { name: 'AI Generator', href: '/dashboard/ai-generator', icon: Sparkles, roles: ['super_admin', 'content_manager'] },
    ]
  },
  {
    category: 'Operations',
    items: [
      { name: 'Users', href: '/dashboard/users', icon: Users, roles: ['super_admin', 'moderator', 'support_agent'] },
      { name: 'Subscriptions', href: '/dashboard/subscriptions', icon: CreditCard, roles: ['super_admin', 'moderator'] },
      { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, roles: ['super_admin', 'moderator'] },
      { name: 'Push Notifications', href: '/dashboard/notifications', icon: Sparkles, roles: ['super_admin'] },
    ]
  },
  {
    category: 'System',
    items: [
      { name: 'Configuration', href: '/dashboard/config', icon: Settings, roles: ['super_admin'] },
      { name: 'Marketing Hub', href: '/dashboard/coupons', icon: CreditCard, roles: ['super_admin'] },
      { name: 'Data Center', href: '/dashboard/export', icon: Database, roles: ['super_admin'] },
      { name: 'Webhooks', href: '/dashboard/webhooks', icon: Settings, roles: ['super_admin'] },
      { name: 'Admin Settings', href: '/dashboard/admin-users', icon: ShieldAlert, roles: ['super_admin'] },
      { name: 'Audit Log', href: '/dashboard/audit', icon: Shield, roles: ['super_admin'] },
    ]
  },
  {
    category: 'Advanced Tools',
    items: [
      { name: 'Tag Manager', href: '/dashboard/tags', icon: Database, roles: ['super_admin', 'content_manager'] },
      { name: 'Publishing Calendar', href: '/dashboard/calendar', icon: LayoutDashboard, roles: ['super_admin', 'content_manager'] },
      { name: 'Reported Questions', href: '/dashboard/reports', icon: ShieldAlert, roles: ['super_admin', 'moderator'] },
      { name: 'Difficulty Analytics', href: '/dashboard/difficulty', icon: BarChart3, roles: ['super_admin'] },
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
  const [wizardOpen, setWizardOpen] = useState(false)

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  // Improvement 1: Collapsible sidebar sections
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sidebar_collapsed')
      if (stored) {
        // eslint-disable-next-line
        setCollapsedSections(new Set(JSON.parse(stored)))
      }
    } catch {
      // Do nothing
    }
  }, [])

  const toggleSection = (category: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      localStorage.setItem('sidebar_collapsed', JSON.stringify([...next]))
      return next
    })
  }

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

      {/* Quick Create Button */}
      <div className="px-4 mb-4">
        <Button
          onClick={() => setWizardOpen(true)}
          className="w-full justify-center gap-2 h-9 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white text-xs font-semibold shadow-sm"
        >
          <Zap className="h-3.5 w-3.5" />
          Quick Create
        </Button>
      </div>

      <QuickCreateWizard open={wizardOpen} onOpenChange={setWizardOpen} />

      <div className="flex-1 overflow-y-auto pb-4 hide-scrollbar flex flex-col w-full">
        <nav className="grid items-start px-2 text-sm font-medium">
          {sidebarItems.map((group, index) => {
            // Bug 1: Show all links while admin is loading, filter once loaded
            const filteredItems = admin === null
              ? group.items  // Show all while loading
              : group.items.filter(i => i.roles.includes(admin.role as AdminRole))

            if (filteredItems.length === 0 && admin !== null) return null

            return (
              <div key={index} className="mb-4">
                <button
                  onClick={() => toggleSection(group.category)}
                  className="flex items-center justify-between w-full mb-1.5 px-3 py-1 rounded-lg hover:bg-white/30 dark:hover:bg-white/5 transition-colors group"
                >
                  <h3 className="text-[0.65rem] font-bold text-[#86868B] dark:text-[#98989D] uppercase tracking-widest">
                    {group.category}
                  </h3>
                  <ChevronDown className={cn(
                    "h-3 w-3 text-[#86868B] transition-transform duration-200",
                    collapsedSections.has(group.category) && "-rotate-90"
                  )} />
                </button>
                {!collapsedSections.has(group.category) && (
                  <div className="space-y-[2px]">
                    {filteredItems.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setWizardOpen(false)}
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
                )}
              </div>
            )
          })}
        </nav>

        {/* Bottom Cards: Now embedded inside the scroll container so they aren't static */}
        <div className="mt-auto px-2 space-y-3 pt-6">
          {/* Theme & Notification bar */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/40 dark:bg-white/5 border border-black/5 dark:border-white/5">
            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <span className="text-[10px] font-semibold text-muted-foreground hidden xl:inline">Theme</span>
            </div>
            <Link href="/dashboard/help" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mr-1">
              <span className="text-[10px] font-semibold hidden xl:inline">Help</span>
              <HelpCircle className="h-4 w-4" />
            </Link>
            <NotificationCenter />
          </div>

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
    </div>
  )
}
