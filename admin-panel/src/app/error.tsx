'use client'

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7] dark:bg-[#000000]">
      <div className="text-center space-y-4 px-6">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 mb-2">
          <span className="text-3xl font-black text-red-600 dark:text-red-400">!</span>
        </div>
        <h1 className="text-2xl font-extrabold text-[#1D1D1F] dark:text-white tracking-tight">Something went wrong</h1>
        <p className="text-sm text-muted-foreground font-medium max-w-sm">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-xl bg-[#0066CC] text-white text-sm font-semibold hover:bg-[#0052A3] transition-colors"
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="px-6 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-sm font-semibold hover:bg-secondary/50 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}
