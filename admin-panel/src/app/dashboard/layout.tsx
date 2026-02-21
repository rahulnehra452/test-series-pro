import { Sidebar } from '@/components/layout/sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side auth check: verify user is logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5f7] dark:bg-[#000000]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden p-4 pl-0">
        <main className="relative flex-1 overflow-y-auto rounded-[2rem] border border-black/[0.04] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] shadow-sm p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
