"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Calendar, Clock, Eye, EyeOff } from "lucide-react"

interface TestInfo {
  id: string
  title: string
  is_active: boolean
  scheduled_for: string | null
  duration_minutes: number | null
  series_title: string
}

interface CalendarClientProps {
  tests: TestInfo[]
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CalendarClient({ tests }: CalendarClientProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1) }
    else setCurrentMonth(currentMonth - 1)
  }

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1) }
    else setCurrentMonth(currentMonth + 1)
  }

  // Group tests by day
  const testsByDay = new Map<number, TestInfo[]>()
  tests.forEach(t => {
    if (t.scheduled_for) {
      const d = new Date(t.scheduled_for)
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const day = d.getDate()
        if (!testsByDay.has(day)) testsByDay.set(day, [])
        testsByDay.get(day)!.push(t)
      }
    }
  })

  const unscheduled = tests.filter(t => !t.scheduled_for)

  // Build calendar grid
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isToday = (day: number) =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white flex items-center gap-3">
            <Calendar className="w-8 h-8 text-indigo-500" />
            Publishing Calendar
          </h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Schedule and visualize when tests go live.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-lg font-bold min-w-[180px] text-center">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="bg-white dark:bg-[#1C1C1E] overflow-hidden">
        <CardContent className="p-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b dark:border-neutral-800">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              const dayTests = day ? testsByDay.get(day) || [] : []
              return (
                <div
                  key={idx}
                  className={`min-h-[100px] border-b border-r dark:border-neutral-800 p-2 ${day === null ? 'bg-neutral-50 dark:bg-neutral-900/50' : ''
                    } ${isToday(day!) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-semibold mb-1 ${isToday(day) ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayTests.map(t => (
                          <div
                            key={t.id}
                            className={`text-[10px] leading-tight px-2 py-1 rounded-md font-medium truncate ${t.is_active
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                              }`}
                            title={`${t.title} (${t.series_title})`}
                          >
                            {t.is_active ? <Eye className="w-3 h-3 inline mr-1" /> : <EyeOff className="w-3 h-3 inline mr-1" />}
                            {t.title}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Unscheduled Tests */}
      {unscheduled.length > 0 && (
        <Card className="bg-white dark:bg-[#1C1C1E]">
          <CardContent className="pt-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Unscheduled Tests ({unscheduled.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {unscheduled.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border dark:border-neutral-800">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.series_title}</p>
                  </div>
                  <Badge variant={t.is_active ? "default" : "secondary"} className="text-xs ml-2 shrink-0">
                    {t.is_active ? 'Live' : 'Draft'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
