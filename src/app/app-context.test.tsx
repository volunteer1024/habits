import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { AppProvider } from '@/app/app-context'
import { MemoryStorageAdapter } from '@/data/adapter'
import { memorySyncSettings } from '@/data/sync-settings'
import { fixedClock } from '@/domain/clock'
import { createApp } from '@/services/create-app'
import type { SyncPoster } from '@/services/sync'

function setVisibility(value: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => value,
  })
}

describe('AppProvider daily sync', () => {
  afterEach(() => {
    cleanup()
  })

  it('syncs after open and again when the page becomes visible after a failure', async () => {
    let ok = false
    const calls: string[] = []
    const post: SyncPoster = {
      async post(url) {
        calls.push(url)
        return { ok }
      },
    }
    const settings = memorySyncSettings()
    const app = createApp(new MemoryStorageAdapter(), fixedClock('2026-10-02'), {
      syncSettings: settings,
      syncPoster: post,
      defaultSyncBaseUrl: 'https://cloud.example',
    })
    setVisibility('visible')
    render(
      <AppProvider runtime={app}>
        <p>已打开</p>
      </AppProvider>,
    )

    expect(await screen.findByText('已打开')).toBeTruthy()
    await waitFor(() => expect(calls).toEqual(['https://cloud.example/api/sync']))
    expect((await settings.load()).lastSuccessDay).toBe('')

    setVisibility('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(calls).toHaveLength(1)

    ok = true
    setVisibility('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await waitFor(() => expect(calls).toHaveLength(2))
    expect((await settings.load()).lastSuccessDay).toBe('2026-10-02')

    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    expect(calls).toHaveLength(2)
  })

  it('credits an enabled task when the page returns to the foreground', async () => {
    const app = createApp(new MemoryStorageAdapter(), fixedClock('2026-10-02'), {
      syncSettings: memorySyncSettings(),
      syncPoster: { async post() { return { ok: true } } },
      defaultSyncBaseUrl: '',
    })
    setVisibility('visible')
    render(
      <AppProvider runtime={app}>
        <p>已打开</p>
      </AppProvider>,
    )
    expect(await screen.findByText('已打开')).toBeTruthy()
    const medicine = app.store.getSnapshot().tasks.find((item) => item.name === '喝药')
    if (!medicine) throw new Error('missing task')
    await app.tasks.update(medicine.id, { autoDailyCredit: true })
    expect(app.points.balance()).toBe(0)

    setVisibility('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    expect(app.points.balance()).toBe(0)

    setVisibility('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await waitFor(() => expect(app.points.balance()).toBe(1))

    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    expect(app.points.balance()).toBe(1)
    expect(
      app.store.getSnapshot().pointTransactions.filter((item) => item.type === 'task_complete'),
    ).toHaveLength(1)
  })
})
