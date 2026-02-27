'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Shield, Clock, FileText } from 'lucide-react'
import { format } from 'date-fns'

interface AuditEntry {
  id: string
  action: string
  target_id: string | null
  details: string | null
  created_at: string
}

const actionColors: Record<string, string> = {
  'user.pro_status': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  'user.suspension': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'user.grant_pro': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'user.profile_update': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
}

export function AuditLogClient({ logs, error }: { logs: AuditEntry[]; error: string | null }) {
  const [search, setSearch] = useState('')

  const filtered = logs.filter(l =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.target_id?.toLowerCase().includes(search.toLowerCase()) ||
    l.details?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white flex items-center gap-3">
          <Shield className="h-8 w-8 text-[#0066CC]" />
          Audit Log
        </h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          Track all admin actions across the system. {logs.length} entries.
        </p>
      </div>

      {error && <p className="text-sm text-red-500">Error: {error}</p>}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search actions, targets, details…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9 rounded-xl"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground font-medium">
            {logs.length === 0
              ? 'No audit entries yet. Actions will be logged as admins use the panel.'
              : 'No matches found.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => {
            let parsedDetails: Record<string, unknown> | null = null
            try {
              if (log.details) parsedDetails = JSON.parse(log.details)
            } catch { /* ignore */ }

            return (
              <div
                key={log.id}
                className="flex items-start gap-4 p-4 rounded-2xl border border-black/5 dark:border-white/5 hover:bg-secondary/20 transition-colors"
              >
                <div className="shrink-0 mt-0.5">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] font-bold uppercase tracking-wider ${actionColors[log.action] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
                    >
                      {log.action}
                    </Badge>
                    {log.target_id && (
                      <span className="text-xs text-muted-foreground font-mono">
                        → {log.target_id.slice(0, 12)}…
                      </span>
                    )}
                  </div>
                  {parsedDetails && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {Object.entries(parsedDetails).map(([key, val]) => (
                        <span key={key} className="text-xs text-muted-foreground">
                          <span className="font-semibold">{key}:</span> {String(val)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted-foreground font-medium">
                    {format(new Date(log.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
