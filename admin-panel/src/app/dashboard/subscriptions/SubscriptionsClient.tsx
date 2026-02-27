'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Users, TrendingUp, AlertTriangle, Crown, Activity } from 'lucide-react'
import { format } from 'date-fns'
import type { SubscriptionEvent } from '@/actions/subscription-actions'

interface ProProfile {
  id: string
  full_name: string | null
  email: string | null
  pro_plan: string | null
  pro_expires_at: string | null
  created_at: string
}

interface Stats {
  totalUsers: number
  proUsers: number
  freeUsers: number
  suspendedUsers: number
  conversionRate: number
  planBreakdown: Record<string, number>
  proProfiles: ProProfile[]
  expiringWithin30Days: ProProfile[]
}

export function SubscriptionsClient({ stats, events = [] }: { stats: Stats, events?: SubscriptionEvent[] }) {
  const estimatedRevenue = stats.proUsers * 299 // ₹299 per PRO user

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'granted':
      case 'upgrade': return <Badge className="bg-green-500 text-white uppercase text-[10px]">{type}</Badge>
      case 'revoked':
      case 'downgrade': return <Badge className="bg-red-500 text-white uppercase text-[10px]">{type}</Badge>
      default: return <Badge variant="secondary" className="uppercase text-[10px]">{type}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white">Subscriptions</h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">Revenue, plans, and subscriber management.</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border border-black/5 dark:border-white/5 bg-white/70 dark:bg-[#2C2C2E]/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Est. Revenue</CardTitle>
            <div className="p-2 bg-green-500/10 rounded-full"><CreditCard className="h-4 w-4 text-green-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#1D1D1F] dark:text-white">₹{estimatedRevenue.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Based on {stats.proUsers} PRO users × ₹299</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-black/5 dark:border-white/5 bg-white/70 dark:bg-[#2C2C2E]/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PRO Users</CardTitle>
            <div className="p-2 bg-purple-500/10 rounded-full"><Crown className="h-4 w-4 text-purple-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#1D1D1F] dark:text-white">{stats.proUsers}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {stats.conversionRate}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-black/5 dark:border-white/5 bg-white/70 dark:bg-[#2C2C2E]/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Free Users</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-full"><Users className="h-4 w-4 text-blue-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#1D1D1F] dark:text-white">{stats.freeUsers}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Potential upsell candidates</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-black/5 dark:border-white/5 bg-white/70 dark:bg-[#2C2C2E]/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expiring Soon</CardTitle>
            <div className="p-2 bg-yellow-500/10 rounded-full"><AlertTriangle className="h-4 w-4 text-yellow-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#1D1D1F] dark:text-white">{stats.expiringWithin30Days.length}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Within next 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan breakdown + Expiring soon */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Plan Breakdown */}
        <Card className="rounded-2xl border border-black/5 dark:border-white/5">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#1D1D1F] dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" /> Plan Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.planBreakdown).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.planBreakdown).map(([plan, count]) => (
                  <div key={plan} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize">{plan}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold">{count}</span>
                      <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${(count / stats.proUsers) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">Total PRO</span>
                  <span className="text-sm font-bold">{stats.proUsers}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No PRO users yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card className="rounded-2xl border border-black/5 dark:border-white/5">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#1D1D1F] dark:text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" /> Expiring in 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.expiringWithin30Days.length > 0 ? (
              <div className="space-y-3">
                {stats.expiringWithin30Days.map(user => (
                  <div key={user.id} className="flex items-center justify-between py-2 border-b border-black/[0.03] dark:border-white/[0.03] last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-[#1D1D1F] dark:text-white">{user.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-yellow-600 border-yellow-500/30">
                        {user.pro_expires_at ? format(new Date(user.pro_expires_at), 'MMM d') : '—'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No subscriptions expiring soon.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All PRO Subscribers */}
      <Card className="rounded-2xl border border-black/5 dark:border-white/5">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#1D1D1F] dark:text-white flex items-center gap-2">
            <Crown className="h-5 w-5 text-purple-600" /> All PRO Subscribers ({stats.proProfiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.proProfiles.length > 0 ? (
            <div className="rounded-xl border border-black/5 dark:border-white/5 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5 bg-secondary/30">
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Plan</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expires</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.proProfiles.map(user => (
                    <tr key={user.id} className="border-b border-black/[0.03] dark:border-white/[0.03] hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-[#1D1D1F] dark:text-white">{user.full_name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="capitalize">{user.pro_plan || '—'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {user.pro_expires_at ? format(new Date(user.pro_expires_at), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No PRO subscribers yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Subscription Audit Trail */}
      <Card className="rounded-2xl border border-black/5 dark:border-white/5">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#1D1D1F] dark:text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" /> Subscription Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <div className="rounded-xl border border-black/5 dark:border-white/5 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5 bg-secondary/30">
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[200px]">Date & Time</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">User</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Action</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Plan Details</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => (
                    <tr key={event.id} className="border-b border-black/[0.03] dark:border-white/[0.03] hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {format(new Date(event.created_at), 'MMM d, yyyy • h:mm a')}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#1D1D1F] dark:text-white">
                        {event.profiles?.full_name || 'Unknown User'}
                        <div className="text-xs text-muted-foreground font-normal">{event.profiles?.email || event.user_id}</div>
                      </td>
                      <td className="px-4 py-3">
                        {getEventBadge(event.event_type)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {event.plan ? <span className="font-semibold text-foreground mr-2">{event.plan}</span> : null}
                        {event.amount ? <span className="text-green-600 font-medium">₹{event.amount}</span> : null}
                        {!event.plan && !event.amount && '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No subscription events recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
