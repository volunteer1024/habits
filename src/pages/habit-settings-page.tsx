import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { FormSheet } from '@/components/layout/form-sheet'
import { Button } from '@/components/ui/button'
import { HabitForm } from '@/components/habits/habit-form'
import { useApp } from '@/hooks/use-app'
import { formatDelta } from '@/lib/format'
import { AppError } from '@/domain/errors'

export function HabitSettingsPage() {
  const app = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const isNew = location.pathname.endsWith('/new')
  const editing = params.id ? app.state.habits.find((item) => item.id === params.id) : undefined
  const habits = app.state.habits.filter((item) => item.status === 'active')

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/me')}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ChevronLeft className="size-4" />
        我的
      </button>
      <PageHeader
        title="坏习惯管理"
        action={
          <Button size="sm" onClick={() => navigate('/settings/habits/new')}>
            <Plus className="size-3.5" />
            新建
          </Button>
        }
      />
      <div className="overflow-hidden rounded-2xl border bg-card">
        {habits.map((habit) => (
          <button
            key={habit.id}
            type="button"
            onClick={() => navigate(`/settings/habits/${habit.id}`)}
            className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-muted/50"
          >
            <span className="text-sm font-medium">{habit.name}</span>
            <div className="flex items-center gap-2">
              <span className="tabular-nums text-sm text-muted-foreground">
                {formatDelta(-habit.penalty)} / 次
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>

      <FormSheet
        open={isNew || Boolean(params.id)}
        onOpenChange={(open) => {
          if (!open) navigate('/settings/habits')
        }}
        title={isNew ? '新建坏习惯' : '编辑坏习惯'}
      >
        <HabitForm
          key={params.id ?? 'new'}
          habit={editing}
          onSubmit={async (input) => {
            try {
              if (editing) {
                await app.habits.update(editing.id, input)
              } else {
                await app.habits.create(input)
              }
              navigate('/settings/habits')
            } catch (error) {
              toast.error(error instanceof AppError ? error.message : '保存失败')
            }
          }}
          onArchive={
            editing
              ? async () => {
                  await app.habits.archive(editing.id)
                  navigate('/settings/habits')
                }
              : undefined
          }
        />
      </FormSheet>
    </div>
  )
}
