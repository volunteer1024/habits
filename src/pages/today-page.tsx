import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { TaskRow } from '@/components/today/task-row'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { useApp } from '@/hooks/use-app'
import { formatChineseDate } from '@/domain/dates'
import { formatBalance, formatDelta } from '@/lib/format'
import { AppError } from '@/domain/errors'
import type { TodayItem } from '@/services/domain-services'

export function TodayPage() {
  const app = useApp()
  const [items, setItems] = useState<TodayItem[]>([])
  const [habitOpen, setHabitOpen] = useState(false)
  const today = app.clock.today()
  const habits = app.state.habits.filter((habit) => habit.status === 'active')
  const logs = app.habits.logsForDate(today)

  useEffect(() => {
    void app.tasks.getTodayItems().then(setItems)
  }, [app.tasks, app.state.taskInstances, app.state.tasks])

  const groupedLogs = useMemo(() => {
    const map = new Map<
      string,
      { habitId: string; name: string; count: number; penalty: number; latestLogId: string }
    >()
    for (const log of logs) {
      const current = map.get(log.habitId)
      map.set(log.habitId, {
        habitId: log.habitId,
        name: log.habitNameSnapshot,
        count: (current?.count ?? 0) + 1,
        penalty: (current?.penalty ?? 0) + log.penaltySnapshot,
        latestLogId: log.id,
      })
    }
    return [...map.values()]
  }, [logs])

  async function toggle(item: TodayItem) {
    try {
      if (item.instance.status === 'completed') {
        await app.tasks.undo(item.task.id)
      } else {
        await app.tasks.complete(item.task.id)
      }
    } catch (error) {
      toast.error(error instanceof AppError ? error.message : '操作失败')
    }
  }

  async function recordHabit(id: string) {
    try {
      await app.habits.record(id)
      setHabitOpen(false)
    } catch (error) {
      toast.error(error instanceof AppError ? error.message : '记录失败')
    }
  }

  async function removeHabitLog(logId: string) {
    try {
      await app.habits.removeTodayLog(logId)
    } catch (error) {
      toast.error(error instanceof AppError ? error.message : '删除失败')
    }
  }

  return (
    <div>
      <PageHeader
        title="今天"
        description={formatChineseDate(today)}
        action={
          <div className="rounded-full bg-complete-soft px-3 py-1 text-sm font-medium text-complete">
            {formatBalance(app.points.balance())} 积分
          </div>
        }
      />

      <section className="space-y-2">
        {items.map((item) => (
          <TaskRow key={item.task.id} item={item} onToggle={() => void toggle(item)} />
        ))}
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            今天没有任务
          </p>
        ) : null}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">坏习惯</h2>
          <Button variant="ghost" size="sm" onClick={() => setHabitOpen(true)}>
            <Plus className="size-3.5" />
            记录一次
          </Button>
        </div>
        {groupedLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">今天还没有记录</p>
        ) : (
          <div className="space-y-2">
            {groupedLogs.map((log) => (
              <div
                key={log.habitId}
                className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3"
              >
                <span className="text-sm">
                  {log.name}
                  {log.count > 1 ? (
                    <span className="ml-1 text-muted-foreground">×{log.count}</span>
                  ) : null}
                </span>
                <div className="flex items-center gap-1">
                  <span className="tabular-nums text-sm text-muted-foreground">
                    {formatDelta(-log.penalty)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={log.count > 1 ? `删除一次${log.name}` : `删除${log.name}`}
                    onClick={() => void removeHabitLog(log.latestLogId)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Drawer open={habitOpen} onOpenChange={setHabitOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>记录坏习惯</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-1 px-4 pb-8">
            {habits.map((habit) => (
              <button
                key={habit.id}
                type="button"
                onClick={() => void recordHabit(habit.id)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-muted"
              >
                <span>{habit.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatDelta(-habit.penalty)}
                </span>
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
