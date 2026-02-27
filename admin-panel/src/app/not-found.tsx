import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7] dark:bg-[#000000]">
      <div className="text-center space-y-4 px-6">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 mb-2">
          <span className="text-4xl font-black text-blue-600 dark:text-blue-400">404</span>
        </div>
        <h1 className="text-2xl font-extrabold text-[#1D1D1F] dark:text-white tracking-tight">Page Not Found</h1>
        <p className="text-sm text-muted-foreground font-medium max-w-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0066CC] text-white text-sm font-semibold hover:bg-[#0052A3] transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
