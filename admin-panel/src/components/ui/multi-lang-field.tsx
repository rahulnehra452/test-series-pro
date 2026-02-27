'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Languages } from 'lucide-react'

interface MultiLangFieldProps {
  label: string
  valueEn: string
  valueHi: string
  onChangeEn: (val: string) => void
  onChangeHi: (val: string) => void
  rows?: number
  placeholder?: string
}

const LANGS = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
] as const

/**
 * Multi-language text field — switch between English and Hindi with a tab selector.
 * Use in question forms, test descriptions, etc.
 */
export function MultiLangField({
  label,
  valueEn,
  valueHi,
  onChangeEn,
  onChangeHi,
  rows = 3,
  placeholder,
}: MultiLangFieldProps) {
  const [lang, setLang] = useState<'en' | 'hi'>('en')
  const value = lang === 'en' ? valueEn : valueHi
  const onChange = lang === 'en' ? onChangeEn : onChangeHi

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Languages className="h-3 w-3" /> {label}
        </Label>
        <div className="flex items-center gap-1 bg-secondary/30 rounded-lg p-0.5">
          {LANGS.map(l => (
            <Button
              key={l.code}
              variant="ghost"
              size="sm"
              className={`h-6 px-2 text-[10px] font-bold rounded-md gap-1 ${lang === l.code ? 'bg-white dark:bg-[#2C2C2E] shadow-sm' : ''}`}
              onClick={() => setLang(l.code)}
            >
              {l.flag} {l.label}
            </Button>
          ))}
        </div>
      </div>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder || `Enter ${lang === 'en' ? 'English' : 'Hindi'} text…`}
        className="rounded-xl resize-none"
        dir={lang === 'hi' ? 'auto' : 'ltr'}
      />
      <div className="flex items-center gap-2">
        {valueEn && <Badge variant="secondary" className="text-[8px] h-4">EN ✓</Badge>}
        {valueHi && <Badge variant="secondary" className="text-[8px] h-4">HI ✓</Badge>}
        {!valueEn && !valueHi && <span className="text-[10px] text-muted-foreground">No translations yet</span>}
      </div>
    </div>
  )
}
