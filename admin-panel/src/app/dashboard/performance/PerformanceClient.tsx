'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3, TrendingUp, Target, Award, Calendar, Activity,
} from 'lucide-react'
import { format, subDays, eachDayOfInterval } from 'date-fns'

interface TestStat {
  testId: string
  title: string
  attemptCount: number
  averageScore: number
  averagePercent: number
  passRate: number
  highestScore: number
  lowestScore: number
}

interface Props {
  analytics: {
    totalAttempts: number
    completedAttempts: number
    testStats: TestStat[]
    dailyCounts: Record<string, number>
  }
  heatmap: Record<string, number>
}

export function PerformanceClient({ analytics, heatmap }: Props) {
  const { testStats, dailyCounts } = analytics

  // Overall averages
  const overallAvgPercent = testStats.length > 0
    ? Math.round(testStats.reduce((s, t) => s + t.averagePercent, 0) / testStats.length)
    : 0
  const overallPassRate = testStats.length > 0
    ? Math.round(testStats.reduce((s, t) => s + t.passRate, 0) / testStats.length)
    : 0

  // Last 30 days for chart
  const last30 = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() })
  const maxDaily = Math.max(1, ...last30.map(d => dailyCounts[format(d, 'yyyy-MM-dd')] || 0))

  // Heatmap: last 90 days
  const last90 = eachDayOfInterval({ start: subDays(new Date(), 89), end: new Date() })
  const maxHeat = Math.max(1, ...Object.values(heatmap))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          Student Performance
        </h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">Analyze scores, pass rates, and engagement patterns.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat icon={Activity} label="Total Attempts" value={analytics.totalAttempts.toLocaleString()} color="blue" />
        <MiniStat icon={Target} label="Avg Score" value={`${overallAvgPercent}%`} color="green" />
        <MiniStat icon={Award} label="Pass Rate" value={`${overallPassRate}%`} color="purple" />
        <MiniStat icon={TrendingUp} label="Tests Analyzed" value={String(testStats.length)} color="orange" />
      </div>

      {/* Activity Chart — last 30 days */}
      <Card className="rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-[#1D1D1F] dark:text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" /> Daily Attempts (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-[2px] h-32">
            {last30.map(day => {
              const key = format(day, 'yyyy-MM-dd')
              const count = dailyCounts[key] || 0
              const height = Math.max(2, (count / maxDaily) * 100)
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
              return (
                <div key={key} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className={`w-full rounded-t-sm transition-colors ${isToday ? 'bg-blue-500' : count > 0 ? 'bg-blue-400/60 dark:bg-blue-500/40' : 'bg-gray-200 dark:bg-gray-700'}`}
                    style={{ height: `${height}%` }}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                    {format(day, 'MMM d')}: {count}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-muted-foreground font-medium">
            <span>{format(last30[0], 'MMM d')}</span>
            <span>Today</span>
          </div>
        </CardContent>
      </Card>

      {/* Activity Heatmap — 90 days */}
      <Card className="rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-[#1D1D1F] dark:text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-600" /> Activity Heatmap (90 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-[3px]">
            {last90.map(day => {
              const key = format(day, 'yyyy-MM-dd')
              const count = heatmap[key] || 0
              const intensity = count / maxHeat
              let bg = 'bg-gray-100 dark:bg-gray-800'
              if (intensity > 0.75) bg = 'bg-green-600 dark:bg-green-500'
              else if (intensity > 0.5) bg = 'bg-green-400 dark:bg-green-600'
              else if (intensity > 0.25) bg = 'bg-green-300 dark:bg-green-700'
              else if (count > 0) bg = 'bg-green-200 dark:bg-green-800'
              return (
                <div
                  key={key}
                  title={`${format(day, 'MMM d')}: ${count} attempts`}
                  className={`w-3 h-3 rounded-sm ${bg} cursor-default`}
                />
              )
            })}
          </div>
          <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground font-medium">
            <span>Less</span>
            <div className="flex gap-[2px]">
              <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
              <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-800" />
              <div className="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-700" />
              <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-600" />
              <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-500" />
            </div>
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      {/* Per-test Stats Table */}
      <Card className="rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-[#1D1D1F] dark:text-white">Per-Test Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {testStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No completed attempts yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5">
                    <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Test</th>
                    <th className="text-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Attempts</th>
                    <th className="text-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Avg %</th>
                    <th className="text-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pass Rate</th>
                    <th className="text-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">High</th>
                    <th className="text-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Low</th>
                  </tr>
                </thead>
                <tbody>
                  {testStats.map(t => (
                    <tr key={t.testId} className="border-b border-black/[0.03] dark:border-white/[0.03] hover:bg-secondary/20">
                      <td className="px-3 py-2.5 font-semibold text-[#1D1D1F] dark:text-white truncate max-w-[200px]">{t.title}</td>
                      <td className="px-3 py-2.5 text-center font-medium">{t.attemptCount}</td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge variant="secondary" className={`text-[10px] font-bold ${t.averagePercent >= 60 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : t.averagePercent >= 35 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {t.averagePercent}%
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-center font-medium">{t.passRate}%</td>
                      <td className="px-3 py-2.5 text-center font-bold text-green-600">{t.highestScore}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-red-500">{t.lowestScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    green: 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
    orange: 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
  }
  return (
    <Card className="rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className={`p-1.5 rounded-lg ${colors[color]}`}><Icon className="h-3.5 w-3.5" /></div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold text-[#1D1D1F] dark:text-white">{value}</p>
      </CardContent>
    </Card>
  )
}
