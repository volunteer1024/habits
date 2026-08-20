import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import { PROFILE } from '@/domain/types'

const menus = [
  { label: '任务管理', to: '/settings/tasks' },
  { label: '坏习惯管理', to: '/settings/habits' },
  { label: '导入', to: 'placeholder' },
  { label: '导出', to: 'placeholder' },
  { label: '关于', to: '/me/about' },
]

export function MePage() {
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader title="我的" />

      <section className="mb-8 flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-complete text-lg font-semibold text-complete-foreground">
          孤
        </div>
        <div>
          <p className="text-lg font-semibold">{PROFILE.name}</p>
          <p className="text-sm text-muted-foreground">ID: {PROFILE.id}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card">
        {menus.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              if (item.to === 'placeholder') {
                toast.message('功能开发中')
                return
              }
              navigate(item.to)
            }}
            className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-muted/50"
          >
            <span className="text-sm">{item.label}</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        ))}
      </section>
    </div>
  )
}
