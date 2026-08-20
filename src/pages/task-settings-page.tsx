import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { FormSheet } from '@/components/layout/form-sheet'
import { Button } from '@/components/ui/button'
import { TaskForm } from '@/components/tasks/task-form'
import { useApp } from '@/hooks/use-app'
import { formatSchedule } from '@/lib/schedule-text'
import { formatDelta } from '@/lib/format'
import { AppError } from '@/domain/errors'

export function TaskSettingsPage() {
  const app = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const isNew = location.pathname.endsWith('/new')
  const editing = params.id ? app.state.tasks.find((item) => item.id === params.id) : undefined
  const tasks = app.state.tasks.filter((item) => item.status === 'active')

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
        title="任务管理"
        action={
          <Button size="sm" onClick={() => navigate('/settings/tasks/new')}>
            <Plus className="size-3.5" />
            新建任务
          </Button>
        }
      />
      <div className="overflow-hidden rounded-2xl border bg-card">
        {tasks.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => navigate(`/settings/tasks/${task.id}`)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-muted/50"
          >
            <div>
              <p className="text-sm font-medium">{task.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{formatSchedule(task)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="tabular-nums text-sm text-muted-foreground">{formatDelta(task.points)}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
          </button>
        ))}
        {tasks.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">还没有任务</p>
        ) : null}
      </div>

      <FormSheet
        open={isNew || Boolean(params.id)}
        onOpenChange={(open) => {
          if (!open) navigate('/settings/tasks')
        }}
        title={isNew ? '新建任务' : '编辑任务'}
      >
        <TaskForm
          key={params.id ?? 'new'}
          task={editing}
          todayDate={app.clock.today()}
          onSubmit={async (input) => {
            try {
              if (editing) {
                await app.tasks.update(editing.id, input)
              } else {
                await app.tasks.create(input)
              }
              navigate('/settings/tasks')
            } catch (error) {
              toast.error(error instanceof AppError ? error.message : '保存失败')
            }
          }}
          onArchive={
            editing
              ? async () => {
                  await app.tasks.archive(editing.id)
                  navigate('/settings/tasks')
                }
              : undefined
          }
        />
      </FormSheet>
    </div>
  )
}
