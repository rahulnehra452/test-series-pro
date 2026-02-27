'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Send, Bell, Users, Megaphone } from 'lucide-react'
import { toast } from 'sonner'

const TEMPLATES = [
  { id: 'new_test', title: '📝 New Test Available', body: 'A new test has been published! Start practicing now.' },
  { id: 'reminder', title: '⏰ Study Reminder', body: 'Don\'t forget to practice today. Keep your streak alive!' },
  { id: 'promo', title: '🎉 Special Offer', body: 'Get PRO access at a special discount. Limited time only!' },
  { id: 'result', title: '📊 Results Published', body: 'Your test results are now available. Check your performance.' },
  { id: 'custom', title: '', body: '' },
]

export default function NotificationsPage() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState('all')
  const [sent, setSent] = useState<{ title: string; audience: string; time: string }[]>([])

  const applyTemplate = (templateId: string) => {
    const t = TEMPLATES.find(t => t.id === templateId)
    if (t && t.id !== 'custom') {
      setTitle(t.title)
      setBody(t.body)
    }
  }

  const handleSend = () => {
    if (!title.trim() || !body.trim()) return toast.error('Title and body are required')

    // In production, this would call a server action that uses Firebase Cloud Messaging or Expo Push
    // For now, simulate the send
    setSent(prev => [{ title, audience, time: new Date().toLocaleTimeString() }, ...prev])
    toast.success(`Notification sent to ${audience === 'all' ? 'all users' : audience === 'pro' ? 'PRO users' : 'free users'}!`)
    setTitle('')
    setBody('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg">
            <Megaphone className="h-6 w-6 text-white" />
          </div>
          Push Notifications
        </h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">Send push notifications to app users.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Compose */}
        <Card className="lg:col-span-3 rounded-2xl border border-black/5 dark:border-white/5">
          <CardContent className="p-6 space-y-4">
            {/* Templates */}
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Template</Label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.filter(t => t.id !== 'custom').map(t => (
                  <button key={t.id} onClick={() => applyTemplate(t.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium border border-black/10 dark:border-white/10 hover:bg-secondary/50 transition-colors">
                    {t.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title" className="rounded-xl" maxLength={100} />
              <p className="text-[10px] text-muted-foreground text-right">{title.length}/100</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Body *</Label>
              <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Notification message..." className="rounded-xl resize-none" rows={3} maxLength={500} />
              <p className="text-[10px] text-muted-foreground text-right">{body.length}/500</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Audience</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger className="rounded-xl w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="pro">PRO Users Only</SelectItem>
                  <SelectItem value="free">Free Users Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            <div className="rounded-2xl bg-secondary/30 p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preview</p>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-[#2C2C2E] shadow-sm border border-black/5 dark:border-white/5">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1D1D1F] dark:text-white">{title || 'Notification Title'}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{body || 'Notification body text...'}</p>
                </div>
              </div>
            </div>

            <Button onClick={handleSend} disabled={!title.trim() || !body.trim()} className="gap-2 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white w-full">
              <Send className="h-4 w-4" /> Send Notification
            </Button>
          </CardContent>
        </Card>

        {/* Recent */}
        <Card className="lg:col-span-2 rounded-2xl border border-black/5 dark:border-white/5">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-[#1D1D1F] dark:text-white mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" /> Recent Sends
            </h3>
            {sent.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-10">No notifications sent yet this session.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {sent.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 py-2 border-b border-black/[0.03] dark:border-white/[0.03] last:border-0">
                    <Send className="h-3 w-3 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{s.title}</p>
                      <p className="text-[10px] text-muted-foreground">{s.audience} · {s.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
