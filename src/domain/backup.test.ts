import { describe, expect, it } from 'vitest'
import { MemoryStorageAdapter } from '@/data/adapter'
import { AppError } from '@/domain/errors'
import { emptyState, type AppState } from '@/domain/types'
import { fixedClock } from '@/domain/clock'
import { createApp } from '@/services/create-app'
import { restoreBackup } from '@/services/backup'
import { createBackup, parseBackup, serializeBackup } from './backup'

const EXPORTED_AT = '2026-10-01T00:00:00.000Z'
const SHAPE_MESSAGE = '无法读取备份，请选择本应用导出的 JSON 文件。'
const VERSION_MESSAGE = '备份版本不受支持，无法恢复。'

function filledState(): AppState {
  return {
    tasks: [
      {
        id: 'task-1',
        name: '跑步',
        points: 3,
        monthlyPerfectBonus: 8,
        schedule: {
          frequency: 'weekly',
          interval: 1,
          startDate: '2026-09-01',
          weekdays: [1, 3],
          endType: 'count',
          count: 4,
        },
        recordOffsetDays: 0,
        autoDailyCredit: false,
        status: 'active',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-02T00:00:00.000Z',
      },
    ],
    taskInstances: [
      {
        id: 'inst-1',
        taskId: 'task-1',
        businessDate: '2026-09-01',
        status: 'completed',
        completedAt: '2026-09-01T12:00:00.000Z',
        lockedPoints: 3,
        taskNameSnapshot: '跑步',
      },
    ],
    habits: [
      {
        id: 'habit-1',
        name: '熬夜',
        penalty: 4,
        status: 'archived',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-03T00:00:00.000Z',
      },
    ],
    habitLogs: [
      {
        id: 'log-1',
        habitId: 'habit-1',
        businessDate: '2026-09-02',
        habitNameSnapshot: '熬夜',
        penaltySnapshot: 4,
        createdAt: '2026-09-02T00:00:00.000Z',
      },
    ],
    rewards: [
      {
        id: 'reward-1',
        name: '电影',
        cost: 20,
        maxRedemptions: null,
        status: 'active',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
      {
        id: 'reward-2',
        name: '书',
        cost: 5,
        maxRedemptions: 2,
        status: 'active',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ],
    redemptions: [
      {
        id: 'redeem-1',
        rewardId: 'reward-1',
        rewardNameSnapshot: '电影',
        costSnapshot: 20,
        redeemedAt: '2026-09-04T00:00:00.000Z',
      },
    ],
    pointTransactions: [
      {
        id: 'tx-1',
        type: 'task_complete',
        delta: 3,
        sourceId: 'inst-1',
        description: '跑步',
        businessDate: '2026-09-01',
        createdAt: '2026-09-01T12:00:00.000Z',
      },
    ],
    settlements: [
      {
        yearMonth: '2026-08',
        settledAt: '2026-09-01T00:00:00.000Z',
        awardedTaskIds: ['task-1'],
      },
    ],
  }
}

function backupOf(state: AppState): string {
  return serializeBackup(createBackup(state, EXPORTED_AT))
}

function parseDocument(raw: string) {
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw
  return JSON.parse(text) as unknown
}

function expectRejected(raw: string, message: string) {
  try {
    parseBackup(raw)
    expect.fail('expected INVALID_BACKUP')
  } catch (error) {
    expect(error).toBeInstanceOf(AppError)
    const appError = error as AppError
    expect(appError.code).toBe('INVALID_BACKUP')
    expect(appError.message).toBe(message)
  }
}

describe('backup document', () => {
  it('round-trips a full state and keeps schema version and timestamp', () => {
    const state = filledState()
    const raw = backupOf(state)
    const document = parseDocument(raw) as { schemaVersion: number; exportedAt: string; state: AppState }

    expect(raw.split('\n')[1]?.startsWith('  ')).toBe(true)
    expect(document.schemaVersion).toBe(1)
    expect(document.exportedAt).toBe(EXPORTED_AT)
    expect(parseBackup(raw)).toEqual(state)
  })

  it('round-trips a BOM-prefixed backup and keeps Chinese as Unicode', () => {
    const state = filledState()
    const transaction = state.pointTransactions[0]
    if (!transaction) throw new Error('missing transaction')
    transaction.description = '完成背单词'
    const raw = backupOf(state)

    expect(raw.charCodeAt(0)).toBe(0xfeff)
    expect(raw.slice(1).startsWith('{')).toBe(true)
    expect(raw).toContain('完成背单词')
    expect(raw).not.toContain('\\u5b8c\\u6210')
    expect(parseBackup(raw)).toEqual(state)
    expect(parseBackup(raw.slice(1))).toEqual(state)
  })

  it('keeps empty collections as empty lists', () => {
    const raw = backupOf(emptyState())
    const document = parseDocument(raw) as { state: AppState }

    expect(document.state).toEqual(emptyState())
    expect(parseBackup(raw)).toEqual(emptyState())
  })

  it('replaces a bootstrapped store and keeps an empty restore empty', async () => {
    const adapter = new MemoryStorageAdapter()
    const app = createApp(adapter, fixedClock('2026-08-21'))
    await app.bootstrap()
    expect(app.store.getSnapshot().tasks.length).toBeGreaterThan(0)

    const next = filledState()
    await restoreBackup(app.store, next)
    expect(app.store.getSnapshot()).toEqual(next)
    expect(await adapter.load()).toEqual(next)

    await restoreBackup(app.store, emptyState())
    expect(await adapter.load()).toEqual(emptyState())

    const reloaded = createApp(adapter, fixedClock('2026-08-21'))
    await reloaded.bootstrap()
    expect(reloaded.store.getSnapshot()).toEqual(emptyState())
  })

  it('rejects bad files without changing stored data', async () => {
    const adapter = new MemoryStorageAdapter()
    const app = createApp(adapter, fixedClock('2026-08-21'))
    await app.bootstrap()
    const before = await adapter.load()

    expectRejected('{', SHAPE_MESSAGE)
    expectRejected(JSON.stringify(emptyState()), SHAPE_MESSAGE)

    const wrongVersion = parseDocument(backupOf(filledState())) as { schemaVersion: number }
    wrongVersion.schemaVersion = 2
    expectRejected(JSON.stringify(wrongVersion), VERSION_MESSAGE)

    const missingCollection = parseDocument(backupOf(filledState())) as { state: Partial<AppState> }
    delete missingCollection.state.settlements
    expectRejected(JSON.stringify(missingCollection), SHAPE_MESSAGE)

    const notArray = parseDocument(backupOf(filledState())) as { state: { tasks: unknown } }
    notArray.state.tasks = {}
    expectRejected(JSON.stringify(notArray), SHAPE_MESSAGE)

    const missingField = parseDocument(backupOf(filledState())) as {
      state: { tasks: Array<Partial<AppState['tasks'][number]>> }
    }
    delete missingField.state.tasks[0]?.name
    expectRejected(JSON.stringify(missingField), SHAPE_MESSAGE)

    expect(await adapter.load()).toEqual(before)
    expect(app.store.getSnapshot()).toEqual(before)
  })

  it('round-trips automatic daily credit and still imports an older task without it', () => {
    const state = filledState()
    const task = state.tasks[0]
    if (!task) throw new Error('missing task')
    task.autoDailyCredit = true
    const raw = backupOf(state)
    const document = parseDocument(raw) as {
      clientId?: string
      state: { tasks: Array<{ autoDailyCredit?: unknown }> }
    }

    expect(document.clientId).toBeUndefined()
    expect(raw).not.toContain('clientId')
    expect(document.state.tasks[0]?.autoDailyCredit).toBe(true)
    expect(parseBackup(raw)).toEqual(state)

    delete document.state.tasks[0]?.autoDailyCredit
    const older = JSON.stringify(document)
    const imported = parseBackup(older)
    expect(imported.tasks[0]?.autoDailyCredit).toBeUndefined()

    document.state.tasks[0]!.autoDailyCredit = 'yes'
    expectRejected(JSON.stringify(document), SHAPE_MESSAGE)
  })
})
