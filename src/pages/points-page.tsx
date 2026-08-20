import { useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import { FormSheet } from '@/components/layout/form-sheet'
import { Button } from '@/components/ui/button'
import { RewardForm } from '@/components/rewards/reward-form'
import { useApp } from '@/hooks/use-app'
import { formatLedgerDay } from '@/domain/dates'
import { formatBalance, formatDelta } from '@/lib/format'
import { AppError } from '@/domain/errors'
import { cn } from '@/lib/utils'

export function PointsPage() {
  const app = useApp()
  const navigate = useNavigate()
  const params = useParams()
  const location = useLocation()
  const isNew = location.pathname === '/rewards/new'
  const editing = params.id ? app.state.rewards.find((item) => item.id === params.id) : undefined
  const sheetOpen = isNew || Boolean(params.id)
  const rewards = app.state.rewards.filter((item) => item.status === 'active')
  const balance = app.points.balance()
  const recent = app.points.recent(30)

  const grouped = useMemo(() => {
    const groups: { date: string; items: typeof recent }[] = []
    for (const item of recent) {
      const last = groups[groups.length - 1]
      if (last && last.date === item.businessDate) {
        last.items.push(item)
      } else {
        groups.push({ date: item.businessDate, items: [item] })
      }
    }
    return groups
  }, [recent])

  return (
    <div>
      <PageHeader
        title="积分"
        action={
          <Button variant="outline" size="sm" onClick={() => navigate('/rewards/new')}>
            新建奖励
          </Button>
        }
      />

      <section className="rounded-2xl border bg-card px-5 py-6">
        <p className="text-sm text-muted-foreground">我的积分</p>
        <p className="mt-1 font-heading text-5xl font-semibold tracking-tight tabular-nums">
          {formatBalance(balance)}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">奖励</h2>
        <div className="space-y-3">
          {rewards.map((reward) => {
            const check = app.rewards.canRedeem(reward)
            const used = app.rewards.redemptionCount(reward.id)
            return (
              <div key={reward.id} className="rounded-2xl border bg-card px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => navigate(`/rewards/${reward.id}`)}
                  >
                    <p className="font-medium">{reward.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{reward.cost} 积分</p>
                    {reward.maxRedemptions !== null ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        已兑换 {used} / {reward.maxRedemptions} 次
                      </p>
                    ) : null}
                  </button>
                  <Button
                    disabled={!check.ok}
                    onClick={() => {
                      void app.rewards
                        .redeem(reward.id)
                        .then(() => toast.success('已兑换'))
                        .catch((error) =>
                          toast.error(error instanceof AppError ? error.message : '兑换失败'),
                        )
                    }}
                  >
                    兑换
                  </Button>
                </div>
                {!check.ok && check.code === 'INSUFFICIENT_POINTS' ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    当前 {balance} / 需要 {reward.cost}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">最近记录</h2>
        {grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">还没有积分记录</p>
        ) : (
          <div className="space-y-5">
            {grouped.map((group) => (
              <div key={group.date}>
                <p className="mb-2 text-xs text-muted-foreground">
                  {formatLedgerDay(group.date, app.clock.today())}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-1.5">
                      <span className="text-sm">{item.description}</span>
                      <span
                        className={cn(
                          'tabular-nums text-sm font-medium',
                          item.delta > 0 ? 'text-complete' : 'text-muted-foreground',
                        )}
                      >
                        {formatDelta(item.delta)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <FormSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) navigate('/points')
        }}
        title={isNew ? '新建奖励' : '编辑奖励'}
      >
        <RewardForm
          reward={editing}
          onSubmit={async (input) => {
            if (editing) {
              await app.rewards.update(editing.id, input)
            } else {
              await app.rewards.create(input)
            }
            navigate('/points')
          }}
          onArchive={
            editing
              ? async () => {
                  await app.rewards.archive(editing.id)
                  navigate('/points')
                }
              : undefined
          }
        />
      </FormSheet>
    </div>
  )
}
