import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useApp } from '@/hooks/use-app'
import { formatChineseMonth, previousYearMonth, yearMonth } from '@/domain/dates'
import { addDays, monthRange } from '@/domain/dates'
import { formatDelta, formatRate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CalendarDay } from '@/services/domain-services'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

function CalendarCell({ day }: { day: CalendarDay }) {
  const showPoints = day.inMonth && day.points !== 0
  return (
    <div className="flex flex-col items-center gap-0.5 py-0.5">
      <div
        className={cn(
          'flex size-8 items-center justify-center rounded-full text-sm tabular-nums',
          !day.inMonth && 'text-muted-foreground/30',
          day.inMonth && day.marked && 'bg-complete text-complete-foreground',
          day.inMonth && !day.marked && 'text-foreground',
        )}
      >
        {Number(day.date.slice(8, 10))}
      </div>
      <span
        className={cn(
          'h-3 whitespace-nowrap text-[11px] leading-3 tabular-nums',
          showPoints && day.points > 0 && 'text-complete',
          showPoints && day.points < 0 && 'text-loss',
          !showPoints && 'invisible',
        )}
      >
        {showPoints ? formatDelta(day.points) : '0'}
      </span>
    </div>
  )
}

export function StatsPage() {
  const app = useApp()
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [calendarMonth, setCalendarMonth] = useState(yearMonth(app.clock.today()))
  const [filter, setFilter] = useState<string>('all')

  const stats = period === 'week' ? app.stats.weekStats() : app.stats.monthStats()
  const days = app.stats.calendarDays(calendarMonth, filter)
  const activeTasks = app.state.tasks.filter((task) => task.status === 'active')
  const monthLabel = formatChineseMonth(calendarMonth)
  const canGoNext = calendarMonth < yearMonth(app.clock.today())

  const bonusRows = useMemo(() => {
    if (period !== 'month') return []
    return stats.tasks.filter((task) => task.monthlyPerfectBonus > 0 && task.eligibleForBonus)
  }, [period, stats.tasks])

  return (
    <div>
      <PageHeader title="统计" description="只看完成，不强调未完成" />

      <div className="mb-6 grid grid-cols-2 rounded-full bg-muted p-1">
        <button
          type="button"
          onClick={() => setPeriod('week')}
          className={cn(
            'rounded-full py-2 text-sm font-medium',
            period === 'week' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
          )}
        >
          本周
        </button>
        <button
          type="button"
          onClick={() => setPeriod('month')}
          className={cn(
            'rounded-full py-2 text-sm font-medium',
            period === 'month' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
          )}
        >
          本月
        </button>
      </div>

      <section className="rounded-2xl border bg-card px-5 py-6">
        <p className="text-sm text-muted-foreground">完成率</p>
        <p className="mt-1 font-heading text-4xl font-semibold tracking-tight">
          {formatRate(stats.completed, stats.scheduled)}
        </p>
        <p className="mt-1 tabular-nums text-sm text-muted-foreground">
          {stats.completed} / {stats.scheduled}
        </p>
      </section>

      <section className="mt-4 space-y-2">
        {stats.tasks.map((task) => (
          <div key={task.taskId} className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3">
            <span className="text-sm font-medium">{task.name}</span>
            <span className="tabular-nums text-sm text-muted-foreground">
              {task.completed} / {task.scheduled}
            </span>
          </div>
        ))}
      </section>

      {bonusRows.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">全勤奖励</h2>
          <div className="space-y-2">
            {bonusRows.map((task) => (
              <div key={task.taskId} className="rounded-2xl border bg-card px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{task.name}</span>
                  <span className="text-sm text-complete">奖励 +{task.monthlyPerfectBonus}</span>
                </div>
                <p className="mt-1 tabular-nums text-sm text-muted-foreground">
                  当前 {task.completed} / {task.scheduled}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCalendarMonth(previousYearMonth(calendarMonth))}
            >
              <ChevronLeft />
            </Button>
            <h2 className="min-w-16 text-center text-sm font-medium">{monthLabel}</h2>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!canGoNext}
              onClick={() =>
                setCalendarMonth(yearMonth(addDays(monthRange(calendarMonth).end, 1)))
              }
            >
              <ChevronRight />
            </Button>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="全部任务" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部任务</SelectItem>
              {activeTasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((label) => (
            <div key={label} className="py-1 text-xs text-muted-foreground">
              {label}
            </div>
          ))}
          {days.map((day) => (
            <CalendarCell key={day.date} day={day} />
          ))}
        </div>
      </section>
    </div>
  )
}
