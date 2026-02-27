'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, X } from 'lucide-react'

// Common Ionicons names used in mobile apps
const IONICON_NAMES = [
  'school', 'book', 'library', 'document', 'newspaper',
  'calculator', 'flask', 'globe', 'planet', 'earth',
  'briefcase', 'business', 'cash', 'wallet', 'card',
  'people', 'person', 'body', 'accessibility', 'happy',
  'trophy', 'medal', 'ribbon', 'star', 'heart',
  'shield', 'lock', 'key', 'finger-print', 'eye',
  'code', 'terminal', 'construct', 'hammer', 'build',
  'bulb', 'flash', 'sunny', 'moon', 'cloudy',
  'musical-note', 'headset', 'mic', 'volume-high', 'radio',
  'camera', 'image', 'film', 'videocam', 'tv',
  'desktop', 'laptop', 'phone-portrait', 'tablet-portrait', 'watch',
  'wifi', 'cloud', 'server', 'hardware-chip', 'analytics',
  'bar-chart', 'pie-chart', 'trending-up', 'stats-chart', 'pulse',
  'rocket', 'airplane', 'car', 'bus', 'train',
  'home', 'storefront', 'cafe', 'restaurant', 'bed',
  'fitness', 'basketball', 'football', 'golf', 'bicycle',
  'map', 'compass', 'navigate', 'location', 'flag',
  'time', 'timer', 'alarm', 'hourglass', 'calendar',
  'chatbubble', 'mail', 'notifications', 'megaphone', 'alert',
  'checkmark-circle', 'close-circle', 'add-circle', 'remove-circle', 'help-circle',
  'settings', 'options', 'cog', 'color-palette', 'brush',
  'pencil', 'create', 'trash', 'clipboard', 'copy',
  'download', 'share', 'link', 'attach', 'bookmark',
  'leaf', 'flower', 'rose', 'paw', 'bug',
  'medical', 'bandage', 'thermometer', 'nutrition', 'water',
]

interface IconPickerProps {
  value: string
  onChange: (value: string) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return IONICON_NAMES
    const q = search.toLowerCase()
    return IONICON_NAMES.filter(name => name.includes(q))
  }, [search])

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="e.g. school"
        className="flex-1"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="shrink-0 text-xs gap-1.5"
      >
        <Search className="h-3 w-3" />
        Browse
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[80vh] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Choose an Icon (Ionicons)</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search icons…"
              className="pl-9 h-9 rounded-xl"
            />
            {search && (
              <button
                title="Clear search"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-5 gap-2 max-h-[400px] overflow-y-auto mt-2 pr-1">
            {filtered.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  onChange(name)
                  setOpen(false)
                }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center hover:border-[#0066CC]/50 hover:bg-[#0066CC]/5 ${value === name
                  ? 'border-[#0066CC] bg-[#0066CC]/10 ring-1 ring-[#0066CC]/30'
                  : 'border-transparent bg-secondary/30'
                  }`}
              >
                <span className="text-lg">📋</span>
                <span className="text-[9px] font-medium text-muted-foreground leading-tight truncate w-full">
                  {name}
                </span>
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No icons matching &quot;{search}&quot;
            </p>
          )}

          <p className="text-[10px] text-muted-foreground text-center mt-2">
            {filtered.length} icons · Names correspond to Ionicons for React Native
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
