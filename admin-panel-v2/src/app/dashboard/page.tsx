import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FileText, Database, TrendingUp, BookOpen, GraduationCap } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { format } from 'date-fns'

export default async function DashboardPage() {
  const supabase = createAdminClient()

  // Fetch all stats in parallel
  const [
    { count: totalUsers },
    { count: totalTests },
    { count: totalQuestions },
    { count: totalSeries },
    { count: totalExams },
    { count: totalAttempts },
    { data: recentAttempts },
    { data: popularExams },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('tests').select('*', { count: 'exact', head: true }),
    supabase.from('questions').select('*', { count: 'exact', head: true }),
    supabase.from('test_series').select('*', { count: 'exact', head: true }),
    supabase.from('exams').select('*', { count: 'exact', head: true }),
    supabase.from('attempts').select('*', { count: 'exact', head: true }),
    supabase.from('attempts')
      .select('id, score, total_marks, status, completed_at, test_id')
      .order('completed_at', { ascending: false })
      .limit(8),
    supabase.from('exams')
      .select(`
        id, title, slug,
        test_series (
          id,
          tests ( id )
        )
      `)
      .eq('is_active', true)
      .limit(5),
  ])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white">Overview</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">Platform performance and metrics.</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm bg-white/70 dark:bg-[#2C2C2E]/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Users</CardTitle>
            <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-full">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-[#1D1D1F] dark:text-white">{(totalUsers ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Registered students</p>
          </CardContent>
        </Card>
        <Card className="rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm bg-white/70 dark:bg-[#2C2C2E]/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Tests</CardTitle>
            <div className="p-2 bg-purple-500/10 dark:bg-purple-500/20 rounded-full">
              <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-[#1D1D1F] dark:text-white">{totalTests ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Across {totalSeries ?? 0} series
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm bg-white/70 dark:bg-[#2C2C2E]/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Questions</CardTitle>
            <div className="p-2 bg-green-500/10 dark:bg-green-500/20 rounded-full">
              <Database className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-[#1D1D1F] dark:text-white">{(totalQuestions ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Across {totalExams ?? 0} categories
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm bg-white/70 dark:bg-[#2C2C2E]/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Test Attempts</CardTitle>
            <div className="p-2 bg-orange-500/10 dark:bg-orange-500/20 rounded-full">
              <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-[#1D1D1F] dark:text-white">{(totalAttempts ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Total submissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity & Exams */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 pb-10">
        <Card className="col-span-4 rounded-[32px] border border-black/5 dark:border-white/5 shadow-sm bg-white/70 dark:bg-[#2C2C2E]/50 backdrop-blur-xl">
          <CardHeader className="pt-6 pb-2 px-6">
            <CardTitle className="text-lg font-bold tracking-tight text-[#1D1D1F] dark:text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {recentAttempts && recentAttempts.length > 0 ? (
              <div className="space-y-4">
                {recentAttempts.map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold leading-none text-[#1D1D1F] dark:text-white">
                        Test: {attempt.test_id?.slice(0, 8)}...
                      </p>
                      <p className="text-xs font-medium text-muted-foreground">
                        {attempt.completed_at
                          ? format(new Date(attempt.completed_at), 'MMM d, yyyy · h:mm a')
                          : 'In Progress'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#1D1D1F] dark:text-white">
                        {attempt.score ?? '—'} / {attempt.total_marks ?? '—'}
                      </p>
                      <p className={`text-[10px] uppercase tracking-wider font-bold mt-1 ${attempt.status === 'Completed' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        {attempt.status || 'Unknown'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-10 font-medium">
                No test attempts yet. Students will appear here once they start taking tests.
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-3 rounded-[32px] border border-black/5 dark:border-white/5 shadow-sm bg-white/70 dark:bg-[#2C2C2E]/50 backdrop-blur-xl">
          <CardHeader className="pt-6 pb-2 px-6">
            <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight text-[#1D1D1F] dark:text-white">
              <div className="p-1.5 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full">
                <GraduationCap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              Exam Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {popularExams && popularExams.length > 0 ? (
              <div className="space-y-4">
                {popularExams.map((exam) => {
                  const seriesArr = Array.isArray(exam.test_series) ? exam.test_series : []
                  const testCount = seriesArr.reduce((acc: number, s: Record<string, unknown>) => {
                    const tests = Array.isArray(s.tests) ? s.tests : []
                    return acc + tests.length
                  }, 0)
                  return (
                    <div key={exam.id} className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4 last:border-0 last:pb-0">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold leading-none text-[#1D1D1F] dark:text-white">{exam.title}</p>
                        <p className="text-xs font-medium text-muted-foreground">/{exam.slug}</p>
                      </div>
                      <div className="text-right text-xs font-medium text-muted-foreground">
                        <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
                          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{seriesArr.length} series · {testCount} tests</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-10 font-medium">
                No exam categories yet. Create one to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
