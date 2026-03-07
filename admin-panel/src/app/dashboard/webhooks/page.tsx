"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Webhook, Plus, Trash2, Globe, Zap, MoreVertical, Copy, Eye, EyeOff, Edit, ShieldCheck, Check, BookOpen, Layers, MessageSquare, Database, Terminal } from "lucide-react"
import { toast } from "sonner"

interface WebhookConfig {
  id: string
  name: string
  url: string
  events: string[]
  active: boolean
  secret: string
}

const STORAGE_KEY = "testkra_webhooks"

const EVENT_CATEGORIES = [
  {
    name: "User Events",
    events: ["user.created", "user.pro_granted", "user.suspended", "user.deleted"],
  },
  {
    name: "Test Events",
    events: ["test.created", "test.published", "test.deleted", "test.updated"],
  },
  {
    name: "Activity Events",
    events: ["attempt.started", "attempt.completed", "coupon.redeemed"],
  },
]

const ALL_EVENTS = EVENT_CATEGORIES.flatMap((c) => c.events)

const generateSecret = () => Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>(() => {
    if (typeof window === "undefined") return []
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    } catch {
      return []
    }
  })

  // Tab State for Documentation
  const [activeTab, setActiveTab] = useState<'endpoints' | 'documentation'>('endpoints')

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form State
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set())

  // Visibility State for Secrets
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set())

  const save = (items: WebhookConfig[]) => {
    setWebhooks(items)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }

  const openModal = (webhook?: WebhookConfig) => {
    if (webhook) {
      setEditingId(webhook.id)
      setName(webhook.name)
      setUrl(webhook.url)
      setSelectedEvents(new Set(webhook.events))
    } else {
      setEditingId(null)
      setName("")
      setUrl("")
      setSelectedEvents(new Set())
    }
    setModalOpen(true)
  }

  const handleSaveWebhook = () => {
    if (!name.trim() || !url.trim()) return toast.error("Name and URL are required")
    if (selectedEvents.size === 0) return toast.error("Select at least one event")
    try {
      new URL(url)
    } catch {
      return toast.error("Please enter a valid URL (e.g., https://example.com/webhook)")
    }

    if (editingId) {
      save(
        webhooks.map((w) =>
          w.id === editingId
            ? { ...w, name: name.trim(), url: url.trim(), events: Array.from(selectedEvents) }
            : w
        )
      )
      toast.success("Webhook updated!")
    } else {
      const newWebhook: WebhookConfig = {
        id: Math.random().toString(36).slice(2),
        name: name.trim(),
        url: url.trim(),
        events: Array.from(selectedEvents),
        active: true,
        secret: `whsec_${generateSecret()}`,
      }
      save([newWebhook, ...webhooks])
      toast.success("Webhook created!")
    }
    setModalOpen(false)
  }

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this webhook?")) return
    save(webhooks.filter((w) => w.id !== id))
    toast.success("Webhook deleted")
  }

  const toggleActive = (id: string, active: boolean) => {
    save(webhooks.map((w) => (w.id === id ? { ...w, active } : w)))
    toast.success(`Webhook ${active ? "enabled" : "disabled"}`)
  }

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(event)) next.delete(event)
      else next.add(event)
      return next
    })
  }

  const toggleAllEvents = () => {
    if (selectedEvents.size === ALL_EVENTS.length) {
      setSelectedEvents(new Set())
    } else {
      setSelectedEvents(new Set(ALL_EVENTS))
    }
  }

  const toggleSecretVisibility = (id: string) => {
    setVisibleSecrets((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
              <Webhook className="h-6 w-6 text-white" />
            </div>
            Endpoints
          </h2>
          <p className="text-sm font-medium text-muted-foreground mt-2">
            Automate workflows by integrating Testkra with external services.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'endpoints' && (
            <Button onClick={() => openModal()} className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-11 px-6 transition-all active:scale-95">
              <Plus className="h-4 w-4" /> Add Endpoint
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl w-fit border dark:border-white/5">
        <button
          onClick={() => setActiveTab('endpoints')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'endpoints' ? 'bg-white dark:bg-neutral-800 shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Zap className="h-4 w-4" /> Endpoints
        </button>
        <button
          onClick={() => setActiveTab('documentation')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'documentation' ? 'bg-white dark:bg-neutral-800 shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <BookOpen className="h-4 w-4" /> Documentation
        </button>
      </div>

      {activeTab === 'endpoints' ? (
        <>
          {webhooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center border-2 border-dashed rounded-3xl bg-neutral-50/50 dark:bg-neutral-900/20 border-neutral-200 dark:border-neutral-800 animate-in fade-in duration-500 delay-150 fill-mode-both">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" />
                <div className="h-20 w-20 bg-white dark:bg-neutral-900 rounded-3xl shadow-xl flex items-center justify-center relative border border-black/5 dark:border-white/5">
                  <Globe className="h-10 w-10 text-indigo-500" />
                </div>
                <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-purple-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-neutral-950 animate-bounce">
                  <Zap className="h-4 w-4 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-[#1D1D1F] dark:text-white">No endpoints configured</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
                Webhooks allow you to build or set up integrations which subscribe to certain events on Testkra. When one of those events is triggered, we&apos;ll send a HTTP payload to the webhook&apos;s configured URL.
              </p>
              <Button onClick={() => openModal()} variant="outline" className="mt-8 rounded-xl h-11 px-6 border-indigo-200 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                Create your first endpoint
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {webhooks.map((w) => (
                <Card key={w.id} className="rounded-2xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden transition-all hover:shadow-md group">
                  <div className={`h-1.5 w-full transition-colors duration-300 ${w.active ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-neutral-200 dark:bg-neutral-800'}`} />
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

                      {/* Info Section */}
                      <div className="flex-1 min-w-0 space-y-4">
                        <div className="flex items-start justify-between sm:justify-start gap-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className={`text-lg font-bold truncate transition-colors ${w.active ? 'text-[#1D1D1F] dark:text-white' : 'text-muted-foreground'}`}>{w.name}</h3>
                              <Badge variant={w.active ? "default" : "secondary"} className={`text-[10px] uppercase font-bold tracking-wider transition-colors ${w.active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-transparent hover:bg-emerald-200' : ''}`}>
                                {w.active ? 'Active' : 'Disabled'}
                              </Badge>
                            </div>
                            <div className={`flex items-center gap-2 mt-1.5 text-sm group/url transition-colors ${w.active ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                              <Globe className="h-3.5 w-3.5 shrink-0" />
                              <span className="font-mono truncate">{w.url}</span>
                              <button onClick={() => copyToClipboard(w.url, 'URL')} title="Copy URL" aria-label="Copy URL" className="opacity-0 group-hover/url:opacity-100 transition-opacity p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Mobile Actions Overlay */}
                          <div className="flex sm:hidden items-center gap-3">
                            <Switch checked={w.active} onCheckedChange={(c) => toggleActive(w.id, c)} />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                <DropdownMenuItem onClick={() => openModal(w)} className="gap-2 font-medium">
                                  <Edit className="h-4 w-4 text-muted-foreground" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(w.id)} className="gap-2 font-medium text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400">
                                  <Trash2 className="h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Secret Key Section */}
                        <div className={`bg-neutral-50 dark:bg-[#1C1C1E] rounded-xl p-3 border dark:border-neutral-800 flex items-center justify-between gap-4 max-w-xl transition-opacity ${w.active ? 'opacity-100' : 'opacity-60'}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-1.5 bg-white dark:bg-neutral-900 rounded-md shadow-sm border border-black/5 dark:border-white/5 shrink-0">
                              <ShieldCheck className={`h-4 w-4 ${w.active ? 'text-indigo-500' : 'text-muted-foreground'}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Signing Secret</p>
                              <div className="font-mono text-xs sm:text-sm text-[#1D1D1F] dark:text-neutral-300 truncate">
                                {visibleSecrets.has(w.id) ? w.secret : "whsec_" + "•".repeat(32)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => toggleSecretVisibility(w.id)}>
                              {visibleSecrets.has(w.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => copyToClipboard(w.secret, 'Signing Secret')}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Events Tags */}
                        <div className={`transition-opacity ${w.active ? 'opacity-100' : 'opacity-50'}`}>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Subscribed Events ({w.events.length})</p>
                          <div className="flex flex-wrap gap-1.5">
                            {w.events.map((e) => (
                              <Badge key={e} variant="secondary" className="font-mono text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20 border-indigo-100 dark:border-indigo-500/20">
                                {e}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Desktop Actions */}
                      <div className="hidden sm:flex items-center gap-4 shrink-0">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`switch-${w.id}`} className="text-xs font-semibold text-muted-foreground cursor-pointer">
                            {w.active ? 'Active' : 'Inactive'}
                          </Label>
                          <Switch id={`switch-${w.id}`} checked={w.active} onCheckedChange={(c) => toggleActive(w.id, c)} />
                        </div>
                        <div className="h-8 w-px bg-border mx-2" />
                        <Button variant="outline" size="sm" onClick={() => openModal(w)} className="rounded-lg h-9">
                          <Edit className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-xl">
                            <DropdownMenuItem onClick={() => handleDelete(w.id)} className="gap-2 font-medium text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400">
                              <Trash2 className="h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Documentation Tab View */
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="border shadow-none rounded-3xl overflow-hidden bg-white dark:bg-black/40">
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-6 sm:p-10 border-b dark:border-white/5 relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-3xl font-extrabold text-[#1D1D1F] dark:text-white mb-3">Understanding Webhooks</h3>
                <p className="text-muted-foreground max-w-3xl text-sm sm:text-base leading-relaxed">
                  Webhooks act as automated push notifications from Testkra to other services across the internet. Instead of another service constantly asking your server for updates (polling), Testkra proactively pushes a JSON payload to your Endpoint URL the precise moment an event occurs.
                </p>
              </div>
              {/* Decorative background logo/icon */}
              <Webhook className="absolute -right-10 -top-10 h-64 w-64 text-indigo-500/5 rotate-12" />
            </div>
            <CardContent className="p-6 sm:p-10 space-y-12">

              <div>
                <h4 className="text-xl font-bold text-[#1D1D1F] dark:text-white mb-6">Popular Integration Examples</h4>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Example 1 */}
                  <div className="space-y-4 p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border dark:border-white/5">
                    <div className="h-12 w-12 rounded-[14px] bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border border-blue-200 dark:border-blue-800 shadow-sm">
                      <Layers className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h5 className="font-bold text-[#1D1D1F] dark:text-white mb-1">Automation Apps</h5>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Connect to apps like <b>Zapier</b> or <b>Make.com</b> via their <i>Catch Hook</i> triggers. E.g., When <code className="text-[11px] bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded font-mono border">user.pro_granted</code> fires, send a customized welcome email using Mailchimp.
                      </p>
                    </div>
                  </div>

                  {/* Example 2 */}
                  <div className="space-y-4 p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border dark:border-white/5">
                    <div className="h-12 w-12 rounded-[14px] bg-green-100 dark:bg-green-900/30 flex items-center justify-center border border-green-200 dark:border-green-800 shadow-sm">
                      <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h5 className="font-bold text-[#1D1D1F] dark:text-white mb-1">Team Chat Alerts</h5>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Paste an <i>Incoming Webhook URL</i> from <b>Slack</b> or <b>Discord</b>. Get pinged in a #sales channel instantly when a high-value <code className="text-[11px] bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded font-mono border">coupon.redeemed</code> event happens.
                      </p>
                    </div>
                  </div>

                  {/* Example 3 */}
                  <div className="space-y-4 p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border dark:border-white/5">
                    <div className="h-12 w-12 rounded-[14px] bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center border border-orange-200 dark:border-orange-800 shadow-sm">
                      <Database className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h5 className="font-bold text-[#1D1D1F] dark:text-white mb-1">CRM & Custom Backend</h5>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Integrate directly with <b>HubSpot</b> or an <b>AWS Lambda</b> script. Sync user data when <code className="text-[11px] bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded font-mono border">user.created</code> occurs to enrich your sales analytics.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div>
                <h4 className="text-xl font-bold text-[#1D1D1F] dark:text-white mb-5 flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-indigo-500" /> Understanding Data Payloads
                </h4>
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      When a subscribed event occurs, Testkra creates an <b>Event Object</b> containing all context about the action.
                    </p>
                    <p>
                      This object is sent via an HTTP <code>POST</code> request to your endpoint URL, formatted as JSON.
                    </p>
                    <p>
                      Your receiving server must respond with a <code>2xx</code> HTTP status code (like <code>200 OK</code>) quickly to acknowledge receipt. If it times out or returns an error, we may attempt to retry delivery later.
                    </p>
                  </div>
                  <div className="bg-neutral-950 rounded-xl border border-neutral-800 p-5 overflow-x-auto shadow-xl shadow-black/20">
                    <div className="flex gap-2 mb-3">
                      <div className="h-3 w-3 rounded-full bg-red-500/80" />
                      <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                      <div className="h-3 w-3 rounded-full bg-green-500/80" />
                    </div>
                    <pre className="text-xs sm:text-sm text-[#4ade80] font-mono leading-relaxed">
                      {`{
  "id": "evt_1M5WzU2eZvKYlo2C",
  "type": "user.pro_granted",
  "created_at": "2026-03-07T12:00:00Z",
  "data": {
    "user_id": "usr_948jdhx82",
    "email": "student@example.com",
    "plan": "premium_yearly"
  }
}`}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="h-14 w-14 shrink-0 rounded-2xl bg-white dark:bg-black/50 flex items-center justify-center border shadow-sm">
                    <ShieldCheck className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-lg font-bold text-[#1D1D1F] dark:text-white">Verifying Signatures</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
                      To ensure that incoming webhooks are strictly originating from Testkra and haven&apos;t been tampered with, every endpoint generates a unique <b>Signing Secret</b> (visible in the Endpoints view).
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
                      Every HTTP payload Testkra sends will include a header, <code className="text-indigo-800 dark:text-indigo-300 font-mono text-xs bg-indigo-100/50 dark:bg-indigo-900/50 px-1 py-0.5 rounded">Testkra-Signature</code>, generated using HMAC SHA-256 with your payload and secret. You should compute this same hash on your server securely and match them.
                    </p>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0 rounded-[24px]">
          <DialogHeader className="p-6 pb-4 border-b bg-neutral-50/50 dark:bg-neutral-900/20">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Zap className="h-5 w-5 text-indigo-500" />
              {editingId ? "Edit Endpoint" : "Add Endpoint"}
            </DialogTitle>
            <DialogDescription>
              Set up a new webhook to listen to events on Testkra.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* General Info */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">1</span>
                Endpoint Details
              </h4>
              <div className="grid gap-4 sm:grid-cols-2 ml-7">
                <div className="space-y-1.5 whitespace-nowrap">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Production Slack Alerts" className="rounded-xl h-11" />
                </div>
                <div className="space-y-1.5 whitespace-nowrap">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Endpoint URL</Label>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/webhook" className="rounded-xl h-11 font-mono text-sm" type="url" />
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Event Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">2</span>
                  Events to send
                </h4>
                <Button variant="ghost" size="sm" onClick={toggleAllEvents} className="text-xs font-semibold h-8 rounded-lg">
                  {selectedEvents.size === ALL_EVENTS.length ? "Clear All" : "Select All"}
                </Button>
              </div>

              <div className="ml-7 space-y-6">
                {EVENT_CATEGORIES.map((category) => (
                  <div key={category.name} className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{category.name}</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {category.events.map((event) => {
                        const isSelected = selectedEvents.has(event)
                        return (
                          <div
                            key={event}
                            onClick={() => toggleEvent(event)}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${isSelected
                                ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 dark:border-indigo-500/50"
                                : "border-transparent bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900/50 dark:hover:bg-neutral-800"
                              }`}
                          >
                            <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ${isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950"}`}>
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                            <span className={`text-sm font-mono ${isSelected ? "text-indigo-900 dark:text-indigo-300 font-semibold" : "text-muted-foreground"}`}>
                              {event}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 pt-4 border-t bg-neutral-50/50 dark:bg-neutral-900/20 sm:justify-between items-center">
            <p className="text-xs text-muted-foreground hidden sm:block">
              {selectedEvents.size} event{selectedEvents.size !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveWebhook} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex-1 sm:flex-none">
                {editingId ? "Save Changes" : "Create Endpoint"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
