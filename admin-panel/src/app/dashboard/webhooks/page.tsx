'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Webhook, Plus, Trash2, Globe, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface WebhookConfig {
  id: string
  name: string
  url: string
  events: string[]
  active: boolean
}

const STORAGE_KEY = 'testkra_webhooks'

const EVENT_OPTIONS = [
  'user.created', 'user.pro_granted', 'user.suspended',
  'test.created', 'test.published', 'test.deleted',
  'attempt.completed', 'coupon.redeemed',
]

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set())

  const save = (items: WebhookConfig[]) => {
    setWebhooks(items)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }

  const handleCreate = () => {
    if (!name || !url) return toast.error('Name and URL are required')
    if (selectedEvents.size === 0) return toast.error('Select at least one event')
    const newWebhook: WebhookConfig = {
      id: Math.random().toString(36).slice(2),
      name, url,
      events: Array.from(selectedEvents),
      active: true,
    }
    save([...webhooks, newWebhook])
    toast.success('Webhook created!')
    setName(''); setUrl(''); setSelectedEvents(new Set()); setShowForm(false)
  }

  const handleDelete = (id: string) => {
    save(webhooks.filter(w => w.id !== id))
    toast.success('Webhook deleted')
  }

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev => {
      const next = new Set(prev)
      if (next.has(event)) next.delete(event); else next.add(event)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg">
              <Webhook className="h-6 w-6 text-white" />
            </div>
            Webhooks
          </h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">Send real-time events to external services (Slack, Zapier, etc.).</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white">
          <Plus className="h-4 w-4" /> Add Webhook
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-2xl border border-black/5 dark:border-white/5">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Slack Notifications" className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Endpoint URL</Label>
                <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://hooks.slack.com/..." className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Events</Label>
              <div className="flex flex-wrap gap-2">
                {EVENT_OPTIONS.map(event => (
                  <button key={event} onClick={() => toggleEvent(event)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${selectedEvents.has(event)
                      ? 'bg-[#0066CC] text-white border-[#0066CC]'
                      : 'border-black/10 dark:border-white/10 text-muted-foreground hover:bg-secondary/50'}`}>
                    {event}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleCreate} className="gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white">
              <Plus className="h-4 w-4" /> Create Webhook
            </Button>
          </CardContent>
        </Card>
      )}

      {webhooks.length === 0 ? (
        <div className="text-center py-20">
          <Globe className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">No webhooks configured</h3>
          <p className="text-sm text-muted-foreground mt-1">Add a webhook to send events to external services.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(w => (
            <Card key={w.id} className="rounded-2xl border border-black/5 dark:border-white/5">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-900/30">
                  <Zap className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1D1D1F] dark:text-white">{w.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">{w.url}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {w.events.map(e => <Badge key={e} variant="secondary" className="text-[9px]">{e}</Badge>)}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(w.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
