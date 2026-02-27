'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Ticket, Plus, Trash2, Copy, Loader2, ToggleLeft, ToggleRight,
  Users, Link2, Zap, Package, TrendingUp, DollarSign,
  Clock, Percent, Gift, ShieldCheck,
} from 'lucide-react'
import { createCoupon, toggleCoupon, deleteCoupon } from '@/actions/advanced-actions'
import {
  createAffiliate, toggleAffiliate, deleteAffiliate,
  createFlashSale, toggleFlashSale, deleteFlashSale,
  createBundleDeal, toggleBundleDeal, deleteBundleDeal,
} from '@/actions/marketing-actions'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any

interface Props {
  coupons: AnyData[]
  affiliates: AnyData[]
  referrals: AnyData[]
  flashSales: AnyData[]
  bundleDeals: AnyData[]
  series: { id: string; title: string }[]
}

type Tab = 'coupons' | 'affiliates' | 'flash' | 'bundles' | 'analytics'

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'coupons', label: 'Promo Codes', icon: Ticket },
  { key: 'affiliates', label: 'Affiliates', icon: Link2 },
  { key: 'flash', label: 'Flash Sales', icon: Zap },
  { key: 'bundles', label: 'Bundles', icon: Package },
  { key: 'analytics', label: 'Revenue', icon: TrendingUp },
]

export function MarketingHub({ coupons, affiliates, referrals, flashSales, bundleDeals, series }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<Tab>('coupons')

  // Quick stats
  const totalAffiliates = affiliates.length
  const activeAffiliates = affiliates.filter((a: AnyData) => a.is_active).length
  const totalCommissions = affiliates.reduce((s: number, a: AnyData) => s + Number(a.total_earnings || 0), 0)
  const activeSales = flashSales.filter((s: AnyData) => s.is_active && new Date(s.ends_at) > new Date()).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
            <Gift className="h-6 w-6 text-white" />
          </div>
          Marketing Hub
        </h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          Manage promos, affiliates, flash sales, bundles, and track revenue.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickStat icon={Ticket} label="Active Coupons" value={coupons.filter((c: AnyData) => c.is_active).length} color="amber" />
        <QuickStat icon={Users} label="Affiliates" value={`${activeAffiliates}/${totalAffiliates}`} color="blue" />
        <QuickStat icon={Zap} label="Active Sales" value={activeSales} color="pink" />
        <QuickStat icon={DollarSign} label="Commissions" value={`₹${totalCommissions.toLocaleString()}`} color="green" />
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-secondary/30 rounded-2xl overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${activeTab === tab.key
                ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-[#1D1D1F] dark:text-white'
                : 'text-muted-foreground hover:text-[#1D1D1F] dark:hover:text-white'
              }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'coupons' && (
        <CouponsTab coupons={coupons} isPending={isPending} startTransition={startTransition} router={router} />
      )}
      {activeTab === 'affiliates' && (
        <AffiliatesTab affiliates={affiliates} referrals={referrals} isPending={isPending} startTransition={startTransition} router={router} />
      )}
      {activeTab === 'flash' && (
        <FlashSalesTab flashSales={flashSales} isPending={isPending} startTransition={startTransition} router={router} />
      )}
      {activeTab === 'bundles' && (
        <BundlesTab bundleDeals={bundleDeals} series={series} isPending={isPending} startTransition={startTransition} router={router} />
      )}
      {activeTab === 'analytics' && (
        <RevenueTab coupons={coupons} affiliates={affiliates} referrals={referrals} flashSales={flashSales} />
      )}
    </div>
  )
}

// ──────────── COUPONS TAB ────────────

