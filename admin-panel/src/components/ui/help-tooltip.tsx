"use client"

import { HelpCircle } from "lucide-react"

interface HelpTooltipProps {
  text: string
  className?: string
}

export function HelpTooltip({ text, className }: HelpTooltipProps) {
  return (
    <div className={`relative group inline-flex items-center ml-1.5 ${className || ''}`}>
      <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max max-w-xs z-50">
        <div className="bg-popover text-popover-foreground text-xs rounded-md shadow-md border px-3 py-2 text-center">
          {text}
          <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 border-4 border-transparent border-t-border" />
          <div className="absolute left-1/2 -bottom-[3px] -translate-x-1/2 border-4 border-transparent border-t-popover" />
        </div>
      </div>
    </div>
  )
}
