"use client"

export function SearchTrigger() {
  return (
    <div className="hidden lg:flex items-center justify-end mb-4">
      <button
        onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5 bg-secondary/30 hover:bg-secondary/50 transition-colors text-xs text-muted-foreground"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Search…
        <kbd className="ml-2 inline-flex items-center gap-0.5 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-[#2C2C2E] px-1.5 py-0.5 text-[10px] font-mono font-semibold">⌘K</kbd>
      </button>
    </div>
  )
}
