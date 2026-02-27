'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Search,
  Plus,
  ArrowRight,
  Calendar,
  Tag,
  AlertTriangle,
  PieChart,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface CommandItem {
  id: string
  label: string
  icon: React.ElementType
  href?: string
  action?: () => void
  group: string
  keywords?: string[]
}

/* ------------------------------------------------------------------ */
/* Static items                                                        */
/* ------------------------------------------------------------------ */

const navigationItems: CommandItem[] = [
  { id: 'nav-dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', group: 'Navigation', keywords: ['home', 'overview'] },
  { id: 'nav-exams', label: 'Exam Categories', icon: GraduationCap, href: '/dashboard/exams', group: 'Navigation', keywords: ['exam', 'category'] },
  { id: 'nav-series', label: 'Test Series', icon: Library, href: '/dashboard/series', group: 'Navigation', keywords: ['series'] },
  { id: 'nav-tests', label: 'Tests', icon: FileText, href: '/dashboard/tests', group: 'Navigation', keywords: ['test'] },
  { id: 'nav-questions', label: 'Question Bank', icon: Database, href: '/dashboard/questions', group: 'Navigation', keywords: ['question', 'bank'] },
  { id: 'nav-bulk', label: 'Bulk Question Manager', icon: Database, href: '/dashboard/questions/bulk', group: 'Navigation', keywords: ['bulk', 'spreadsheet', 'manager'] },
  { id: 'nav-users', label: 'Users', icon: Users, href: '/dashboard/users', group: 'Navigation', keywords: ['user', 'student'] },
  { id: 'nav-analytics', label: 'Analytics', icon: BarChart3, href: '/dashboard/analytics', group: 'Navigation', keywords: ['analytics', 'stats', 'chart'] },
  { id: 'nav-config', label: 'Configuration', icon: Settings, href: '/dashboard/config', group: 'Navigation', keywords: ['config', 'settings'] },
  { id: 'nav-admin', label: 'Admin Settings', icon: ShieldAlert, href: '/dashboard/admin-users', group: 'Navigation', keywords: ['admin', 'user', 'role'] },
  { id: 'nav-tags', label: 'Tag Manager', icon: Tag, href: '/dashboard/tags', group: 'Navigation', keywords: ['tag'] },
  { id: 'nav-calendar', label: 'Publishing Calendar', icon: Calendar, href: '/dashboard/calendar', group: 'Navigation', keywords: ['calendar', 'schedule'] },
  { id: 'nav-reports', label: 'Reported Questions', icon: AlertTriangle, href: '/dashboard/reports', group: 'Navigation', keywords: ['report', 'flag'] },
  { id: 'nav-difficulty', label: 'Difficulty Analytics', icon: PieChart, href: '/dashboard/difficulty', group: 'Navigation', keywords: ['difficulty', 'distribution'] },
  { id: 'nav-subscriptions', label: 'Subscriptions', icon: BarChart3, href: '/dashboard/subscriptions', group: 'Navigation', keywords: ['subscription', 'payment', 'revenue', 'pro'] },
  { id: 'nav-audit', label: 'Audit Log', icon: ShieldAlert, href: '/dashboard/audit', group: 'Navigation', keywords: ['audit', 'log', 'history', 'activity'] },
  { id: 'nav-ai', label: 'AI Question Generator', icon: GraduationCap, href: '/dashboard/ai-generator', group: 'Navigation', keywords: ['ai', 'generate', 'auto', 'artificial', 'intelligence'] },
]

const quickActions: CommandItem[] = [
  { id: 'action-create-exam', label: 'Create Exam Category', icon: Plus, href: '/dashboard/exams?action=create', group: 'Quick Actions', keywords: ['new', 'add', 'exam'] },
  { id: 'action-create-series', label: 'Create Test Series', icon: Plus, href: '/dashboard/series?action=create', group: 'Quick Actions', keywords: ['new', 'add', 'series'] },
  { id: 'action-create-test', label: 'Create Test', icon: Plus, href: '/dashboard/tests?action=create', group: 'Quick Actions', keywords: ['new', 'add', 'test'] },
  { id: 'action-create-question', label: 'Create Question', icon: Plus, href: '/dashboard/questions?action=create', group: 'Quick Actions', keywords: ['new', 'add', 'question'] },
]

const allItems = [...navigationItems, ...quickActions]

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // ⌘K / Ctrl+K to open
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => {
          if (!prev) {
            setQuery('')
            setSelectedIndex(0)
          }
          return !prev
        })
      }
      // Escape to close
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open])

  // Focus input when opened — use a ref to track previous state
  const prevOpenRef = useRef(open)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Just opened — focus the input after a tick
      setTimeout(() => inputRef.current?.focus(), 50)
    }
    prevOpenRef.current = open
  }, [open])

  // Filter items
  const filtered = allItems.filter((item) => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      item.label.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q) ||
      item.keywords?.some((k) => k.includes(q))
    )
  })

  // Group filtered items
  const groups = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})

  // Execute selection
  const execute = useCallback(
    (item: CommandItem) => {
      setOpen(false)
      if (item.href) router.push(item.href)
      if (item.action) item.action()
    },
    [router],
  )

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault()
      execute(filtered[selectedIndex])
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[20vh]">
        <div
          className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl shadow-2xl animate-in slide-in-from-top-2 fade-in duration-200"
          onKeyDown={handleKeyDown}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 px-4 py-3">
            <Search className="h-5 w-5 text-muted-foreground/60 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              placeholder="Search pages, actions, and more…"
              className="flex-1 bg-transparent text-[15px] font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            />
            <kbd className="hidden md:inline-flex items-center gap-0.5 rounded-md border border-black/10 dark:border-white/10 bg-secondary/50 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[340px] overflow-y-auto py-2 px-2">
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground font-medium">
                No results found.
              </div>
            ) : (
              Object.entries(groups).map(([group, items]) => (
                <div key={group} className="mb-2 last:mb-0">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    {group}
                  </div>
                  {items.map((item) => {
                    const globalIndex = filtered.indexOf(item)
                    const Icon = item.icon
                    const isSelected = globalIndex === selectedIndex
                    return (
                      <button
                        key={item.id}
                        data-index={globalIndex}
                        onClick={() => execute(item)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors duration-100 ${isSelected
                          ? 'bg-[#0066CC]/10 dark:bg-[#0066CC]/20 text-[#0066CC] dark:text-[#5AC8FA]'
                          : 'text-foreground/80 hover:bg-secondary/50'
                          }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isSelected
                            ? 'bg-[#0066CC]/15 dark:bg-[#0066CC]/25'
                            : 'bg-secondary/60 dark:bg-white/5'
                            }`}
                        >
                          <Icon className={`h-4 w-4 ${isSelected ? 'text-[#0066CC] dark:text-[#5AC8FA]' : 'text-muted-foreground'}`} />
                        </div>
                        <span className="flex-1 truncate">{item.label}</span>
                        {isSelected && (
                          <ArrowRight className="h-3.5 w-3.5 text-[#0066CC] dark:text-[#5AC8FA] shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-black/5 dark:border-white/5 px-4 py-2.5 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
            <span>TestKra Command Palette</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5">
                <kbd className="rounded border border-black/10 dark:border-white/10 bg-secondary/50 px-1 py-0.5">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-0.5">
                <kbd className="rounded border border-black/10 dark:border-white/10 bg-secondary/50 px-1 py-0.5">↵</kbd>
                select
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
