import { toast } from 'sonner'
import type { SyncRecord, SyncSettingsStore } from '@/data/sync-settings'
import { BACKUP_SCHEMA_VERSION, createBackup, parseBackup, serializeBackup } from '@/domain/backup'
import type { Clock } from '@/domain/clock'
import type { AppState } from '@/domain/types'

export type SyncMode = 'auto' | 'manual'
export type SyncStatus = 'ok' | 'skipped-no-url' | 'skipped-already' | 'failed'

export interface SyncBody {
  clientId: string
  schemaVersion: typeof BACKUP_SCHEMA_VERSION
  exportedAt: string
  state: AppState
}

export interface SyncPoster {
  post(url: string, body: string): Promise<{ ok: boolean }>
}

export interface DailySync {
  auto(): Promise<SyncStatus>
  manual(): Promise<SyncStatus>
  savedBaseUrl(): Promise<string>
  saveBaseUrl(url: string): Promise<void>
}

export interface SyncDeps {
  getState: () => AppState
  clock: Clock
  settings: SyncSettingsStore
  post: SyncPoster
  defaultBaseUrl: string
  notify?: (status: SyncStatus, mode: SyncMode) => void
}

export function resolveSyncBase(saved: string, fallback: string): string {
  const chosen = saved.trim() || fallback.trim()
  return chosen.replace(/\/+$/, '')
}

export function buildSyncBody(state: AppState, clientId: string, exportedAt: string): SyncBody {
  const pack = createBackup(state, exportedAt)
  parseBackup(serializeBackup(pack))
  return {
    clientId,
    schemaVersion: pack.schemaVersion,
    exportedAt: pack.exportedAt,
    state: pack.state,
  }
}

export function presentSyncResult(status: SyncStatus, mode: SyncMode): void {
  if (status === 'ok') {
    toast.success('已备份到云电脑')
    return
  }
  if (mode === 'auto') return
  if (status === 'skipped-already') toast('今日已同步')
  if (status === 'failed') toast.error('同步失败，稍后再试')
  if (status === 'skipped-no-url') toast('请先填写同步地址')
}

export function fetchSyncPoster(fetchImpl: typeof fetch = fetch): SyncPoster {
  return {
    async post(url, body) {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(15_000),
      })
      return { ok: response.ok }
    },
  }
}

export function createDailySync(deps: SyncDeps): DailySync {
  let inFlight: Promise<SyncStatus> | null = null
  const notify = deps.notify ?? presentSyncResult

  async function run(mode: SyncMode): Promise<SyncStatus> {
    if (inFlight) return inFlight
    const request = attempt()
      .catch(() => 'failed' as const)
      .then((status) => {
        notify(status, mode)
        return status
      })
      .finally(() => {
        if (inFlight === request) inFlight = null
      })
    inFlight = request
    return request
  }

  async function attempt(): Promise<SyncStatus> {
    const record = await deps.settings.load()
    const base = resolveSyncBase(record.baseUrl, deps.defaultBaseUrl)
    if (!base) return 'skipped-no-url'
    const today = deps.clock.today()
    if (record.lastSuccessDay === today) return 'skipped-already'
    let body: string
    try {
      body = JSON.stringify(buildSyncBody(deps.getState(), record.clientId, deps.clock.nowIso()))
    } catch {
      return 'failed'
    }
    try {
      const response = await deps.post.post(`${base}/api/sync`, body)
      if (!response.ok) return 'failed'
    } catch {
      return 'failed'
    }
    const latest = await deps.settings.load()
    await deps.settings.save(markSuccess(latest, today, deps.clock.nowIso()))
    return 'ok'
  }

  return {
    auto: () => run('auto'),
    manual: () => run('manual'),
    async savedBaseUrl() {
      return (await deps.settings.load()).baseUrl
    },
    async saveBaseUrl(url: string) {
      const current = await deps.settings.load()
      await deps.settings.save({ ...current, baseUrl: url.trim() })
    },
  }
}

function markSuccess(record: SyncRecord, day: string, syncedAt: string): SyncRecord {
  return {
    ...record,
    lastSuccessDay: day,
    lastSyncAt: syncedAt,
  }
}
