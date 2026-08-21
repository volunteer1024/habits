import { describe, expect, it } from 'vitest'
import { MemoryStorageAdapter } from '../data/adapter'
import { createApp } from './create-app'
import { fixedClock } from '../domain/clock'
import { AppError } from '../domain/errors'
import { addDays, eachDate, monthRange } from '../domain/dates'

async function setup(date = '2026-08-21') {
  const adapter = new MemoryStorageAdapter()
  const app = createApp(adapter, fixedClock(date))
  await app.bootstrap()
  return { adapter, app }
}

function taskByName(app: ReturnType<typeof createApp>, name: string) {
  const task = app.store.getSnapshot().tasks.find((item) => item.name === name)
  if (!task) throw new Error(`missing task ${name}`)
  return task
}

function rewardByName(app: ReturnType<typeof createApp>, name: string) {
  const reward = app.store.getSnapshot().rewards.find((item) => item.name === name)
  if (!reward) throw new Error(`missing reward ${name}`)
  return reward
}

function habitByName(app: ReturnType<typeof createApp>, name: string) {
  const habit = app.store.getSnapshot().habits.find((item) => item.name === name)
  if (!habit) throw new Error(`missing habit ${name}`)
  return habit
}

describe('app services', () => {
  it('seeds default tasks, habits and rewards with zero points', async () => {
    const { app } = await setup()
    const today = await app.tasks.getTodayItems()
    expect(today.map((item) => item.displayName)).toEqual([
      '背单词',
      '早睡（昨晚）',
      '喝药',
    ])
    expect(today.map((item) => item.points)).toEqual([5, 10, 1])
    expect(app.points.balance()).toBe(0)
    expect(app.store.getSnapshot().habits.map((item) => item.name)).toEqual([
      '手冲',
      '喝奶茶',
      '喝碳酸饮料',
      '喝酒',
    ])
    expect(app.store.getSnapshot().rewards.map((item) => item.name)).toEqual([
      '按摩',
      '任意 200 元电子产品',
    ])
  })

  it('completes a task, awards locked points, and survives reload', async () => {
    const { adapter, app } = await setup()
    const vocab = taskByName(app, '背单词')
    await app.tasks.complete(vocab.id)
    expect(app.points.balance()).toBe(5)
    const today = await app.tasks.getTodayItems()
    expect(today[0]?.instance.status).toBe('completed')
    expect(today[0]?.instance.lockedPoints).toBe(5)

    const reloaded = createApp(adapter, fixedClock('2026-08-21'))
    await reloaded.bootstrap()
    expect(reloaded.points.balance()).toBe(5)
    const reloadedToday = await reloaded.tasks.getTodayItems()
    expect(reloadedToday[0]?.instance.status).toBe('completed')
  })

  it('records a bad habit with snapshot penalty and allows repeats', async () => {
    const { adapter, app } = await setup()
    await app.tasks.complete(taskByName(app, '背单词').id)
    await app.habits.record(habitByName(app, '喝奶茶').id)
    expect(app.points.balance()).toBe(-5)
    await app.habits.record(habitByName(app, '喝奶茶').id)
    expect(app.points.balance()).toBe(-15)

    const reloaded = createApp(adapter, fixedClock('2026-08-21'))
    await reloaded.bootstrap()
    expect(reloaded.points.balance()).toBe(-15)
    expect(reloaded.habits.logsForDate('2026-08-21')).toHaveLength(2)
  })

  it('keeps historical points after the task value changes', async () => {
    const { adapter, app } = await setup()
    const vocab = taskByName(app, '背单词')
    await app.tasks.complete(vocab.id)
    await app.tasks.update(vocab.id, { points: 10 })
    expect(app.points.balance()).toBe(5)

    const nextDay = createApp(adapter, fixedClock('2026-08-22'))
    await nextDay.bootstrap()
    await nextDay.tasks.complete(vocab.id)
    expect(nextDay.points.balance()).toBe(15)
  })

  it('uses the latest points when today is still pending', async () => {
    const { app } = await setup()
    const vocab = taskByName(app, '背单词')
    await app.tasks.update(vocab.id, { points: 10 })
    await app.tasks.complete(vocab.id)
    expect(app.points.balance()).toBe(10)
  })

  it('undoes today without clearing lockedPoints', async () => {
    const { app } = await setup()
    const vocab = taskByName(app, '背单词')
    await app.tasks.complete(vocab.id)
    await app.tasks.update(vocab.id, { points: 10 })
    await app.tasks.undo(vocab.id)
    expect(app.points.balance()).toBe(0)
    await app.tasks.complete(vocab.id)
    expect(app.points.balance()).toBe(5)
    const item = (await app.tasks.getTodayItems())[0]
    expect(item?.instance.lockedPoints).toBe(5)
  })

  it('redeems a reward when the balance is enough', async () => {
    const { app } = await setup()
    await app.store.update((state) => {
      state.pointTransactions.push({
        id: 'seed-points',
        type: 'task_complete',
        delta: 250,
        sourceId: 'seed',
        description: '测试入账',
        businessDate: '2026-08-21',
        createdAt: '2026-08-21T04:00:00.000Z',
      })
    })
    const gadget = rewardByName(app, '任意 200 元电子产品')
    await app.rewards.redeem(gadget.id)
    expect(app.points.balance()).toBe(50)
    expect(app.store.getSnapshot().redemptions[0]?.costSnapshot).toBe(200)

    await app.rewards.update(gadget.id, { cost: 300 })
    expect(app.store.getSnapshot().redemptions[0]?.costSnapshot).toBe(200)
    await expect(app.rewards.redeem(gadget.id)).rejects.toBeInstanceOf(AppError)
  })

  it('blocks redeem when points are insufficient or the cap is reached', async () => {
    const { app } = await setup()
    const massage = rewardByName(app, '按摩')
    await expect(app.rewards.redeem(massage.id)).rejects.toMatchObject({
      code: 'INSUFFICIENT_POINTS',
    })

    await app.store.update((state) => {
      state.pointTransactions.push({
        id: 'seed-points',
        type: 'task_complete',
        delta: 2000,
        sourceId: 'seed',
        description: '测试入账',
        businessDate: '2026-08-21',
        createdAt: '2026-08-21T04:00:00.000Z',
      })
    })
    await app.rewards.update(massage.id, { maxRedemptions: 1 })
    await app.rewards.redeem(massage.id)
    await expect(app.rewards.redeem(massage.id)).rejects.toMatchObject({
      code: 'REDEMPTION_LIMIT',
    })
  })

  it('marks only completed scheduled days on the calendar', async () => {
    const { adapter, app } = await setup('2026-08-01')
    const vocab = taskByName(app, '背单词')
    await app.tasks.complete(vocab.id)

    const day2 = createApp(adapter, fixedClock('2026-08-02'))
    await day2.bootstrap()
    await day2.tasks.complete(vocab.id)

    const day3 = createApp(adapter, fixedClock('2026-08-03'))
    await day3.bootstrap()
    const days = day3.stats.calendarDays('2026-08', vocab.id)
    const marked = days.filter((day) => day.inMonth && day.marked).map((day) => day.date)
    expect(marked).toEqual(['2026-08-01', '2026-08-02'])
    expect(days.find((day) => day.date === '2026-08-03')?.marked).toBe(false)
  })

  it('awards a monthly perfect bonus once via lazy settlement', async () => {
    const adapter = new MemoryStorageAdapter()
    const september = createApp(adapter, fixedClock('2026-09-01'))
    await september.bootstrap()
    const vocab = taskByName(september, '背单词')
    await september.tasks.update(vocab.id, { monthlyPerfectBonus: 100 })
    const { start, end } = monthRange('2026-09')
    for (const date of eachDate(start, end)) {
      const dayApp = createApp(adapter, fixedClock(date))
      await dayApp.bootstrap()
      await dayApp.tasks.complete(vocab.id)
    }

    const october = createApp(adapter, fixedClock('2026-10-05'))
    await october.bootstrap()
    const bonus = october.store
      .getSnapshot()
      .pointTransactions.filter((item) => item.type === 'monthly_bonus')
    expect(bonus).toHaveLength(1)
    expect(bonus[0]?.delta).toBe(100)
    expect(october.points.balance()).toBe(5 * 30 + 100)

    await october.bootstrap()
    expect(
      october.store.getSnapshot().pointTransactions.filter((item) => item.type === 'monthly_bonus'),
    ).toHaveLength(1)
  })

  it('does not award a bonus when the task started mid-month', async () => {
    const { adapter } = await setup('2026-08-15')
    const september = createApp(adapter, fixedClock('2026-09-01'))
    await september.bootstrap()
    expect(september.store.getSnapshot().settlements.map((item) => item.yearMonth)).toContain(
      '2026-08',
    )
    expect(
      september.store.getSnapshot().pointTransactions.some((item) => item.type === 'monthly_bonus'),
    ).toBe(false)
  })

  it('computes weekly completion counts', async () => {
    const { app } = await setup('2026-08-21')
    const vocab = taskByName(app, '背单词')
    await app.tasks.complete(vocab.id)
    const stats = app.stats.weekStats()
    expect(stats.tasks.find((item) => item.name === '背单词')).toMatchObject({
      scheduled: 3,
      completed: 1,
    })
    expect(stats.scheduled).toBe(9)
    expect(stats.completed).toBe(1)
  })

  it('rejects creating a task that starts in the past', async () => {
    const { app } = await setup('2026-08-21')
    await expect(
      app.tasks.create({
        name: '健身',
        points: 8,
        startDate: '2026-08-20',
        frequency: 'weekly',
        weekdays: [1, 3, 5],
        endType: 'never',
      }),
    ).rejects.toMatchObject({ code: 'START_DATE_IN_PAST' })
  })

  it('does not reseed when data already exists', async () => {
    const { adapter, app } = await setup()
    await app.tasks.archive(taskByName(app, '喝药').id)
    const reloaded = createApp(adapter, fixedClock('2026-08-21'))
    await reloaded.bootstrap()
    expect(reloaded.store.getSnapshot().tasks.filter((item) => item.status === 'active')).toHaveLength(
      2,
    )
  })

  it('does not rewrite today instances on every getTodayItems call', async () => {
    const { app } = await setup()
    const first = await app.tasks.getTodayItems()
    expect(first.map((item) => item.displayName)).toEqual(['背单词', '早睡（昨晚）', '喝药'])

    let notifications = 0
    const unsubscribe = app.store.subscribe(() => {
      notifications += 1
    })
    const second = await app.tasks.getTodayItems()
    const third = await app.tasks.getTodayItems()
    unsubscribe()

    expect(notifications).toBe(0)
    expect(second.map((item) => item.instance.id)).toEqual(first.map((item) => item.instance.id))
    expect(third).toHaveLength(3)
  })
})

describe('date helpers used by stats', () => {
  it('can walk a week from a Friday', () => {
    expect(addDays('2026-08-21', 1)).toBe('2026-08-22')
  })
})
