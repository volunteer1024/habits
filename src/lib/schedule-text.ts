import { weekdayLabel } from '@/domain/dates'
import type { Task } from '@/domain/types'

export function formatSchedule(task: Task): string {
  const { schedule } = task
  const freq =
    schedule.frequency === 'daily'
      ? schedule.interval === 1
        ? '每天'
        : `每 ${schedule.interval} 天`
      : `每周${(schedule.weekdays ?? []).map((day) => weekdayLabel(day)).join('、')}`
  const end =
    schedule.endType === 'never' ? '永不结束' : `完成 ${schedule.count} 次后结束`
  return `${freq} · ${end}`
}
