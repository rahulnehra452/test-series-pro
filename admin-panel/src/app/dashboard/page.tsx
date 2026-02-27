import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users, FileText, Database, TrendingUp, BookOpen, GraduationCap,
  Crown, Activity, Clock, ArrowUpRight, Sparkles,
} from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { format } from 'date-fns'
import Link from 'next/link'
import { RefreshButton } from '@/components/ui/refresh-button'

export default async function DashboardPage() {
  const supabase = createAdminClient()

  const [
    { count: totalUsers },
    { count: totalTests },
    { count: totalQuestions },
    { count: totalSeries },
    { count: totalExams },
    { count: totalAttempts },
    { count: proUsers },
    { data: recentAttempts },
    { data: popularExams },
    { data: recentUsers },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('tests').select('*', { count: 'exact', head: true }),
    supabase.from('questions').select('*', { count: 'exact', head: true }),
    supabase.from('test_series').select('*', { count: 'exact', head: true }),
    supabase.from('exams').select('*', { count: 'exact', head: true }),
    supabase.from('attempts').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_pro', true),
    supabase.from('attempts')
      .select('id, score, total_marks, status, completed_at, test_id, tests(title)')
      .order('completed_at', { ascending: false })
      .limit(6),
    supabase.from('exams')
      .select(`id, title, slug, test_series ( id, tests ( id ) )`)
      .eq('is_active', true)
      .limit(5),
    supabase.from('profiles')
      .select('id, full_name, email, is_pro, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const conversionRate = totalUsers ? Math.round(((proUsers ?? 0) / totalUsers) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header with greeting and date */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white">
            {greeting} 👋
          </h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} · Here&apos;s your platform overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton />
          <Link href="/dashboard/ai-generator">
            <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
              <Sparkles className="h-3 w-3 text-purple-600" /> AI Generator
            </Badge>
          </Link>
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" /> {format(new Date(), 'h:mm a')}
          </Badge>
        </div>
      </div>

      {/* Main Stats — 2x3 Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Users} label="Users" value={totalUsers ?? 0} sub="Registered" color="blue" />
        <StatCard icon={Crown} label="PRO" value={proUsers ?? 0} sub={`${conversionRate}% conv.`} color="purple" />
        <StatCard icon={FileText} label="Tests" value={totalTests ?? 0} sub={`${totalSeries ?? 0} series`} color="indigo" />
        <StatCard icon={Database} label="Questions" value={totalQuestions ?? 0} sub={`${totalExams ?? 0} exams`} color="green" />
        <StatCard icon={TrendingUp} label="Attempts" value={totalAttempts ?? 0} sub="Submissions" color="orange" />
        <StatCard icon={Activity} label="Active" value={recentUsers?.length ?? 0} sub="New today" color="pink" />
      </div>

      {/* Two-column: Recent Activity + Quick Glance */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Recent Activity — wider */}
        <Card className="lg:col-span-3 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm bg-white/70 dark:bg-[#2C2C2E]/50 backdrop-blur-xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-[#1D1D1F] dark:text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" /> Recent Test Attempts
            </CardTitle>
            <Link href="/dashboard/performance" className="text-[10px] font-bold text-[#0066CC] dark:text-[#5AC8FA] hover:underline uppercase tracking-wider">
              View All →
            </Link>
          </CardHeader>
          <CardContent>
            {recentAttempts && recentAttempts.length > 0 ? (
              <div className="space-y-3">
                {recentAttempts.map((a) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const testTitle = (a.tests as any)?.title || `Test ${a.test_id?.slice(0, 6)}…`
                  const pct = a.total_marks ? Math.round(((a.score ?? 0) / a.total_marks) * 100) : 0
                  return (
                    <div key={a.id} className="flex items-center gap-3 py-2 border-b border-black/[0.03] dark:border-white/[0.03] last:border-0">
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 flex items-center justify-center shrink-0">
                        <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#1D1D1F] dark:text-white truncate">{testTitle}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          {a.completed_at ? format(new Date(a.completed_at), 'MMM d · h:mm a') : 'In Progress'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-[#1D1D1F] dark:text-white">{a.score ?? '—'}/{a.total_marks ?? '—'}</p>
                        <div className={`inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider mt-0.5 ${pct >= 60 ? 'text-green-600' : pct >= 30 ? 'text-yellow-600' : 'text-red-500'}`}>
                          <ArrowUpRight className="h-2.5 w-2.5" /> {pct}%
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyBox text="No test attempts yet." />
            )}
          </CardContent>
        </Card>

        {/* Right column: Exams + New Users */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-2xl border border-black/5 dark:border-white/5 shadow-sm bg-white/70 dark:bg-[#2C2C2E]/50 backdrop-blur-xl">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-[#1D1D1F] dark:text-white flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-indigo-600" /> Exam Categories
              </CardTitle>
              <Link href="/dashboard/exams" className="text-[10px] font-bold text-[#0066CC] dark:text-[#5AC8FA] hover:underline uppercase tracking-wider">
                View All →
              </Link>
            </CardHeader>
            <CardContent>
              {popularExams && popularExams.length > 0 ? (
                <div className="space-y-2">
                  {popularExams.map((exam) => {
                    const seriesArr = Array.isArray(exam.test_series) ? exam.test_series : []
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const testCount = seriesArr.reduce((acc: number, s: any) => acc + (Array.isArray(s.tests) ? s.tests.length : 0), 0)
                    return (
                      <div key={exam.id} className="flex items-center justify-between py-2 border-b border-black/[0.03] dark:border-white/[0.03] last:border-0">
                        <p className="text-xs font-semibold text-[#1D1D1F] dark:text-white">{exam.title}</p>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                          <BookOpen className="h-3 w-3" />
                          {seriesArr.length}s · {testCount}t
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <EmptyBox text="No exam categories yet." />
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-black/5 dark:border-white/5 shadow-sm bg-white/70 dark:bg-[#2C2C2E]/50 backdrop-blur-xl">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-[#1D1D1F] dark:text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-green-600" /> New Users
              </CardTitle>
              <Link href="/dashboard/users" className="text-[10px] font-bold text-[#0066CC] dark:text-[#5AC8FA] hover:underline uppercase tracking-wider">
                View All →
              </Link>
            </CardHeader>
            <CardContent>
              {recentUsers && recentUsers.length > 0 ? (
                <div className="space-y-2">
                  {recentUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-2 py-1.5 border-b border-black/[0.03] dark:border-white/[0.03] last:border-0">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#0066CC] to-[#5AC8FA] flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                        {(u.full_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#1D1D1F] dark:text-white truncate">{u.full_name || 'Unknown'}</p>
                      </div>
                      {u.is_pro && (
                        <Badge variant="secondary" className="text-[8px] h-4 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">PRO</Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                        {format(new Date(u.created_at), 'MMM d')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyBox text="No users yet." />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Compact stat card component
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  sub: string
  color: string
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
    indigo: 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
    green: 'bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400',
    orange: 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400',
    pink: 'bg-pink-500/10 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400',
  }
  return (
    <Card className="rounded-2xl border border-black/5 dark:border-white/5 shadow-sm bg-white/70 dark:bg-[#2C2C2E]/50 backdrop-blur-xl">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded-lg ${colors[color]}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold text-[#1D1D1F] dark:text-white tracking-tight">{value.toLocaleString()}</p>
        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  )
}

function EmptyBox({ text }: { text: string }) {
  return (
    <p className="text-xs text-muted-foreground text-center py-8 font-medium">{text}</p>
  )
}