function CouponsTab({ coupons, isPending, startTransition, router }: {
  coupons: AnyData[]; isPending: boolean; startTransition: (fn: () => Promise<void>) => void; router: ReturnType<typeof useRouter>
}) {
  const [showForm, setShowForm] = useState(false)
  const [code, setCode] = useState('')
  const [discount, setDiscount] = useState(20)
  const [maxUses, setMaxUses] = useState('')
  const [validUntil, setValidUntil] = useState('')

  const handleCreate = () => {
    if (!code.trim()) return toast.error('Enter a coupon code')
    startTransition(async () => {
      const res = await createCoupon({
        code: code.trim(), discount_percent: discount,
        max_uses: maxUses ? parseInt(maxUses) : undefined,
        valid_until: validUntil || undefined,
      })
      if (res.error) toast.error(res.error)
      else { toast.success(`Coupon ${code.toUpperCase()} created!`); setCode(''); setShowForm(false); router.refresh() }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">Promo Codes ({coupons.length})</h3>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white" size="sm">
          <Plus className="h-3.5 w-3.5" /> New Code
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-2xl border border-black/5 dark:border-white/5">
          <CardContent className="p-5 space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Code *</Label>
                <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="SAVE20" className="rounded-xl font-mono h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Discount %</Label>
                <Input type="number" min={1} max={100} value={discount} onChange={e => setDiscount(Number(e.target.value))} className="rounded-xl h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Max Uses</Label>
                <Input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="∞" className="rounded-xl h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expires</Label>
                <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="rounded-xl h-9 text-xs" />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={isPending} size="sm" className="gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white">
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Create
            </Button>
          </CardContent>
        </Card>
      )}

      {coupons.length === 0 ? (
        <EmptyState icon={Ticket} title="No promo codes yet" desc="Create your first coupon to offer discounts." />
      ) : (
        <div className="space-y-2">
          {coupons.map((c: AnyData) => (
            <Card key={c.id} className="rounded-xl border border-black/5 dark:border-white/5">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <Percent className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success('Copied!') }}
                      className="font-mono font-bold text-sm text-[#1D1D1F] dark:text-white hover:text-[#0066CC] transition-colors flex items-center gap-1">
                      {c.code} <Copy className="h-3 w-3 opacity-30" />
                    </button>
                    <Badge variant="secondary" className="text-[9px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {c.discount_percent}% OFF
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Used: {c.times_used}{c.max_uses ? `/${c.max_uses}` : ''} · Expires: {c.valid_until ? format(new Date(c.valid_until), 'MMM d') : 'Never'}
                  </p>
                </div>
                <Badge variant={c.is_active ? 'default' : 'secondary'} className={`text-[9px] ${c.is_active ? 'bg-green-600 text-white' : ''}`}>
                  {c.is_active ? 'Active' : 'Off'}
                </Badge>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startTransition(async () => { await toggleCoupon(c.id, !c.is_active); router.refresh() })} disabled={isPending}>
                    {c.is_active ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => startTransition(async () => { await deleteCoupon(c.id); router.refresh() })} disabled={isPending}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ──────────── AFFILIATES TAB ────────────

function AffiliatesTab({ affiliates, referrals, isPending, startTransition, router }: {
  affiliates: AnyData[]; referrals: AnyData[]; isPending: boolean; startTransition: (fn: () => Promise<void>) => void; router: ReturnType<typeof useRouter>
}) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [commission, setCommission] = useState(10)

  const handleCreate = () => {
    if (!name.trim() || !email.trim()) return toast.error('Name and email required')
    startTransition(async () => {
      const res = await createAffiliate({ name: name.trim(), email: email.trim(), commission_percent: commission })
      if (res.error) toast.error(res.error)
      else { toast.success(`Affiliate created! Code: ${res.code}`); setName(''); setEmail(''); setShowForm(false); router.refresh() }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">Affiliate Partners ({affiliates.length})</h3>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white" size="sm">
          <Plus className="h-3.5 w-3.5" /> Add Affiliate
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-2xl border border-black/5 dark:border-white/5">
          <CardContent className="p-5 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Partner name" className="rounded-xl h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email *</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="partner@email.com" className="rounded-xl h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Commission %</Label>
                <Input type="number" min={1} max={50} value={commission} onChange={e => setCommission(Number(e.target.value))} className="rounded-xl h-9 text-xs" />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={isPending} size="sm" className="gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white">
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Create Affiliate
            </Button>
          </CardContent>
        </Card>
      )}

      {affiliates.length === 0 ? (
        <EmptyState icon={Link2} title="No affiliates yet" desc="Add partners who earn commission for each referral." />
      ) : (
        <div className="space-y-2">
          {affiliates.map((a: AnyData) => (
            <Card key={a.id} className="rounded-xl border border-black/5 dark:border-white/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {a.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#1D1D1F] dark:text-white">{a.name}</p>
                      <Badge variant={a.is_active ? 'default' : 'secondary'} className={`text-[8px] ${a.is_active ? 'bg-green-600 text-white' : ''}`}>
                        {a.is_active ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{a.email}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <button onClick={() => { navigator.clipboard.writeText(a.affiliate_code); toast.success('Code copied!') }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/50 text-[10px] font-mono font-bold hover:bg-secondary transition-colors">
                        <Copy className="h-3 w-3 opacity-40" /> {a.affiliate_code}
                      </button>
                      <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Percent className="h-3 w-3" /> {a.commission_percent}% commission
                      </span>
                    </div>
                    {/* Stats row */}
                    <div className="flex items-center gap-4 mt-2">
                      <div className="text-[10px]">
                        <span className="font-bold text-[#1D1D1F] dark:text-white">{a.total_referrals}</span>
                        <span className="text-muted-foreground ml-1">referrals</span>
                      </div>
                      <div className="text-[10px]">
                        <span className="font-bold text-green-600">₹{Number(a.total_earnings || 0).toLocaleString()}</span>
                        <span className="text-muted-foreground ml-1">earned</span>
                      </div>
                      <div className="text-[10px]">
                        <span className="font-bold text-blue-600">₹{Number(a.total_paid || 0).toLocaleString()}</span>
                        <span className="text-muted-foreground ml-1">paid</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startTransition(async () => { await toggleAffiliate(a.id, !a.is_active); router.refresh() })} disabled={isPending}>
                      {a.is_active ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => startTransition(async () => { await deleteAffiliate(a.id); router.refresh() })} disabled={isPending}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Referral Log */}
      {referrals.length > 0 && (
        <Card className="rounded-2xl border border-black/5 dark:border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Recent Referrals ({referrals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {referrals.slice(0, 10).map((r: AnyData) => (
                <div key={r.id} className="flex items-center gap-2 py-1.5 border-b border-black/[0.03] dark:border-white/[0.03] last:border-0 text-xs">
                  <ShieldCheck className={`h-3.5 w-3.5 ${r.converted ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className="font-medium flex-1">{r.affiliates?.name || 'Unknown'}</span>
                  <Badge variant={r.converted ? 'default' : 'secondary'} className={`text-[8px] ${r.converted ? 'bg-green-600 text-white' : ''}`}>
                    {r.converted ? `₹${r.conversion_amount}` : 'Pending'}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(r.created_at), 'MMM d')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ──────────── FLASH SALES TAB ────────────

function FlashSalesTab({ flashSales, isPending, startTransition, router }: {
  flashSales: AnyData[]; isPending: boolean; startTransition: (fn: () => Promise<void>) => void; router: ReturnType<typeof useRouter>
}) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [discount, setDiscount] = useState(30)
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [maxRedemptions, setMaxRedemptions] = useState('')

  const handleCreate = () => {
    if (!title.trim() || !startsAt || !endsAt) return toast.error('Fill all required fields')
    startTransition(async () => {
      const res = await createFlashSale({
        title: title.trim(), description: desc, discount_percent: discount,
        starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString(),
        max_redemptions: maxRedemptions ? parseInt(maxRedemptions) : undefined,
      })
      if (res.error) toast.error(res.error)
      else { toast.success('Flash sale created!'); setTitle(''); setDesc(''); setShowForm(false); router.refresh() }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">Flash Sales ({flashSales.length})</h3>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white" size="sm">
          <Plus className="h-3.5 w-3.5" /> New Sale
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-2xl border border-black/5 dark:border-white/5">
          <CardContent className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Weekend Flash Sale" className="rounded-xl h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Discount %</Label>
                <Input type="number" min={1} max={100} value={discount} onChange={e => setDiscount(Number(e.target.value))} className="rounded-xl h-9 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
              <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Sale description..." rows={2} className="rounded-xl text-xs resize-none" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Starts *</Label>
                <Input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="rounded-xl h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ends *</Label>
                <Input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="rounded-xl h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Max Redemptions</Label>
                <Input type="number" value={maxRedemptions} onChange={e => setMaxRedemptions(e.target.value)} placeholder="∞" className="rounded-xl h-9 text-xs" />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={isPending} size="sm" className="gap-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white">
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />} Launch Sale
            </Button>
          </CardContent>
        </Card>
      )}

      {flashSales.length === 0 ? (
        <EmptyState icon={Zap} title="No flash sales yet" desc="Create time-limited offers to drive conversions." />
      ) : (
        <div className="space-y-2">
          {flashSales.map((s: AnyData) => {
            const now = new Date()
            const isLive = s.is_active && new Date(s.starts_at) <= now && new Date(s.ends_at) > now
            const isUpcoming = new Date(s.starts_at) > now
            const isExpired = new Date(s.ends_at) <= now
            return (
              <Card key={s.id} className={`rounded-xl border transition-all ${isLive ? 'border-pink-300 dark:border-pink-700 bg-pink-50/30 dark:bg-pink-950/10' : 'border-black/5 dark:border-white/5'}`}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isLive ? 'bg-pink-100 dark:bg-pink-900/30' : 'bg-secondary/30'}`}>
                    <Zap className={`h-4 w-4 ${isLive ? 'text-pink-600 dark:text-pink-400' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#1D1D1F] dark:text-white">{s.title}</p>
                      <Badge variant="secondary" className="text-[9px] font-bold bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400">
                        {s.discount_percent}% OFF
                      </Badge>
                      {isLive && <Badge className="text-[8px] bg-pink-600 text-white animate-pulse">🔴 LIVE</Badge>}
                      {isUpcoming && <Badge variant="outline" className="text-[8px]">Upcoming</Badge>}
                      {isExpired && <Badge variant="secondary" className="text-[8px]">Expired</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(s.starts_at), 'MMM d, h:mm a')} → {format(new Date(s.ends_at), 'MMM d, h:mm a')}
                    </p>
                    {s.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{s.description}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold">{s.times_redeemed}{s.max_redemptions ? `/${s.max_redemptions}` : ''}</p>
                    <p className="text-[9px] text-muted-foreground">redeemed</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startTransition(async () => { await toggleFlashSale(s.id, !s.is_active); router.refresh() })} disabled={isPending}>
                      {s.is_active ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => startTransition(async () => { await deleteFlashSale(s.id); router.refresh() })} disabled={isPending}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ──────────── BUNDLES TAB ────────────

function BundlesTab({ bundleDeals, series, isPending, startTransition, router }: {
  bundleDeals: AnyData[]; series: { id: string; title: string }[]; isPending: boolean
  startTransition: (fn: () => Promise<void>) => void; router: ReturnType<typeof useRouter>
}) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [selectedSeries, setSelectedSeries] = useState<Set<string>>(new Set())
  const [originalPrice, setOriginalPrice] = useState('')
  const [bundlePrice, setBundlePrice] = useState('')

  const toggleSeries = (id: string) => {
    setSelectedSeries(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  const handleCreate = () => {
    if (!title.trim() || selectedSeries.size < 2) return toast.error('Enter title and select at least 2 series')
    if (!originalPrice || !bundlePrice) return toast.error('Enter both prices')
    startTransition(async () => {
      const res = await createBundleDeal({
        title: title.trim(), description: desc, series_ids: Array.from(selectedSeries),
        original_price: parseFloat(originalPrice), bundle_price: parseFloat(bundlePrice),
      })
      if (res.error) toast.error(res.error)
      else { toast.success('Bundle created!'); setTitle(''); setSelectedSeries(new Set()); setShowForm(false); router.refresh() }
    })
  }

  const savings = (orig: number, bundle: number) => Math.round(((orig - bundle) / orig) * 100)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">Bundle Deals ({bundleDeals.length})</h3>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white" size="sm">
          <Plus className="h-3.5 w-3.5" /> New Bundle
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-2xl border border-black/5 dark:border-white/5">
          <CardContent className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bundle Title *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="UPSC Complete Pack" className="rounded-xl h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="All UPSC series at one price" className="rounded-xl h-9 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Series (min 2)</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {series.map(s => (
                  <button key={s.id} onClick={() => toggleSeries(s.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${selectedSeries.has(s.id)
                      ? 'bg-[#0066CC] text-white border-[#0066CC]'
                      : 'border-black/10 dark:border-white/10 text-muted-foreground hover:bg-secondary/50'}`}>
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Original Price (₹)</Label>
                <Input type="number" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} placeholder="999" className="rounded-xl h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bundle Price (₹)</Label>
                <Input type="number" value={bundlePrice} onChange={e => setBundlePrice(e.target.value)} placeholder="499" className="rounded-xl h-9 text-xs" />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={isPending} size="sm" className="gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white">
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />} Create Bundle
            </Button>
          </CardContent>
        </Card>
      )}

      {bundleDeals.length === 0 ? (
        <EmptyState icon={Package} title="No bundles yet" desc="Combine test series into discounted packs." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {bundleDeals.map((b: AnyData) => (
            <Card key={b.id} className="rounded-xl border border-black/5 dark:border-white/5">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#1D1D1F] dark:text-white">{b.title}</p>
                    {b.description && <p className="text-[10px] text-muted-foreground mt-0.5">{b.description}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startTransition(async () => { await toggleBundleDeal(b.id, !b.is_active); router.refresh() })} disabled={isPending}>
                      {b.is_active ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => startTransition(async () => { await deleteBundleDeal(b.id); router.refresh() })} disabled={isPending}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-lg font-extrabold text-green-600">₹{Number(b.bundle_price).toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground line-through">₹{Number(b.original_price).toLocaleString()}</span>
                  <Badge className="bg-green-600 text-white text-[9px] font-bold">
                    SAVE {savings(Number(b.original_price), Number(b.bundle_price))}%
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(Array.isArray(b.series_ids) ? b.series_ids : []).map((sid: string) => {
                    const s = series.find(x => x.id === sid)
                    return s ? <Badge key={sid} variant="secondary" className="text-[8px]">{s.title}</Badge> : null
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ──────────── REVENUE ANALYTICS TAB ────────────

function RevenueTab({ coupons, affiliates, referrals, flashSales }: {
  coupons: AnyData[]; affiliates: AnyData[]; referrals: AnyData[]; flashSales: AnyData[]
}) {
  const totalCouponUses = coupons.reduce((s: number, c: AnyData) => s + (c.times_used || 0), 0)
  const totalAffiliateEarnings = affiliates.reduce((s: number, a: AnyData) => s + Number(a.total_earnings || 0), 0)
  const totalAffiliatePaid = affiliates.reduce((s: number, a: AnyData) => s + Number(a.total_paid || 0), 0)
  const convertedReferrals = referrals.filter((r: AnyData) => r.converted).length
  const totalFlashRedemptions = flashSales.reduce((s: number, f: AnyData) => s + (f.times_redeemed || 0), 0)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">Revenue & Marketing Analytics</h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickStat icon={Ticket} label="Coupon Uses" value={totalCouponUses} color="amber" />
        <QuickStat icon={Users} label="Referral Conversions" value={convertedReferrals} color="blue" />
        <QuickStat icon={Zap} label="Flash Redemptions" value={totalFlashRedemptions} color="pink" />
        <QuickStat icon={DollarSign} label="Affiliate Balance" value={`₹${(totalAffiliateEarnings - totalAffiliatePaid).toLocaleString()}`} color="green" />
      </div>

      {/* Top affiliates */}
      <Card className="rounded-2xl border border-black/5 dark:border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">Top Affiliates by Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          {affiliates.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No affiliates yet.</p>
          ) : (
            <div className="space-y-2">
              {[...affiliates].sort((a: AnyData, b: AnyData) => (b.total_referrals || 0) - (a.total_referrals || 0)).slice(0, 5).map((a: AnyData, i: number) => (
                <div key={a.id} className="flex items-center gap-3 py-2 border-b border-black/[0.03] dark:border-white/[0.03] last:border-0">
                  <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold">
                    {a.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold">{a.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold">{a.total_referrals} referrals</p>
                    <p className="text-[10px] text-green-600 font-semibold">₹{Number(a.total_earnings || 0).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ──────────── SHARED COMPONENTS ────────────

function QuickStat({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; color: string
}) {
  const colors: Record<string, string> = {
    amber: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    pink: 'bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400',
    green: 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400',
  }
  return (
    <Card className="rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className={`p-1.5 rounded-lg ${colors[color]}`}><Icon className="h-3.5 w-3.5" /></div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
        <p className="text-xl font-bold text-[#1D1D1F] dark:text-white">{value}</p>
      </CardContent>
    </Card>
  )
}

function EmptyState({ icon: Icon, title, desc }: {
  icon: React.ComponentType<{ className?: string }>; title: string; desc: string
}) {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-secondary/30 mb-3">
        <Icon className="h-6 w-6 text-muted-foreground/40" />
      </div>
      <h3 className="text-sm font-bold text-[#1D1D1F] dark:text-white">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </div>
  )
}
