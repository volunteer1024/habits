import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  const sync = app.sync
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<AppState | null>(null)
  const [syncUrl, setSyncUrl] = useState('')
  const [syncUrlReady, setSyncUrlReady] = useState(false)

  useEffect(() => {
    let active = true
    void sync.savedBaseUrl().then((url) => {
      if (!active) return
      setSyncUrl(url)
      setSyncUrlReady(true)
    })
    return () => {
      active = false
    }
  }, [sync])

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

  async function saveSyncUrl() {
    await sync.saveBaseUrl(syncUrl)
    setSyncUrl(syncUrl.trim())
    toast.success(syncUrl.trim() ? '已保存同步地址' : '已清空同步地址')
  }

  async function clearSyncUrl() {
    setSyncUrl('')
    await sync.saveBaseUrl('')
    toast.success('已清空同步地址')
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

      <section className="mt-6 rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-medium">每日同步</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          每个自然日最多成功备份一次到云电脑。留空则使用构建时的默认地址。断网时仍可在本机打卡。
        </p>
        <div className="mt-4 grid gap-2">
          <Label htmlFor="sync-base-url">同步地址</Label>
          <Input
            id="sync-base-url"
            value={syncUrl}
            disabled={!syncUrlReady}
            spellCheck={false}
            autoCapitalize="off"
            placeholder="https://xxxx.trycloudflare.com"
            onChange={(event) => setSyncUrl(event.target.value)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" onClick={() => void saveSyncUrl()} disabled={!syncUrlReady}>
            保存地址
          </Button>
          <Button type="button" variant="outline" onClick={() => void clearSyncUrl()} disabled={!syncUrlReady}>
            清空
          </Button>
          <Button type="button" variant="outline" onClick={() => void sync.manual()} disabled={!syncUrlReady}>
            立即同步
          </Button>
        </div>
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
