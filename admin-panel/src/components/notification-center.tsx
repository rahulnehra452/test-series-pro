'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, X, CheckCheck, Info, AlertTriangle, Crown, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

interface Notification {
  id: string
  type: 'info' | 'warning' | 'success' | 'action'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

const STORAGE_KEY = 'testkra_admin_notifications'

// System-generated notifications based on dashboard context
function generateSystemNotifications(): Notification[] {
  return [
    {
      id: 'welcome',
      type: 'info',
      title: 'Welcome to TestKra Admin',
      message: 'Phase 3 features are now live — AI Question Generator, Dark Mode, and more.',
      timestamp: new Date(),
      read: false,
    },
  ]
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored).map((n: Notification) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }))
        setNotifications(parsed)
      } else {
        const initial = generateSystemNotifications()
        setNotifications(initial)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
      }
    } catch {
      setNotifications(generateSystemNotifications())
    }
  }, [])

  // Save to localStorage
  const save = useCallback((items: Notification[]) => {
    setNotifications(items)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAllRead = () => {
    save(notifications.map(n => ({ ...n, read: true })))
  }

  const clearAll = () => {
    save([])
  }

  const dismiss = (id: string) => {
    save(notifications.filter(n => n.id !== id))
  }

  // Add notification externally (can be called via window event)
  useEffect(() => {
    const handler = (e: CustomEvent<Omit<Notification, 'id' | 'timestamp' | 'read'>>) => {
      const newNotif: Notification = {
        ...e.detail,
        id: Math.random().toString(36).slice(2),
        timestamp: new Date(),
        read: false,
      }
      save([newNotif, ...notifications])
    }
    window.addEventListener('testkra-notification' as string, handler as EventListener)
    return () => window.removeEventListener('testkra-notification' as string, handler as EventListener)
  }, [notifications, save])

  const iconForType = (type: Notification['type']) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case 'success': return <CheckCheck className="h-4 w-4 text-green-500" />
      case 'action': return <Crown className="h-4 w-4 text-purple-500" />
      default: return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-xl relative"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown — opens UPWARD since bell is at bottom of sidebar */}
          <div className="absolute left-0 bottom-full mb-2 z-50 w-[380px] rounded-2xl border border-black/5 dark:border-white/5 bg-white dark:bg-[#1C1C1E] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/5">
              <h3 className="text-sm font-bold text-[#1D1D1F] dark:text-white">Notifications</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllRead} className="text-[10px] h-6 gap-1 font-semibold text-[#0066CC]">
                    <CheckCheck className="h-3 w-3" /> Mark all read
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAll} className="text-[10px] h-6 gap-1 font-semibold text-muted-foreground">
                    <Trash2 className="h-3 w-3" /> Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[360px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-medium">All caught up!</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-black/[0.03] dark:border-white/[0.03] hover:bg-secondary/20 transition-colors ${!n.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                  >
                    <div className="mt-0.5 shrink-0">{iconForType(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${!n.read ? 'text-[#1D1D1F] dark:text-white' : 'text-muted-foreground'}`}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1 font-medium">
                        {format(n.timestamp, 'MMM d · HH:mm')}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100" onClick={() => dismiss(n.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Helper to push notifications from anywhere in the app
export function pushNotification(notification: {
  type: 'info' | 'warning' | 'success' | 'action'
  title: string
  message: string
}) {
  window.dispatchEvent(new CustomEvent('testkra-notification', { detail: notification }))
}
