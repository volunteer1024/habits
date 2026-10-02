import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppContext } from '@/app/app-context'
import { MemoryStorageAdapter } from '@/data/adapter'
import { SYNC_STORAGE_KEY, memorySyncSettings } from '@/data/sync-settings'
import { STORAGE_KEY } from '@/domain/types'
import { fixedClock } from '@/domain/clock'
import { MePage } from '@/pages/me-page'
import { createApp } from '@/services/create-app'
import type { SyncPoster } from '@/services/sync'

async function renderMe(post: SyncPoster) {
  const settings = memorySyncSettings()
  const app = createApp(new MemoryStorageAdapter(), fixedClock('2026-10-02'), {
    syncSettings: settings,
    syncPoster: post,
    defaultSyncBaseUrl: 'https://default.example',
  })
  await app.bootstrap()
  render(
    <AppContext.Provider value={app}>
      <MemoryRouter>
        <MePage />
      </MemoryRouter>
    </AppContext.Provider>,
  )
  return { settings, user: userEvent.setup() }
}

describe('MePage daily sync', () => {
  afterEach(() => {
    cleanup()
  })

  it('saves an address and syncs once, without writing local storage from the page', async () => {
    const calls: string[] = []
    const post: SyncPoster = {
      async post(url) {
        calls.push(url)
        return { ok: true }
      },
    }
    const { settings, user } = await renderMe(post)
    const input = await screen.findByLabelText('同步地址')
    await waitFor(() => expect((input as HTMLInputElement).disabled).toBe(false))

    await user.type(input, 'https://mine.example/')
    await user.click(screen.getByRole('button', { name: '保存地址' }))
    expect((await settings.load()).baseUrl).toBe('https://mine.example/')

    await user.click(screen.getByRole('button', { name: '立即同步' }))
    await waitFor(() => expect(calls).toEqual(['https://mine.example/api/sync']))
    await user.click(screen.getByRole('button', { name: '立即同步' }))
    expect(calls).toEqual(['https://mine.example/api/sync'])
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(SYNC_STORAGE_KEY)).toBeNull()
  })

  it('clears a saved address and falls back to the default', async () => {
    const calls: string[] = []
    const { settings, user } = await renderMe({
      async post(url) {
        calls.push(url)
        return { ok: true }
      },
    })
    const input = await screen.findByLabelText('同步地址')
    await waitFor(() => expect((input as HTMLInputElement).disabled).toBe(false))
    await user.type(input, 'https://mine.example')
    await user.click(screen.getByRole('button', { name: '保存地址' }))
    await user.click(screen.getByRole('button', { name: '清空' }))
    expect((await settings.load()).baseUrl).toBe('')
    await user.click(screen.getByRole('button', { name: '立即同步' }))
    await waitFor(() => expect(calls).toEqual(['https://default.example/api/sync']))
  })
})
