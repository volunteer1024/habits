import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDelta } from '@/lib/format'
import type { TodayItem } from '@/services/domain-services'

export function TaskRow({
  item,
  onToggle,
}: {
  item: TodayItem
  onToggle: () => void
}) {
  const done = item.instance.status === 'completed'
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 text-left transition-colors',
        done ? 'border-complete/20 bg-complete-soft/60' : 'border-border hover:bg-muted/60',
      )}
    >
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full border-2',
          done ? 'border-complete bg-complete text-complete-foreground' : 'border-muted-foreground/30',
        )}
      >
        {done ? <Check className="size-3.5" strokeWidth={3} /> : null}
      </span>
      <span className={cn('flex-1 text-[15px] font-medium', done && 'text-complete')}>
        {item.displayName}
      </span>
      <span
        className={cn(
          'tabular-nums text-sm font-medium',
          done ? 'text-complete' : 'text-muted-foreground',
        )}
      >
        {formatDelta(item.points)}
      </span>
    </button>
  )
}
