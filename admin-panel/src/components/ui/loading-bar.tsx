'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'

/**
 * A thin animated progress bar at the top of the viewport.
 * Triggers on pathname changes via useEffect.
 */
export function LoadingBar() {
  const pathname = usePathname()
  const barRef = useRef<HTMLDivElement>(null)
  const prevPath = useRef<string | null>(null)

  const animate = useCallback(() => {
    const bar = barRef.current
    if (!bar) return

    bar.style.opacity = '1'
    bar.style.width = '30%'
    bar.style.transition = 'width 300ms ease-out'

    const t1 = setTimeout(() => { if (bar) bar.style.width = '60%' }, 100)
    const t2 = setTimeout(() => { if (bar) bar.style.width = '80%' }, 300)
    const t3 = setTimeout(() => {
      if (!bar) return
      bar.style.width = '100%'
      setTimeout(() => {
        if (!bar) return
        bar.style.transition = 'opacity 300ms'
        bar.style.opacity = '0'
        setTimeout(() => {
          if (!bar) return
          bar.style.width = '0%'
          bar.style.transition = ''
        }, 300)
      }, 150)
    }, 500)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  useEffect(() => {
    if (prevPath.current !== null && prevPath.current !== pathname) {
      animate()
    }
    prevPath.current = pathname
  }, [pathname, animate])

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-[2px] pointer-events-none">
      <div
        ref={barRef}
        className="h-full bg-gradient-to-r from-[#0066CC] via-[#5AC8FA] to-[#0066CC]"
      />
    </div>
  )
}
