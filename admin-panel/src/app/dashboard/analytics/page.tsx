import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { TrendingUp, Users, Target, BarChart3 } from "lucide-react"
import { InteractiveBarChart } from "@/components/analytics/interactive-charts"

export default async function AnalyticsPage() {
  await requireAdminRole(["super_admin", "moderator"])
  // eslint-disable-next-line
  const now = Date.now()
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  const supabase = createAdminClient()

  // Fetch analytics data in parallel
  const [
    { count: totalUsers },
    { count: totalAttempts },
    { data: completedAttempts },
    { data: recentUsers },
    { count: proUsers },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('attempts').select('*', { count: 'exact', head: true }),
    supabase.from('attempts')
      .select('score, total_marks')
      .eq('status', 'Completed')
      .not('score', 'is', null)
      .not('total_marks', 'is', null),
    supabase.from('profiles')
      .select('id')
      .gte('last_active_at', sevenDaysAgo),
    supabase.from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_pro', true),
  ])

  // Calculate average score
  let avgScorePercent = 0
  if (completedAttempts && completedAttempts.length > 0) {
    const totalPercent = completedAttempts.reduce((acc, a) => {
      const score = Number(a.score) || 0
      const total = Number(a.total_marks) || 1
      return acc + (score / total) * 100
    }, 0)
    avgScorePercent = Math.round(totalPercent / completedAttempts.length)
  }

  const activeUsersCount = recentUsers?.length ?? 0
  const completionRate = totalAttempts && totalAttempts > 0
    ? Math.round(((completedAttempts?.length ?? 0) / totalAttempts) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground">Platform usage and performance metrics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {proUsers && proUsers > 0 ? `₹${(proUsers * 299).toLocaleString('en-IN')}` : '₹0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {proUsers ?? 0} PRO subscribers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsersCount}</div>
            <p className="text-xs text-muted-foreground">
              Active in the last 7 days (of {totalUsers ?? 0} total)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tests Attempted</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAttempts ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {completionRate}% completion rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgScorePercent}%</div>
            <p className="text-xs text-muted-foreground">
              Across {completedAttempts?.length ?? 0} completed attempts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Test Performance Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {completedAttempts && completedAttempts.length > 0 ? (
              <div className="pt-4">
                {(() => {
                  const buckets = { 'Excellent': 0, 'Good': 0, 'Average': 0, 'Poor': 0 }
                  completedAttempts.forEach(a => {
                    const pct = ((Number(a.score) || 0) / (Number(a.total_marks) || 1)) * 100
                    if (pct >= 80) buckets['Excellent']++
                    else if (pct >= 60) buckets['Good']++
                    else if (pct >= 40) buckets['Average']++
                    else buckets['Poor']++
                  })

                  const chartData = [
                    { label: 'Excellent', value: buckets['Excellent'], color: 'bg-green-500' },
                    { label: 'Good', value: buckets['Good'], color: 'bg-blue-500' },
                    { label: 'Average', value: buckets['Average'], color: 'bg-yellow-500' },
                    { label: 'Poor', value: buckets['Poor'], color: 'bg-red-500' }
                  ]

                  return <InteractiveBarChart data={chartData} />
                })()}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-10">
                No completed tests yet. Performance data will appear here once students finish tests.
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Platform Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Total Registered Users</span>
                <span className="text-sm font-bold">{totalUsers ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">PRO Subscribers</span>
                <span className="text-sm font-bold">{proUsers ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Active Last 7 Days</span>
                <span className="text-sm font-bold">{activeUsersCount}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Total Test Attempts</span>
                <span className="text-sm font-bold">{totalAttempts ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Completed Tests</span>
                <span className="text-sm font-bold">{completedAttempts?.length ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Avg. Score</span>
                <span className="text-sm font-bold">{avgScorePercent}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
