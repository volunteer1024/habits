import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { MemoryStorageAdapter } from '@/data/adapter'
import { memorySyncSettings } from '@/data/sync-settings'
import { createBackup, serializeBackup } from '@/domain/backup'
import { fixedClock } from '@/domain/clock'
import type { AppState } from '@/domain/types'
import { createApp } from './create-app'
import { createDailySync, presentSyncResult, type SyncPoster } from './sync'

vi.mock('sonner', () => {
  const toastFn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  })
  return { toast: toastFn }
})

const COLLECTIONS = [
  'tasks',
  'taskInstances',
  'habits',
  'habitLogs',
  'rewards',
  'redemptions',
  'pointTransactions',
  'settlements',
] as const

function recordingPoster(result: () => { ok: boolean } | Promise<{ ok: boolean }>) {
  const calls: Array<{ url: string; body: string }> = []
  const post: SyncPoster = {
    async post(url, body) {
      calls.push({ url, body })
      return result()
    },
  }
  return { calls, post }
}

async function setup(options: {
  defaultSyncBaseUrl?: string
  savedBaseUrl?: string
  post: SyncPoster
}) {
  const settings = memorySyncSettings()
  if (options.savedBaseUrl !== undefined) {
    const current = await settings.load()
    await settings.save({ ...current, baseUrl: options.savedBaseUrl })
  }
  const app = createApp(new MemoryStorageAdapter(), fixedClock('2026-10-02'), {
    syncSettings: settings,
    syncPoster: options.post,
    defaultSyncBaseUrl: options.defaultSyncBaseUrl ?? '',
  })
  await app.bootstrap()
  return { app, settings }
}

