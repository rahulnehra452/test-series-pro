'use client'

import { useRouter } from 'next/navigation'
import { RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function RefreshButton() {
  const router = useRouter()
  const [spinning, setSpinning] = useState(false)

  const handleRefresh = () => {
    setSpinning(true)
    router.refresh()
    setTimeout(() => setSpinning(false), 1000)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5 rounded-xl h-8 text-xs font-semibold">
      <RefreshCcw className={`h-3 w-3 ${spinning ? 'animate-spin' : ''}`} />
      Refresh
    </Button>
  )
}
