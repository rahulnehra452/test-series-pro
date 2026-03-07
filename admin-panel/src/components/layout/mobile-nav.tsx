'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationCenter } from '@/components/notification-center'
import { createClient } from '@/lib/supabase/client'

type AdminRole = 'super_admin' | 'content_manager' | 'moderator' | 'support_agent'

const mobileLinks: { name: string; href: string; roles: AdminRole[] }[] = [
  { name: 'Dashboard', href: '/dashboard', roles: ['super_admin', 'content_manager', 'moderator', 'support_agent'] },
  { name: 'Performance', href: '/dashboard/performance', roles: ['super_admin', 'moderator'] },
  { name: 'Exams', href: '/dashboard/exams', roles: ['super_admin', 'content_manager'] },
  { name: 'Series', href: '/dashboard/series', roles: ['super_admin', 'content_manager'] },
  { name: 'Tests', href: '/dashboard/tests', roles: ['super_admin', 'content_manager'] },
  { name: 'Questions', href: '/dashboard/questions', roles: ['super_admin', 'content_manager'] },
  { name: 'Bulk Manager', href: '/dashboard/questions/bulk', roles: ['super_admin', 'content_manager'] },
  { name: 'Bulk Upload', href: '/dashboard/questions/upload', roles: ['super_admin', 'content_manager'] },
  { name: 'AI Generator', href: '/dashboard/ai-generator', roles: ['super_admin', 'content_manager'] },
  { name: 'Users', href: '/dashboard/users', roles: ['super_admin', 'moderator', 'support_agent'] },
  { name: 'Subscriptions', href: '/dashboard/subscriptions', roles: ['super_admin', 'moderator'] },
  { name: 'Analytics', href: '/dashboard/analytics', roles: ['super_admin', 'moderator'] },
  { name: 'Push Notifications', href: '/dashboard/notifications', roles: ['super_admin'] },
  { name: 'Marketing Hub', href: '/dashboard/coupons', roles: ['super_admin'] },
  { name: 'Data Center', href: '/dashboard/export', roles: ['super_admin'] },
  { name: 'Webhooks', href: '/dashboard/webhooks', roles: ['super_admin'] },
  { name: 'Audit Log', href: '/dashboard/audit', roles: ['super_admin'] },
  { name: 'Config', href: '/dashboard/config', roles: ['super_admin'] },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const [role, setRole] = useState<AdminRole | null>(null)

  useEffect(() => {
    async function loadRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data?.role) setRole(data.role as AdminRole)
    }
    loadRole()
  }, [])

  const visibleLinks = role
    ? mobileLinks.filter((link) => link.roles.includes(role))
    : mobileLinks.filter((link) => link.href === '/dashboard')

  return (
    <>
      {/* Top bar — mobile only */}
      <div className="fixed top-0 left-0 right-0 z-50 lg:hidden flex items-center justify-between px-4 py-2 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <h1 className="text-sm font-extrabold tracking-tight text-[#1D1D1F] dark:text-white">TestKra Admin</h1>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationCenter />
        </div>
      </div>

      {/* Slide-out menu */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />
          <div className="fixed top-12 left-0 bottom-0 z-50 w-64 bg-white dark:bg-[#1C1C1E] border-r border-black/5 dark:border-white/5 overflow-y-auto py-4 px-3 lg:hidden animate-in slide-in-from-left duration-200">
            <nav className="space-y-1">
              {visibleLinks.map(link => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`block px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive
                      ? 'bg-[#0066CC]/10 text-[#0066CC] dark:text-[#5AC8FA] font-semibold'
                      : 'text-[#4b4b4d] dark:text-[#A1A1A6] hover:bg-secondary/50'
                      }`}
                  >
                    {link.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </>
      )}
    </>
  )
}