describe('daily sync', () => {
  beforeEach(() => {
    vi.mocked(toast).mockClear()
    vi.mocked(toast.success).mockClear()
    vi.mocked(toast.error).mockClear()
    localStorage.clear()
  })

  it('posts one backup pack per local day and keeps the same client id', async () => {
    const { calls, post } = recordingPoster(() => ({ ok: true }))
    const { app, settings } = await setup({
      defaultSyncBaseUrl: 'https://cloud.example/',
      post,
    })

    expect(await app.sync.auto()).toBe('ok')
    expect(await app.sync.auto()).toBe('skipped-already')
    expect(await app.sync.manual()).toBe('skipped-already')
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe('https://cloud.example/api/sync')
    expect(calls[0]?.body.charCodeAt(0)).not.toBe(0xfeff)

    const body = JSON.parse(calls[0]?.body ?? '{}') as {
      clientId: string
      schemaVersion: number
      exportedAt: string
      state: Record<string, unknown>
    }
    const saved = await settings.load()
    expect(body.clientId).toBe(saved.clientId)
    expect(saved.clientId).toMatch(/^[A-Za-z0-9_-]{8,80}$/)
    expect(body.schemaVersion).toBe(1)
    expect(body.exportedAt).toBe(app.clock.nowIso())
    for (const key of COLLECTIONS) {
      expect(Array.isArray(body.state[key])).toBe(true)
    }
    expect(saved.lastSuccessDay).toBe('2026-10-02')
    expect(saved.lastSyncAt).toBe(app.clock.nowIso())
    expect(toast.success).toHaveBeenCalledWith('已备份到云电脑')
    expect(toast).toHaveBeenCalledWith('今日已同步')
  })

  it('keeps local data when the request fails, then records today after a later success', async () => {
    let ok = false
    const { calls, post } = recordingPoster(() => {
      if (!ok) throw new Error('offline')
      return { ok: true }
    })
    const { app, settings } = await setup({
      defaultSyncBaseUrl: 'https://cloud.example',
      post,
    })
    const before = structuredClone(app.store.getSnapshot())

    expect(await app.sync.auto()).toBe('failed')
    expect(app.store.getSnapshot()).toEqual(before)
    expect((await settings.load()).lastSuccessDay).toBe('')
    expect(toast.error).not.toHaveBeenCalled()

    const vocab = app.store.getSnapshot().tasks.find((item) => item.name === '背单词')
    if (!vocab) throw new Error('missing task')
    await app.tasks.complete(vocab.id)
    expect(app.points.balance()).toBe(5)
    expect((await settings.load()).lastSuccessDay).toBe('')

    expect(await app.sync.manual()).toBe('failed')
    expect(toast.error).toHaveBeenCalledWith('同步失败，稍后再试')
    ok = true
    expect(await app.sync.manual()).toBe('ok')
    expect(calls).toHaveLength(3)
    const retried = JSON.parse(calls[2]?.body ?? '{}') as { state: { taskInstances: unknown[] } }
    expect(retried.state.taskInstances.length).toBeGreaterThan(0)
    expect((await settings.load()).lastSuccessDay).toBe('2026-10-02')
    expect(toast.error).toHaveBeenCalledWith('同步失败，稍后再试')
  })

  it('does not record success when the server rejects the backup', async () => {
    const { calls, post } = recordingPoster(() => ({ ok: false }))
    const { app, settings } = await setup({
      defaultSyncBaseUrl: 'https://cloud.example',
      post,
    })
    expect(await app.sync.auto()).toBe('failed')
    expect(calls).toHaveLength(1)
    expect((await settings.load()).lastSuccessDay).toBe('')
    expect(await app.sync.auto()).toBe('failed')
    expect(calls).toHaveLength(2)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('skips without a url, prefers a saved url, and leaves sync fields out of the export file', async () => {
    const quiet = recordingPoster(() => ({ ok: true }))
    const none = await setup({ post: quiet.post })
    expect(await none.app.sync.auto()).toBe('skipped-no-url')
    expect(quiet.calls).toHaveLength(0)
    expect(none.app.store.getSnapshot().tasks.length).toBeGreaterThan(0)

    const saved = recordingPoster(() => ({ ok: true }))
    const custom = await setup({
      defaultSyncBaseUrl: 'https://default.example',
      savedBaseUrl: 'https://user.example///',
      post: saved.post,
    })
    expect(await custom.app.sync.manual()).toBe('ok')
    expect(saved.calls[0]?.url).toBe('https://user.example/api/sync')

    const file = serializeBackup(createBackup(custom.app.store.getSnapshot(), custom.app.clock.nowIso()))
    const parsed = JSON.parse(file.slice(1)) as Record<string, unknown>
    expect(Object.keys(parsed).sort()).toEqual(['exportedAt', 'schemaVersion', 'state'])
    expect(file).not.toContain((await custom.settings.load()).clientId)
    expect(file).not.toContain('user.example')
    expect(localStorage.getItem('checkin:v1')).toBeNull()
    expect(localStorage.getItem('checkin:sync:v1')).toBeNull()
  })

  it('treats an invalid snapshot as a failed attempt and does not post', async () => {
    const settings = memorySyncSettings()
    const { calls, post } = recordingPoster(() => ({ ok: true }))
    const sync = createDailySync({
      getState: () => ({ tasks: [] }) as unknown as AppState,
      clock: fixedClock('2026-10-02'),
      settings,
      post,
      defaultBaseUrl: 'https://cloud.example',
      notify: () => {},
    })
    expect(await sync.auto()).toBe('failed')
    expect(calls).toHaveLength(0)
    expect((await settings.load()).lastSuccessDay).toBe('')
  })

  it('shares one in-flight request', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let calls = 0
    const sync = createDailySync({
      getState: () => ({
        tasks: [],
        taskInstances: [],
        habits: [],
        habitLogs: [],
        rewards: [],
        redemptions: [],
        pointTransactions: [],
        settlements: [],
      }),
      clock: fixedClock('2026-10-02'),
      settings: memorySyncSettings(),
      post: {
        async post() {
          calls += 1
          await gate
          return { ok: true }
        },
      },
      defaultBaseUrl: 'https://cloud.example',
      notify: () => {},
    })
    const first = sync.auto()
    const second = sync.manual()
    release()
    expect(await first).toBe('ok')
    expect(await second).toBe('ok')
    expect(calls).toBe(1)
  })

  it('stays quiet on automatic skips and failures', () => {
    presentSyncResult('ok', 'auto')
    presentSyncResult('failed', 'auto')
    presentSyncResult('skipped-already', 'auto')
    presentSyncResult('skipped-no-url', 'auto')
    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith('已备份到云电脑')
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast).not.toHaveBeenCalled()

    presentSyncResult('failed', 'manual')
    presentSyncResult('skipped-no-url', 'manual')
    expect(toast.error).toHaveBeenCalledWith('同步失败，稍后再试')
    expect(toast).toHaveBeenCalledWith('请先填写同步地址')
  })
})
