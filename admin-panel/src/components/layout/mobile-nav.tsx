'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationCenter } from '@/components/notification-center'

const mobileLinks = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Performance', href: '/dashboard/performance' },
  { name: 'Exams', href: '/dashboard/exams' },
  { name: 'Series', href: '/dashboard/series' },
  { name: 'Tests', href: '/dashboard/tests' },
  { name: 'Questions', href: '/dashboard/questions' },
  { name: 'Bulk Manager', href: '/dashboard/questions/bulk' },
  { name: 'AI Generator', href: '/dashboard/ai-generator' },
  { name: 'Users', href: '/dashboard/users' },
  { name: 'Subscriptions', href: '/dashboard/subscriptions' },
  { name: 'Analytics', href: '/dashboard/analytics' },
  { name: 'Push Notifications', href: '/dashboard/notifications' },
  { name: 'Marketing Hub', href: '/dashboard/coupons' },
  { name: 'Data Center', href: '/dashboard/export' },
  { name: 'Webhooks', href: '/dashboard/webhooks' },
  { name: 'Audit Log', href: '/dashboard/audit' },
  { name: 'Config', href: '/dashboard/config' },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

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
              {mobileLinks.map(link => {
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
