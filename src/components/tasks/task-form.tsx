import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import type { CreateTaskInput } from '@/services/domain-services'
import type { Task } from '@/domain/types'

const WEEK_OPTIONS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 7, label: '周日' },
]

export function TaskForm({
  task,
  todayDate,
  onSubmit,
  onArchive,
}: {
  task?: Task
  todayDate: string
  onSubmit: (input: CreateTaskInput) => Promise<void>
  onArchive?: () => Promise<void>
}) {
  const [name, setName] = useState(task?.name ?? '')
  const [points, setPoints] = useState(String(task?.points ?? 5))
  const [bonus, setBonus] = useState(String(task?.monthlyPerfectBonus ?? 0))
  const [startDate, setStartDate] = useState(task?.schedule.startDate ?? todayDate)
  const [frequency, setFrequency] = useState(task?.schedule.frequency ?? 'daily')
  const [weekdays, setWeekdays] = useState<number[]>(task?.schedule.weekdays ?? [1, 3, 5])
  const [endType, setEndType] = useState(task?.schedule.endType ?? 'never')
  const [count, setCount] = useState(String(task?.schedule.count ?? 100))
  const [offset, setOffset] = useState(task?.recordOffsetDays === -1)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        name,
        points: Number(points),
        monthlyPerfectBonus: Number(bonus),
        startDate,
        frequency,
        weekdays: frequency === 'weekly' ? weekdays : undefined,
        endType,
        count: endType === 'count' ? Number(count) : undefined,
        recordOffsetDays: offset ? -1 : 0,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="grid gap-5" onSubmit={(event) => void handleSubmit(event)}>
      <div className="grid gap-2">
        <Label htmlFor="task-name">任务名称</Label>
        <Input id="task-name" value={name} onChange={(event) => setName(event.target.value)} required className="h-10" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="task-points">每次完成积分</Label>
        <Input
          id="task-points"
          type="number"
          min={0}
          value={points}
          onChange={(event) => setPoints(event.target.value)}
          required
          className="h-10"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="task-bonus">月度全勤奖励</Label>
        <Input
          id="task-bonus"
          type="number"
          min={0}
          value={bonus}
          onChange={(event) => setBonus(event.target.value)}
          className="h-10"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="task-start">开始日期</Label>
        <Input
          id="task-start"
          type="date"
          min={task ? undefined : todayDate}
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          required
          className="h-10"
        />
      </div>
      <fieldset className="grid gap-2">
        <Label>周期</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant={frequency === 'daily' ? 'default' : 'outline'} onClick={() => setFrequency('daily')}>
            每天
          </Button>
          <Button type="button" variant={frequency === 'weekly' ? 'default' : 'outline'} onClick={() => setFrequency('weekly')}>
            每周
          </Button>
        </div>
        {frequency === 'weekly' ? (
          <div className="mt-1 flex flex-wrap gap-3">
            {WEEK_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={weekdays.includes(option.value)}
                  onCheckedChange={(checked) => {
                    setWeekdays((current) =>
                      checked
                        ? [...current, option.value].sort((a, b) => a - b)
                        : current.filter((day) => day !== option.value),
                    )
                  }}
                />
                {option.label}
              </label>
            ))}
          </div>
        ) : null}
      </fieldset>
      <fieldset className="grid gap-2">
        <Label>结束规则</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant={endType === 'never' ? 'default' : 'outline'} onClick={() => setEndType('never')}>
            永不结束
          </Button>
          <Button type="button" variant={endType === 'count' ? 'default' : 'outline'} onClick={() => setEndType('count')}>
            完成 N 次
          </Button>
        </div>
        {endType === 'count' ? (
          <Input
            type="number"
            min={1}
            value={count}
            onChange={(event) => setCount(event.target.value)}
            className="h-10"
          />
        ) : null}
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={offset} onCheckedChange={(checked) => setOffset(Boolean(checked))} />
        记作昨晚的行为（如早睡）
      </label>
      <Button type="submit" disabled={saving} className="h-10">
        保存
      </Button>
      {onArchive ? (
        <Button type="button" variant="ghost" className="text-muted-foreground" onClick={() => void onArchive()}>
          归档任务
        </Button>
      ) : null}
    </form>
  )
}
