import { AppError } from '@/domain/errors'
import type {
  AppState,
  EndType,
  Frequency,
  InstanceStatus,
  PointTransactionType,
  TaskStatus,
} from '@/domain/types'

export const BACKUP_SCHEMA_VERSION = 1

const SHAPE_MESSAGE = '无法读取备份，请选择本应用导出的 JSON 文件。'
const VERSION_MESSAGE = '备份版本不受支持，无法恢复。'

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

const POINT_TYPES: readonly PointTransactionType[] = [
  'task_complete',
  'task_undo',
  'bad_habit',
  'bad_habit_undo',
  'reward_redeem',
  'monthly_bonus',
  'monthly_bonus_undo',
]

const TASK_STATUSES: readonly TaskStatus[] = ['active', 'archived']
const INSTANCE_STATUSES: readonly InstanceStatus[] = ['pending', 'completed']
const FREQUENCIES: readonly Frequency[] = ['daily', 'weekly']
const END_TYPES: readonly EndType[] = ['never', 'count']

export interface BackupFile {
  schemaVersion: typeof BACKUP_SCHEMA_VERSION
  exportedAt: string
  state: AppState
}

export function backupFilename(date: string): string {
  return `habits-backup-${date}.json`
}

export function createBackup(state: AppState, exportedAt: string): BackupFile {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt,
    state,
  }
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2)
}

export function parseBackup(raw: string): AppState {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new AppError('INVALID_BACKUP', SHAPE_MESSAGE)
  }
  if (!isRecord(parsed)) failShape()
  if (!Object.prototype.hasOwnProperty.call(parsed, 'schemaVersion')) failShape()
  if (parsed.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new AppError('INVALID_BACKUP', VERSION_MESSAGE)
  }
  if (typeof parsed.exportedAt !== 'string' || parsed.exportedAt.length === 0) failShape()
  if (!isRecord(parsed.state)) failShape()
  return parseState(parsed.state)
}

function parseState(state: Record<string, unknown>): AppState {
  const tasks = collection(state, 'tasks')
  const taskInstances = collection(state, 'taskInstances')
  const habits = collection(state, 'habits')
  const habitLogs = collection(state, 'habitLogs')
  const rewards = collection(state, 'rewards')
  const redemptions = collection(state, 'redemptions')
  const pointTransactions = collection(state, 'pointTransactions')
  const settlements = collection(state, 'settlements')

  for (const task of tasks) requireTask(task)
  for (const instance of taskInstances) requireTaskInstance(instance)
  for (const habit of habits) requireHabit(habit)
  for (const log of habitLogs) requireHabitLog(log)
  for (const reward of rewards) requireReward(reward)
  for (const redemption of redemptions) requireRedemption(redemption)
  for (const transaction of pointTransactions) requireTransaction(transaction)
  for (const settlement of settlements) requireSettlement(settlement)

  return {
    tasks: asRecords<AppState['tasks']>(tasks),
    taskInstances: asRecords<AppState['taskInstances']>(taskInstances),
    habits: asRecords<AppState['habits']>(habits),
    habitLogs: asRecords<AppState['habitLogs']>(habitLogs),
    rewards: asRecords<AppState['rewards']>(rewards),
    redemptions: asRecords<AppState['redemptions']>(redemptions),
    pointTransactions: asRecords<AppState['pointTransactions']>(pointTransactions),
    settlements: asRecords<AppState['settlements']>(settlements),
  }
}

function asRecords<T>(value: Record<string, unknown>[]): T {
  return value as unknown as T
}

function requireTask(record: Record<string, unknown>): void {
  requireString(record, 'id')
  requireString(record, 'name')
  requireNumber(record, 'points')
  requireNumber(record, 'monthlyPerfectBonus')
  requireSchedule(record.schedule)
  requireNumber(record, 'recordOffsetDays')
  requireOneOf(record.status, TASK_STATUSES)
  requireString(record, 'createdAt')
  requireString(record, 'updatedAt')
}

function requireSchedule(value: unknown): void {
  if (!isRecord(value)) failShape()
  requireOneOf(value.frequency, FREQUENCIES)
  requireNumber(value, 'interval')
  requireString(value, 'startDate')
  requireOneOf(value.endType, END_TYPES)
}

function requireTaskInstance(record: Record<string, unknown>): void {
  requireString(record, 'id')
  requireString(record, 'taskId')
  requireString(record, 'businessDate')
  requireOneOf(record.status, INSTANCE_STATUSES)
}

function requireHabit(record: Record<string, unknown>): void {
  requireString(record, 'id')
  requireString(record, 'name')
  requireNumber(record, 'penalty')
  requireOneOf(record.status, TASK_STATUSES)
  requireString(record, 'createdAt')
  requireString(record, 'updatedAt')
}

function requireHabitLog(record: Record<string, unknown>): void {
  requireString(record, 'id')
  requireString(record, 'habitId')
  requireString(record, 'businessDate')
  requireString(record, 'habitNameSnapshot')
  requireNumber(record, 'penaltySnapshot')
  requireString(record, 'createdAt')
}

function requireReward(record: Record<string, unknown>): void {
  requireString(record, 'id')
  requireString(record, 'name')
  requireNumber(record, 'cost')
  const maxRedemptions = record.maxRedemptions
  if (maxRedemptions !== null && (typeof maxRedemptions !== 'number' || !Number.isFinite(maxRedemptions))) {
    failShape()
  }
  requireOneOf(record.status, TASK_STATUSES)
  requireString(record, 'createdAt')
  requireString(record, 'updatedAt')
}

function requireRedemption(record: Record<string, unknown>): void {
  requireString(record, 'id')
  requireString(record, 'rewardId')
  requireString(record, 'rewardNameSnapshot')
  requireNumber(record, 'costSnapshot')
  requireString(record, 'redeemedAt')
}

function requireTransaction(record: Record<string, unknown>): void {
  requireString(record, 'id')
  requireOneOf(record.type, POINT_TYPES)
  requireNumber(record, 'delta')
  requireString(record, 'sourceId')
  requireString(record, 'description')
  requireString(record, 'businessDate')
  requireString(record, 'createdAt')
}

function requireSettlement(record: Record<string, unknown>): void {
  requireString(record, 'yearMonth')
  requireString(record, 'settledAt')
  if (!Array.isArray(record.awardedTaskIds)) failShape()
  for (const id of record.awardedTaskIds) {
    if (typeof id !== 'string' || id.length === 0) failShape()
  }
}

function collection(state: Record<string, unknown>, key: (typeof COLLECTIONS)[number]): Record<string, unknown>[] {
  const value = state[key]
  if (!Array.isArray(value)) failShape()
  return value.map((item) => {
    if (!isRecord(item)) failShape()
    return item
  })
}

function requireString(record: Record<string, unknown>, key: string): void {
  const value = record[key]
  if (typeof value !== 'string' || value.length === 0) failShape()
}

function requireNumber(record: Record<string, unknown>, key: string): void {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) failShape()
}

function requireOneOf(value: unknown, allowed: readonly string[]): void {
  if (typeof value !== 'string' || !allowed.includes(value)) failShape()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function failShape(): never {
  throw new AppError('INVALID_BACKUP', SHAPE_MESSAGE)
}
