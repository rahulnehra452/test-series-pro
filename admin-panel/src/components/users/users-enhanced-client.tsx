'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  Filter,
  X,
  MoreHorizontal,
  ShieldCheck,
  Ban,
  Crown,
  User,
  Loader2,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Download,
} from 'lucide-react'
import { updateUserProStatus, updateUserSuspension, grantCustomPro, searchUsers } from '@/actions/user-actions'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Label } from '@/components/ui/label'

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  is_pro: boolean
  is_suspended?: boolean
  pro_plan?: string | null
  pro_expires_at?: string | null
  created_at: string
  last_active_at: string | null
}

type SortField = 'full_name' | 'email' | 'created_at' | 'last_active_at'
type SortDir = 'asc' | 'desc'

export function UsersClientEnhanced({ initialData }: { initialData: Profile[] }) {
  const [isPending, startTransition] = useTransition()
  const [users, setUsers] = useState(initialData)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterPlan, setFilterPlan] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [searching, setSearching] = useState(false)

  // Grant Pro modal
  const [showGrantPro, setShowGrantPro] = useState(false)
  const [grantUserId, setGrantUserId] = useState('')
  const [grantPlan, setGrantPlan] = useState('monthly')
  const [grantExpiry, setGrantExpiry] = useState('')

  // User detail modal
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)

  // Sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortField(null); setSortDir('desc') }
    } else {
      setSortField(field); setSortDir('asc')
    }
  }

  // Filter and sort
  let filtered = users.filter(u => {
    if (filterPlan === 'pro' && !u.is_pro) return false
    if (filterPlan === 'free' && u.is_pro) return false
    if (filterStatus === 'suspended' && !u.is_suspended) return false
    if (filterStatus === 'active' && u.is_suspended) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!u.full_name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false
    }
    return true
  })

  if (sortField) {
    filtered = [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const va = a[sortField] || ''
      const vb = b[sortField] || ''
      return String(va).localeCompare(String(vb)) * dir
    })
  }

  const hasFilters = filterPlan || filterStatus || searchQuery
  const clearFilters = () => { setFilterPlan(''); setFilterStatus(''); setSearchQuery('') }

  // Server search
  const handleServerSearch = async () => {
    setSearching(true)
    const res = await searchUsers(searchQuery, {
      isPro: filterPlan === 'pro' ? true : filterPlan === 'free' ? false : undefined,
      isSuspended: filterStatus === 'suspended' ? true : filterStatus === 'active' ? false : undefined,
    })
    if (res.error) toast.error(res.error)
    else setUsers(res.data as Profile[])
    setSearching(false)
  }

  // Actions
  const handleProToggle = (user: Profile) => {
    startTransition(async () => {
      const res = await updateUserProStatus(user.id, !user.is_pro)
      if (res.error) toast.error(res.error)
      else {
        toast.success(user.is_pro ? 'Pro revoked' : 'Pro granted')
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_pro: !u.is_pro } : u))
      }
    })
  }

  const handleSuspendToggle = (user: Profile) => {
    startTransition(async () => {
      const res = await updateUserSuspension(user.id, !user.is_suspended)
      if (res.error) toast.error(res.error)
      else {
        toast.success(user.is_suspended ? 'Unsuspended' : 'Suspended')
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_suspended: !u.is_suspended } : u))
      }
    })
  }

  const handleGrantPro = () => {
    if (!grantUserId || !grantExpiry) return toast.error('Fill all fields')
    startTransition(async () => {
      const res = await grantCustomPro(grantUserId, grantPlan, new Date(grantExpiry).toISOString())
      if (res.error) toast.error(res.error)
      else {
        toast.success('Pro granted!')
        setShowGrantPro(false)
        setUsers(prev => prev.map(u => u.id === grantUserId
          ? { ...u, is_pro: true, pro_plan: grantPlan, pro_expires_at: new Date(grantExpiry).toISOString() }
          : u
        ))
      }
    })
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-30 ml-1" />
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white">Users</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            {filtered.length} users {hasFilters ? '(filtered)' : ''} · Manage subscriptions & suspensions
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleServerSearch() }}
            className="pl-9 h-9 rounded-xl"
          />
        </div>
        <Button variant={showFilters ? 'default' : 'outline'} size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
          <Filter className="h-3.5 w-3.5" /> Filters
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
        {searching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <Button variant="outline" size="sm" className="gap-2 ml-auto" onClick={() => {
          const rows = filtered
          if (rows.length === 0) return toast.error('No users to export')
          const cols: (keyof Profile)[] = ['id', 'full_name', 'email', 'is_pro', 'pro_plan', 'is_suspended', 'created_at']
          const header = cols.join(',')
          const lines = rows.map((r: Profile) => cols.map(c => {
            const v = r[c]
            if (v === null || v === undefined) return ''
            const s = String(v).replace(/"/g, '""')
            return s.includes(',') || s.includes('"') ? `"${s}"` : s
          }).join(','))
          const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv' })
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
          a.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
          toast.success(`Exported ${rows.length} users`)
        }}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl border border-black/5 dark:border-white/5 bg-secondary/20">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Plan</label>
            <Select value={filterPlan} onValueChange={v => setFilterPlan(v === '_all' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All plans" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All plans</SelectItem>
                <SelectItem value="pro">PRO only</SelectItem>
                <SelectItem value="free">Free only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Status</label>
            <Select value={filterStatus} onValueChange={v => setFilterStatus(v === '_all' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button size="sm" onClick={handleServerSearch} disabled={searching} className="h-8 text-xs bg-[#0066CC] hover:bg-[#0052A3] text-white">
              {searching ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Search className="h-3 w-3 mr-1" />}
              Search Server
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/5 dark:border-white/5 bg-secondary/30">
              <th className="text-left px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('full_name')}>
                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Name {renderSortIcon('full_name')}
                </span>
              </th>
              <th className="text-left px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('email')}>
                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Email {renderSortIcon('email')}
                </span>
              </th>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-20">Plan</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-24">Status</th>
              <th className="text-left px-4 py-3 cursor-pointer select-none w-28" onClick={() => handleSort('created_at')}>
                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Joined {renderSortIcon('created_at')}
                </span>
              </th>
              <th className="text-left px-4 py-3 cursor-pointer select-none w-28" onClick={() => handleSort('last_active_at')}>
                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Active {renderSortIcon('last_active_at')}
                </span>
              </th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <User className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">No users found.</p>
                </td>
              </tr>
            ) : (
              filtered.map(user => (
                <tr
                  key={user.id}
                  className="border-b border-black/[0.03] dark:border-white/[0.03] transition-colors hover:bg-secondary/20 cursor-pointer"
                  onClick={() => setSelectedUser(user)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0066CC] to-[#5AC8FA] flex items-center justify-center text-white text-xs font-bold">
                        {(user.full_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-[#1D1D1F] dark:text-white">{user.full_name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.is_pro ? 'default' : 'secondary'} className={user.is_pro ? 'bg-purple-600' : ''}>
                      {user.is_pro ? 'PRO' : 'Free'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.is_suspended ? 'destructive' : 'outline'}>
                      {user.is_suspended ? 'Suspended' : 'Active'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {user.last_active_at ? format(new Date(user.last_active_at), 'MMM d, HH:mm') : 'Never'}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                          Copy User ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleProToggle(user)} disabled={isPending}>
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          {user.is_pro ? 'Revoke Pro' : 'Grant Pro (1yr)'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setGrantUserId(user.id)
                            setShowGrantPro(true)
                          }}
                        >
                          <Crown className="mr-2 h-4 w-4" />
                          Grant Custom Pro
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleSuspendToggle(user)}
                          disabled={isPending}
                          className={user.is_suspended ? 'text-green-600' : 'text-red-600'}
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          {user.is_suspended ? 'Unsuspend' : 'Suspend'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* User detail modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#0066CC] to-[#5AC8FA] flex items-center justify-center text-white font-bold">
                {(selectedUser?.full_name || 'U').charAt(0).toUpperCase()}
              </div>
              {selectedUser?.full_name || 'Unknown User'}
            </DialogTitle>
            <DialogDescription>{selectedUser?.email}</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-secondary/20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Plan</p>
                  <Badge variant={selectedUser.is_pro ? 'default' : 'secondary'} className={`mt-1 ${selectedUser.is_pro ? 'bg-purple-600' : ''}`}>
                    {selectedUser.is_pro ? `PRO (${selectedUser.pro_plan || '—'})` : 'Free'}
                  </Badge>
                </div>
                <div className="p-3 rounded-xl bg-secondary/20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
                  <Badge variant={selectedUser.is_suspended ? 'destructive' : 'outline'} className="mt-1">
                    {selectedUser.is_suspended ? 'Suspended' : 'Active'}
                  </Badge>
                </div>
                <div className="p-3 rounded-xl bg-secondary/20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Joined</p>
                  <p className="text-sm font-semibold mt-1">{format(new Date(selectedUser.created_at), 'MMM d, yyyy')}</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expires</p>
                  <p className="text-sm font-semibold mt-1">
                    {selectedUser.pro_expires_at ? format(new Date(selectedUser.pro_expires_at), 'MMM d, yyyy') : '—'}
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-secondary/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last Active</p>
                <p className="text-sm font-semibold mt-1">
                  {selectedUser.last_active_at ? format(new Date(selectedUser.last_active_at), 'MMM d, yyyy · HH:mm') : 'Never'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">User ID</p>
                <p className="text-xs font-mono text-muted-foreground mt-1 select-all">{selectedUser.id}</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => { handleProToggle(selectedUser); setSelectedUser(null) }} disabled={isPending}>
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                  {selectedUser.is_pro ? 'Revoke Pro' : 'Grant Pro'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={selectedUser.is_suspended ? 'text-green-600' : 'text-red-600'}
                  onClick={() => { handleSuspendToggle(selectedUser); setSelectedUser(null) }}
                  disabled={isPending}
                >
                  <Ban className="h-3.5 w-3.5 mr-1" />
                  {selectedUser.is_suspended ? 'Unsuspend' : 'Suspend'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Grant Custom Pro modal */}
      <Dialog open={showGrantPro} onOpenChange={setShowGrantPro}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-600" /> Grant Custom Pro
            </DialogTitle>
            <DialogDescription>Set a specific plan and expiry date.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Plan Type</Label>
              <Select value={grantPlan} onValueChange={setGrantPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="lifetime">Lifetime</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input type="date" value={grantExpiry} onChange={e => setGrantExpiry(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowGrantPro(false)}>Cancel</Button>
              <Button onClick={handleGrantPro} disabled={isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Grant Pro
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
