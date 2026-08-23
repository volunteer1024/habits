import { beforeAll, describe, expect, it } from 'vitest'

beforeAll(() => {
  Object.assign(Element.prototype, {
    setPointerCapture() {},
    releasePointerCapture() {},
    hasPointerCapture() {
      return false
    },
  })
})
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppContext } from '@/app/app-context'
import { AppShell } from '@/components/layout/app-shell'
import { MemoryStorageAdapter } from '@/data/adapter'
import { fixedClock } from '@/domain/clock'
import { TodayPage } from '@/pages/today-page'
import { createApp } from '@/services/create-app'

async function renderToday(date = '2026-08-21', seedDate = date) {
  const adapter = new MemoryStorageAdapter()
  if (seedDate !== date) {
    const seeded = createApp(adapter, fixedClock(seedDate))
    await seeded.bootstrap()
  }
  const app = createApp(adapter, fixedClock(date))
  await app.bootstrap()
  render(
    <AppContext.Provider value={app}>
      <TodayPage />
    </AppContext.Provider>,
  )
  return { app, user: userEvent.setup() }
}

describe('TodayPage check-in window', () => {
  it('defaults to today and can switch to yesterday to edit tasks and habits', async () => {
    const { app, user } = await renderToday('2026-08-21', '2026-08-20')

    expect(screen.getByRole('heading', { name: '今天' })).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByText('背单词')).toBeTruthy()
    })

    await user.click(screen.getByRole('button', { name: '选择日期' }))
    const dialog = screen.getByRole('dialog')
    expect((within(dialog).getByRole('button', { name: '21' }) as HTMLButtonElement).disabled).toBe(false)
    expect((within(dialog).getByRole('button', { name: '20' }) as HTMLButtonElement).disabled).toBe(false)
    expect((within(dialog).getByRole('button', { name: '19' }) as HTMLButtonElement).disabled).toBe(false)
    expect((within(dialog).getByRole('button', { name: '18' }) as HTMLButtonElement).disabled).toBe(true)
    expect((within(dialog).getByRole('button', { name: '22' }) as HTMLButtonElement).disabled).toBe(true)
    expect((within(dialog).getByRole('button', { name: '下个月' }) as HTMLButtonElement).disabled).toBe(true)

    await user.click(within(dialog).getByRole('button', { name: '20' }))
    expect(screen.getByRole('heading', { name: '昨天' })).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByText('背单词')).toBeTruthy()
    })

    await user.click(screen.getByText('背单词'))
    await waitFor(() => {
      expect(app.points.balance()).toBe(5)
    })
    expect(
      app.store.getSnapshot().pointTransactions.some(
        (item) => item.type === 'task_complete' && item.businessDate === '2026-08-20',
      ),
    ).toBe(true)

    await user.click(screen.getByRole('button', { name: '记录一次' }))
    await user.click(screen.getByText('喝奶茶'))
    await waitFor(() => {
      expect(app.habits.logsForDate('2026-08-20')).toHaveLength(1)
    })
    expect(app.points.balance()).toBe(-5)
  })
})

describe('AppShell navigation', () => {
  it('labels the check-in tab 打卡 and keeps /today', () => {
    render(
      <MemoryRouter initialEntries={['/today']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/today" element={<p>check-in</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    const links = screen.getAllByRole('link', { name: /打卡/ })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]?.getAttribute('href')).toBe('/today')
    expect(screen.queryByRole('link', { name: /今日/ })).toBeNull()
  })
})
