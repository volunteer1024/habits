import { afterEach, beforeAll, describe, expect, it } from 'vitest'

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HabitForm } from '@/components/habits/habit-form'
import { TaskForm } from '@/components/tasks/task-form'
import type { CreateTaskInput } from '@/services/domain-services'
import type { Task } from '@/domain/types'

const task: Task = {
  id: 'task-1',
  name: '喝药',
  points: 1,
  monthlyPerfectBonus: 0,
  schedule: {
    frequency: 'daily',
    interval: 1,
    startDate: '2026-08-21',
    endType: 'never',
  },
  recordOffsetDays: 0,
  autoDailyCredit: true,
  status: 'active',
  createdAt: '2026-08-21T00:00:00.000Z',
  updatedAt: '2026-08-21T00:00:00.000Z',
}

describe('TaskForm automatic daily credit', () => {
  afterEach(() => {
    cleanup()
  })

  it('saves 每天自动激励 and keeps an existing choice when editing', async () => {
    const created: CreateTaskInput[] = []
    const user = userEvent.setup()
    render(
      <TaskForm
        todayDate="2026-08-21"
        onSubmit={async (input) => {
          created.push(input)
        }}
      />,
    )

    expect(screen.getByText('打开应用时，若今天还没打卡，自动记一次完成')).toBeTruthy()
    const createdToggle = screen.getByRole('checkbox', { name: '每天自动激励' })
    expect(createdToggle.getAttribute('aria-checked')).toBe('false')
    await user.type(screen.getByLabelText('任务名称'), '喝药')
    await user.click(createdToggle)
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(created[0]?.autoDailyCredit).toBe(true)
    expect(created[0]?.name).toBe('喝药')

    cleanup()
    const updated: CreateTaskInput[] = []
    render(
      <TaskForm
        task={task}
        todayDate="2026-08-21"
        onSubmit={async (input) => {
          updated.push(input)
        }}
      />,
    )
    expect(screen.getByRole('checkbox', { name: '每天自动激励' }).getAttribute('aria-checked')).toBe('true')
    await user.click(screen.getByRole('checkbox', { name: '每天自动激励' }))
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(updated[0]).toMatchObject({ name: '喝药', points: 1, autoDailyCredit: false })
  })

  it('does not offer 每天自动激励 on a bad habit', () => {
    render(
      <HabitForm
        onSubmit={async () => {}}
      />,
    )
    expect(screen.queryByText('每天自动激励')).toBeNull()
  })
})
