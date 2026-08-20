import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { Reward } from '@/domain/types'

export function RewardForm({
  reward,
  onSubmit,
  onArchive,
}: {
  reward?: Reward
  onSubmit: (input: { name: string; cost: number; maxRedemptions: number | null }) => Promise<void>
  onArchive?: () => Promise<void>
}) {
  const [name, setName] = useState(reward?.name ?? '')
  const [cost, setCost] = useState(String(reward?.cost ?? 100))
  const [unlimited, setUnlimited] = useState(reward?.maxRedemptions == null)
  const [maxRedemptions, setMaxRedemptions] = useState(String(reward?.maxRedemptions ?? 1))
  const [saving, setSaving] = useState(false)

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        setSaving(true)
        void onSubmit({
          name,
          cost: Number(cost),
          maxRedemptions: unlimited ? null : Number(maxRedemptions),
        }).finally(() => setSaving(false))
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="reward-name">奖励名称</Label>
        <Input id="reward-name" value={name} onChange={(event) => setName(event.target.value)} required className="h-10" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="reward-cost">需要积分</Label>
        <Input
          id="reward-cost"
          type="number"
          min={0}
          value={cost}
          onChange={(event) => setCost(event.target.value)}
          required
          className="h-10"
        />
      </div>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>不限制兑换次数</span>
        <Switch checked={unlimited} onCheckedChange={setUnlimited} />
      </label>
      {!unlimited ? (
        <div className="grid gap-2">
          <Label htmlFor="reward-max">最大兑换次数</Label>
          <Input
            id="reward-max"
            type="number"
            min={1}
            value={maxRedemptions}
            onChange={(event) => setMaxRedemptions(event.target.value)}
            className="h-10"
          />
        </div>
      ) : null}
      <Button type="submit" disabled={saving} className="h-10">
        保存
      </Button>
      {onArchive ? (
        <Button type="button" variant="ghost" className="text-muted-foreground" onClick={() => void onArchive()}>
          归档奖励
        </Button>
      ) : null}
    </form>
  )
}
