import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  addDays,
  calendarGrid,
  formatChineseMonth,
  isWithinCheckinWindow,
  monthRange,
  previousYearMonth,
  yearMonth,
} from '@/domain/dates'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

export function CheckinCalendar({
  open,
  todayDate,
  selectedDate,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  todayDate: string
  selectedDate: string
  onOpenChange: (open: boolean) => void
  onSelect: (date: string) => void
}) {
  const [browsingMonth, setBrowsingMonth] = useState<string | null>(null)
  const calendarMonth = browsingMonth ?? yearMonth(selectedDate)
  const windowStart = addDays(todayDate, -2)
  const canGoPrev = yearMonth(windowStart) < calendarMonth
  const canGoNext = calendarMonth < yearMonth(todayDate)
  const days = calendarGrid(calendarMonth)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setBrowsingMonth(null)
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="sr-only">选择日期</DialogTitle>
          <div className="flex items-center justify-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canGoPrev}
              aria-label="上个月"
              onClick={() => setBrowsingMonth(previousYearMonth(calendarMonth))}
            >
              <ChevronLeft />
            </Button>
            <p className="min-w-16 text-center text-sm font-medium">
              {formatChineseMonth(calendarMonth)}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canGoNext}
              aria-label="下个月"
              onClick={() =>
                setBrowsingMonth(yearMonth(addDays(monthRange(calendarMonth).end, 1)))
              }
            >
              <ChevronRight />
            </Button>
          </div>
        </DialogHeader>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((label) => (
            <div key={label} className="py-1 text-xs text-muted-foreground">
              {label}
            </div>
          ))}
          {days.map((day) => {
            const enabled = day.inMonth && isWithinCheckinWindow(day.date, todayDate)
            const selected = day.date === selectedDate
            return (
              <button
                key={day.date}
                type="button"
                disabled={!enabled}
                onClick={() => {
                  onSelect(day.date)
                  setBrowsingMonth(null)
                  onOpenChange(false)
                }}
                className={cn(
                  'flex size-9 items-center justify-center justify-self-center rounded-full text-sm tabular-nums',
                  !day.inMonth && 'text-muted-foreground/30',
                  day.inMonth && !enabled && 'text-muted-foreground/40',
                  enabled && !selected && 'text-foreground hover:bg-muted',
                  selected && 'bg-complete text-complete-foreground',
                )}
              >
                {Number(day.date.slice(8, 10))}
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
