import { Sidebar } from '@/components/layout/sidebar'
import { CommandPalette } from '@/components/command-palette'
import { MobileNav } from '@/components/layout/mobile-nav'
import LoadingBar from '@/components/ui/loading-bar'
import { SearchTrigger } from '@/components/layout/search-trigger'
import { getCurrentAdmin } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const adminSession = await getCurrentAdmin()
  if (!adminSession) {
    redirect('/login?error=admin-required')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5f7] dark:bg-[#000000]">
      {/* Global loading indicator */}
      <LoadingBar />
      {/* Desktop Sidebar — hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Navigation — shown on mobile only */}
      <MobileNav />

      {/* ⌘K Command Palette */}
      <CommandPalette />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden p-2 sm:p-4 lg:pl-0">
        <main className="relative flex-1 overflow-y-auto rounded-2xl lg:rounded-[2rem] border border-black/[0.04] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] shadow-sm p-4 sm:p-6 lg:p-8 pt-14 lg:pt-4">
          {/* Feature 1: Visible search trigger */}
          <SearchTrigger />
          {children}
        </main>
      </div>
    </div>
  )
}
