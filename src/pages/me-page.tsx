import { useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  backupFilename,
  createBackup,
  parseBackup,
  serializeBackup,
} from '@/domain/backup'
import { AppError } from '@/domain/errors'
import { PROFILE, type AppState } from '@/domain/types'
import { useApp } from '@/hooks/use-app'
import { restoreBackup } from '@/services/backup'

const links = [
  { label: '任务管理', to: '/settings/tasks' },
  { label: '坏习惯管理', to: '/settings/habits' },
  { label: '关于', to: '/me/about' },
]

export function MePage() {
  const navigate = useNavigate()
  const app = useApp()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<AppState | null>(null)

  function exportBackup() {
    const raw = serializeBackup(createBackup(app.state, app.clock.nowIso()))
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = backupFilename(app.clock.today())
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    toast.success('已下载备份')
  }

  async function onImportFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    try {
      setPending(parseBackup(await file.text()))
    } catch (error) {
      const message =
        error instanceof AppError ? error.message : '无法读取备份，请选择本应用导出的 JSON 文件。'
      toast.error(message)
    }
  }

  async function confirmRestore() {
    if (!pending) return
    const next = pending
    await restoreBackup(app.store, next)
    setPending(null)
    toast.success('已恢复备份')
  }

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
        <MenuButton label={links[0].label} onClick={() => navigate(links[0].to)} />
        <MenuButton label={links[1].label} onClick={() => navigate(links[1].to)} />
        <MenuButton label="导入" onClick={() => fileInputRef.current?.click()} />
        <MenuButton label="导出" onClick={exportBackup} />
        <MenuButton label={links[2].label} onClick={() => navigate(links[2].to)} />
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          void onImportFile(event)
        }}
      />

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>恢复备份</DialogTitle>
            <DialogDescription>
              这将用备份覆盖当前所有数据，且无法撤销。建议先导出当前数据。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => void confirmRestore()}>
              覆盖并恢复
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MenuButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-muted/50"
    >
      <span className="text-sm">{label}</span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </button>
  )
}
