import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { BadHabit } from '@/domain/types'

export function HabitForm({
  habit,
  onSubmit,
  onArchive,
}: {
  habit?: BadHabit
  onSubmit: (input: { name: string; penalty: number }) => Promise<void>
  onArchive?: () => Promise<void>
}) {
  const [name, setName] = useState(habit?.name ?? '')
  const [penalty, setPenalty] = useState(String(habit?.penalty ?? 10))
  const [saving, setSaving] = useState(false)

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        setSaving(true)
        void onSubmit({ name, penalty: Number(penalty) }).finally(() => setSaving(false))
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="habit-name">名称</Label>
        <Input id="habit-name" value={name} onChange={(event) => setName(event.target.value)} required className="h-10" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="habit-penalty">每次扣分</Label>
        <Input
          id="habit-penalty"
          type="number"
          min={0}
          value={penalty}
          onChange={(event) => setPenalty(event.target.value)}
          required
          className="h-10"
        />
      </div>
      <Button type="submit" disabled={saving} className="h-10">
        保存
      </Button>
      {onArchive ? (
        <Button type="button" variant="ghost" className="text-muted-foreground" onClick={() => void onArchive()}>
          归档
        </Button>
      ) : null}
    </form>
  )
}
