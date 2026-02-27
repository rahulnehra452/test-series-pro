"use client"

import { useState } from "react"

export function InteractiveBarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (!data || data.length === 0) return <div className="text-sm text-muted-foreground p-4 text-center">No data available</div>

  const maxValue = Math.max(...data.map(d => d.value), 1)
  const height = 200

  return (
    <div className="relative w-full" style={{ height: `${height}px` }}>
      <div className="absolute inset-x-0 bottom-6 top-0 flex flex-col justify-between text-[10px] text-muted-foreground">
        <div className="flex border-b border-black/5 dark:border-white/5 pb-1">{maxValue.toLocaleString()}</div>
        <div className="flex border-b border-black/5 dark:border-white/5 pb-1">{Math.floor(maxValue / 2).toLocaleString()}</div>
        <div className="flex border-b border-black/5 dark:border-white/5 pb-1">0</div>
      </div>

      <div className="absolute inset-0 pl-8 pb-6 flex items-end justify-between gap-2 overflow-x-auto overflow-y-hidden">
        {data.map((item, i) => {
          const heightPct = Math.max((item.value / maxValue) * 100, 2) // min 2% height
          const isHovered = hoveredIndex === i

          return (
            <div
              key={i}
              className="relative flex flex-col items-center flex-1 h-full justify-end group min-w-[30px]"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div
                className={`w-full max-w-[40px] rounded-t-sm transition-all duration-300 ${item.color || 'bg-[#0066CC]'} ${isHovered ? 'brightness-110 filter' : 'opacity-80'}`}
                style={{ height: `${heightPct}%` }}
              />

              <div className="absolute -bottom-6 w-full text-center text-[10px] text-muted-foreground font-medium truncate px-1">
                {item.label}
              </div>

              {isHovered && (
                <div className="absolute bottom-full mb-2 bg-[#1C1C1E] dark:bg-white text-white dark:text-black px-2 py-1 rounded text-xs font-bold shadow-xl whitespace-nowrap z-10 animate-in fade-in zoom-in-95 duration-200">
                  {item.label}: {item.value.toLocaleString()}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1C1C1E] dark:border-t-white" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
