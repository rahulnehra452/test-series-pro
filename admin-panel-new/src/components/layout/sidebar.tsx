'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Library,
  BookOpen,
  FileText,
  Users,
  BarChart3,
  Settings,
  ShieldAlert,
  GraduationCap,
  Database
} from 'lucide-react'

const sidebarItems = [
  {
    category: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ]
  },
  {
    category: 'Content',
    items: [
      { name: 'Exam Categories', href: '/dashboard/exams', icon: GraduationCap },
      { name: 'Test Series', href: '/dashboard/series', icon: Library },
      { name: 'Tests', href: '/dashboard/tests', icon: FileText },
      { name: 'Question Bank', href: '/dashboard/questions', icon: Database },
    ]
  },
  {
    category: 'Operations',
    items: [
      { name: 'Users', href: '/dashboard/users', icon: Users },
      { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    ]
  },
  {
    category: 'System',
    items: [
      { name: 'Configuration', href: '/dashboard/config', icon: Settings },
      { name: 'Admin Settings', href: '/dashboard/admin-users', icon: ShieldAlert },
    ]
  }
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight text-primary">
          Test Series Pro
        </h1>
        <p className="text-xs text-muted-foreground">Admin Panel</p>
      </div>

      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-4 text-sm font-medium">
          {sidebarItems.map((group, index) => (
            <div key={index} className="mb-6">
              <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.category}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                        pathname === item.href
                          ? "bg-secondary text-primary"
                          : "text-muted-foreground hover:bg-secondary/50"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t p-4">
        <div className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-medium text-primary">AD</span>
          </div>
          <div>
            <p className="text-sm font-medium">Admin User</p>
            <p className="text-xs text-muted-foreground">Super Admin</p>
          </div>
        </div>
      </div>
    </div>
  )
}
