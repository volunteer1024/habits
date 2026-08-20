import type { Clock } from '@/domain/clock'
import {
  addDays,
  calendarGrid,
  endOfMonth,
  endOfWeekSunday,
  monthRange,
  startOfMonth,
  startOfWeekMonday,
  yearMonth,
} from '@/domain/dates'
import { AppError } from '@/domain/errors'
import { createId, endedBefore, isScheduledOn, scheduledDates } from '@/domain/schedule'
import { displayTaskName } from '@/domain/types'
import type {
  BadHabit,
  BadHabitLog,
  EndType,
  Frequency,
  PointTransaction,
  Reward,
  Task,
  TaskInstance,
} from '@/domain/types'
import type { AppStore } from '@/data/store'
import type { HabitRepository, RewardRepository, TaskRepository } from '@/data/repositories'

export interface CreateTaskInput {
  name: string
  points: number
  monthlyPerfectBonus?: number
  startDate: string
  frequency: Frequency
  interval?: number
  weekdays?: number[]
  endType: EndType
  count?: number
  recordOffsetDays?: number
}

export interface UpdateTaskInput {
  name?: string
  points?: number
  monthlyPerfectBonus?: number
  startDate?: string
  frequency?: Frequency
  interval?: number
  weekdays?: number[]
  endType?: EndType
  count?: number
  recordOffsetDays?: number
}

export interface TodayItem {
  task: Task
  instance: TaskInstance
  displayName: string
  points: number
}

function requireTask(state: { tasks: Task[] }, id: string): Task {
  const task = state.tasks.find((item) => item.id === id)
  if (!task) throw new AppError('NOT_FOUND', '任务不存在')
  return task
}

function instanceOnDate(state: { taskInstances: TaskInstance[] }, taskId: string, date: string) {
  return state.taskInstances.find((item) => item.taskId === taskId && item.businessDate === date)
}

function ensureInstance(state: { taskInstances: TaskInstance[] }, task: Task, date: string): TaskInstance {
  const existing = instanceOnDate(state, task.id, date)
  if (existing) return existing
  const created: TaskInstance = {
    id: createId(),
    taskId: task.id,
    businessDate: date,
    status: 'pending',
  }
  state.taskInstances.push(created)
  return created
}

export class TaskService {
  private store: AppStore
  private clock: Clock
  private tasks: TaskRepository

  constructor(store: AppStore, clock: Clock, tasks: TaskRepository) {
    this.store = store
    this.clock = clock
    this.tasks = tasks
  }

  async listActive(): Promise<Task[]> {
    return (await this.tasks.list()).filter((task) => task.status === 'active')
  }

  async listAll(): Promise<Task[]> {
    return this.tasks.list()
  }

  async getTodayItems(): Promise<TodayItem[]> {
    const date = this.clock.today()
    await this.store.update((state) => {
      for (const task of state.tasks) {
        if (task.status !== 'active') continue
        if (isScheduledOn(task, date) || instanceOnDate(state, task.id, date)?.status === 'completed') {
          ensureInstance(state, task, date)
        }
      }
    })

    const state = this.store.getSnapshot()
    const items: TodayItem[] = []
    for (const task of state.tasks) {
      const instance = instanceOnDate(state, task.id, date)
      if (!instance) continue
      if (task.status !== 'active' && instance.status !== 'completed') continue
      if (!isScheduledOn(task, date) && instance.status !== 'completed') continue
      items.push({
        task,
        instance,
        displayName: instance.taskNameSnapshot ?? displayTaskName(task),
        points: instance.lockedPoints ?? task.points,
      })
    }
    return items
  }

  async complete(taskId: string): Promise<void> {
    const date = this.clock.today()
    await this.store.update((state) => {
      const task = requireTask(state, taskId)
      if (!isScheduledOn(task, date)) {
        throw new AppError('NOT_SCHEDULED', '今天没有这个任务')
      }
      const instance = ensureInstance(state, task, date)
      if (instance.status === 'completed') return
      const points = instance.lockedPoints ?? task.points
      instance.lockedPoints = points
      instance.status = 'completed'
      instance.completedAt = this.clock.nowIso()
      instance.taskNameSnapshot = displayTaskName(task)
      state.pointTransactions.push({
        id: createId(),
        type: 'task_complete',
        delta: points,
        sourceId: instance.id,
        description: instance.taskNameSnapshot,
        businessDate: date,
        createdAt: this.clock.nowIso(),
      })
    })
  }

  async undo(taskId: string): Promise<void> {
    const date = this.clock.today()
    await this.store.update((state) => {
      const instance = instanceOnDate(state, taskId, date)
      if (!instance || instance.status !== 'completed') return
      const points = instance.lockedPoints ?? 0
      instance.status = 'pending'
      instance.completedAt = undefined
      state.pointTransactions.push({
        id: createId(),
        type: 'task_undo',
        delta: -points,
        sourceId: instance.id,
        description: `${instance.taskNameSnapshot ?? '任务'} 撤销`,
        businessDate: date,
        createdAt: this.clock.nowIso(),
      })
    })
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const name = input.name.trim()
    if (!name) throw new AppError('INVALID', '请填写任务名称')
    if (input.points < 0) throw new AppError('INVALID', '积分不能为负数')
    if ((input.monthlyPerfectBonus ?? 0) < 0) throw new AppError('INVALID', '全勤奖励不能为负数')
    if (input.startDate < this.clock.today()) {
      throw new AppError('START_DATE_IN_PAST', '不支持新建历史任务')
    }
    if (input.frequency === 'weekly' && (!input.weekdays || input.weekdays.length === 0)) {
      throw new AppError('INVALID', '请选择重复星期')
    }
    if (input.endType === 'count' && (!input.count || input.count < 1)) {
      throw new AppError('INVALID', '请填写结束次数')
    }

    const timestamp = this.clock.nowIso()
    const task: Task = {
      id: createId(),
      name,
      points: input.points,
      monthlyPerfectBonus: input.monthlyPerfectBonus ?? 0,
      recordOffsetDays: input.recordOffsetDays ?? 0,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
      schedule: {
        frequency: input.frequency,
        interval: input.interval ?? 1,
        startDate: input.startDate,
        weekdays: input.frequency === 'weekly' ? input.weekdays : undefined,
        endType: input.endType,
        count: input.endType === 'count' ? input.count : undefined,
      },
    }
    return this.tasks.create(task)
  }

  async update(id: string, patch: UpdateTaskInput): Promise<Task> {
    const current = await this.tasks.get(id)
    if (!current) throw new AppError('NOT_FOUND', '任务不存在')
    const timestamp = this.clock.nowIso()
    const name = patch.name?.trim() ?? current.name
    if (!name) throw new AppError('INVALID', '请填写任务名称')
    const points = patch.points ?? current.points
    const monthlyPerfectBonus = patch.monthlyPerfectBonus ?? current.monthlyPerfectBonus
    if (points < 0 || monthlyPerfectBonus < 0) throw new AppError('INVALID', '积分不能为负数')

    const frequency = patch.frequency ?? current.schedule.frequency
    const weekdays = patch.weekdays ?? current.schedule.weekdays
    const endType = patch.endType ?? current.schedule.endType
    const count = patch.count ?? current.schedule.count
    if (frequency === 'weekly' && (!weekdays || weekdays.length === 0)) {
      throw new AppError('INVALID', '请选择重复星期')
    }
    if (endType === 'count' && (!count || count < 1)) {
      throw new AppError('INVALID', '请填写结束次数')
    }

    return this.tasks.update(id, {
      name,
      points,
      monthlyPerfectBonus,
      recordOffsetDays: patch.recordOffsetDays ?? current.recordOffsetDays,
      updatedAt: timestamp,
      schedule: {
        frequency,
        interval: patch.interval ?? current.schedule.interval,
        startDate: patch.startDate ?? current.schedule.startDate,
        weekdays: frequency === 'weekly' ? weekdays : undefined,
        endType,
        count: endType === 'count' ? count : undefined,
      },
    })
  }

  async archive(id: string): Promise<void> {
    await this.tasks.update(id, {
      status: 'archived',
      archivedOn: this.clock.today(),
      updatedAt: this.clock.nowIso(),
    })
  }
}

export class HabitService {
  private store: AppStore
  private clock: Clock
  private habits: HabitRepository

  constructor(store: AppStore, clock: Clock, habits: HabitRepository) {
    this.store = store
    this.clock = clock
    this.habits = habits
  }

  async listActive(): Promise<BadHabit[]> {
    return (await this.habits.list()).filter((habit) => habit.status === 'active')
  }

  async listAll(): Promise<BadHabit[]> {
    return this.habits.list()
  }

  logsForDate(date: string): BadHabitLog[] {
    return this.store.getSnapshot().habitLogs.filter((log) => log.businessDate === date)
  }

  async create(input: { name: string; penalty: number }): Promise<BadHabit> {
    const name = input.name.trim()
    if (!name) throw new AppError('INVALID', '请填写名称')
    if (input.penalty < 0) throw new AppError('INVALID', '扣分不能为负数')
    const timestamp = this.clock.nowIso()
    return this.habits.create({
      id: createId(),
      name,
      penalty: input.penalty,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }

  async update(id: string, patch: { name?: string; penalty?: number }): Promise<BadHabit> {
    const current = await this.habits.get(id)
    if (!current) throw new AppError('NOT_FOUND', '坏习惯不存在')
    const name = patch.name?.trim() ?? current.name
    const penalty = patch.penalty ?? current.penalty
    if (!name) throw new AppError('INVALID', '请填写名称')
    if (penalty < 0) throw new AppError('INVALID', '扣分不能为负数')
    return this.habits.update(id, { name, penalty, updatedAt: this.clock.nowIso() })
  }

  async archive(id: string): Promise<void> {
    await this.habits.update(id, { status: 'archived', updatedAt: this.clock.nowIso() })
  }

  async record(habitId: string): Promise<void> {
    const date = this.clock.today()
    await this.store.update((state) => {
      const habit = state.habits.find((item) => item.id === habitId)
      if (!habit || habit.status !== 'active') {
        throw new AppError('NOT_FOUND', '坏习惯不存在')
      }
      const log: BadHabitLog = {
        id: createId(),
        habitId: habit.id,
        businessDate: date,
        habitNameSnapshot: habit.name,
        penaltySnapshot: habit.penalty,
        createdAt: this.clock.nowIso(),
      }
      state.habitLogs.push(log)
      state.pointTransactions.push({
        id: createId(),
        type: 'bad_habit',
        delta: -habit.penalty,
        sourceId: log.id,
        description: habit.name,
        businessDate: date,
        createdAt: this.clock.nowIso(),
      })
    })
  }
}

export class PointService {
  private store: AppStore

  constructor(store: AppStore) {
    this.store = store
  }

  balance(): number {
    return this.store
      .getSnapshot()
      .pointTransactions.reduce((sum, item) => sum + item.delta, 0)
  }

  recent(limit = 40): PointTransaction[] {
    return [...this.store.getSnapshot().pointTransactions].reverse().slice(0, limit)
  }
}

export class RewardService {
  private store: AppStore
  private clock: Clock
  private rewards: RewardRepository
  private points: PointService

  constructor(store: AppStore, clock: Clock, rewards: RewardRepository, points: PointService) {
    this.store = store
    this.clock = clock
    this.rewards = rewards
    this.points = points
  }

  async listActive(): Promise<Reward[]> {
    return (await this.rewards.list()).filter((reward) => reward.status === 'active')
  }

  async listAll(): Promise<Reward[]> {
    return this.rewards.list()
  }

  redemptionCount(rewardId: string): number {
    return this.store.getSnapshot().redemptions.filter((item) => item.rewardId === rewardId).length
  }

  canRedeem(reward: Reward): { ok: boolean; code?: string; message?: string } {
    if (reward.status !== 'active') {
      return { ok: false, code: 'ARCHIVED', message: '奖励已归档' }
    }
    const count = this.redemptionCount(reward.id)
    if (reward.maxRedemptions !== null && count >= reward.maxRedemptions) {
      return { ok: false, code: 'REDEMPTION_LIMIT', message: '已达到最大兑换次数' }
    }
    if (this.points.balance() < reward.cost) {
      return { ok: false, code: 'INSUFFICIENT_POINTS', message: '积分不足' }
    }
    return { ok: true }
  }

  async create(input: { name: string; cost: number; maxRedemptions: number | null }): Promise<Reward> {
    const name = input.name.trim()
    if (!name) throw new AppError('INVALID', '请填写奖励名称')
    if (input.cost < 0) throw new AppError('INVALID', '积分不能为负数')
    if (input.maxRedemptions !== null && input.maxRedemptions < 1) {
      throw new AppError('INVALID', '最大兑换次数至少为 1')
    }
    const timestamp = this.clock.nowIso()
    return this.rewards.create({
      id: createId(),
      name,
      cost: input.cost,
      maxRedemptions: input.maxRedemptions,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }

  async update(
    id: string,
    patch: { name?: string; cost?: number; maxRedemptions?: number | null },
  ): Promise<Reward> {
    const current = await this.rewards.get(id)
    if (!current) throw new AppError('NOT_FOUND', '奖励不存在')
    const name = patch.name?.trim() ?? current.name
    const cost = patch.cost ?? current.cost
    const maxRedemptions = patch.maxRedemptions === undefined ? current.maxRedemptions : patch.maxRedemptions
    if (!name) throw new AppError('INVALID', '请填写奖励名称')
    if (cost < 0) throw new AppError('INVALID', '积分不能为负数')
    if (maxRedemptions !== null && maxRedemptions < 1) {
      throw new AppError('INVALID', '最大兑换次数至少为 1')
    }
    return this.rewards.update(id, { name, cost, maxRedemptions, updatedAt: this.clock.nowIso() })
  }

  async archive(id: string): Promise<void> {
    await this.rewards.update(id, { status: 'archived', updatedAt: this.clock.nowIso() })
  }

  async redeem(rewardId: string): Promise<void> {
    await this.store.update((state) => {
      const reward = state.rewards.find((item) => item.id === rewardId)
      if (!reward) throw new AppError('NOT_FOUND', '奖励不存在')
      const check = this.canRedeem(reward)
      if (!check.ok) throw new AppError(check.code ?? 'INVALID', check.message ?? '无法兑换')
      const redemption = {
        id: createId(),
        rewardId: reward.id,
        rewardNameSnapshot: reward.name,
        costSnapshot: reward.cost,
        redeemedAt: this.clock.nowIso(),
      }
      state.redemptions.push(redemption)
      state.pointTransactions.push({
        id: createId(),
        type: 'reward_redeem',
        delta: -reward.cost,
        sourceId: redemption.id,
        description: reward.name,
        businessDate: this.clock.today(),
        createdAt: this.clock.nowIso(),
      })
    })
  }
}

export interface TaskPeriodStat {
  taskId: string
  name: string
  scheduled: number
  completed: number
  monthlyPerfectBonus: number
  eligibleForBonus: boolean
}

export interface PeriodStats {
  start: string
  end: string
  scheduled: number
  completed: number
  rate: number
  tasks: TaskPeriodStat[]
}

export interface CalendarDay {
  date: string
  inMonth: boolean
  marked: boolean
  scheduled: boolean
}

function completedSet(instances: TaskInstance[], taskId: string): Set<string> {
  return new Set(
    instances
      .filter((item) => item.taskId === taskId && item.status === 'completed')
      .map((item) => item.businessDate),
  )
}

export function isEligibleForMonthlyBonus(task: Task, ym: string): boolean {
  const { start, end } = monthRange(ym)
  if (task.schedule.startDate > start) return false
  if (endedBefore(task, end)) return false
  return true
}

export class StatsService {
  private store: AppStore
  private clock: Clock

  constructor(store: AppStore, clock: Clock) {
    this.store = store
    this.clock = clock
  }

  weekStats(anchor = this.clock.today()): PeriodStats {
    return this.periodStats(startOfWeekMonday(anchor), endOfWeekSunday(anchor))
  }

  monthStats(anchor = this.clock.today()): PeriodStats {
    return this.periodStats(startOfMonth(anchor), endOfMonth(anchor))
  }

  periodStats(start: string, end: string): PeriodStats {
    const state = this.store.getSnapshot()
    const rows: TaskPeriodStat[] = []
    for (const task of state.tasks) {
      const scheduled = scheduledDates(task, start, end)
      if (scheduled.length === 0) continue
      const done = completedSet(state.taskInstances, task.id)
      const completed = scheduled.filter((date) => done.has(date)).length
      const ym = yearMonth(start)
      rows.push({
        taskId: task.id,
        name: task.name,
        scheduled: scheduled.length,
        completed,
        monthlyPerfectBonus: task.monthlyPerfectBonus,
        eligibleForBonus: isEligibleForMonthlyBonus(task, ym),
      })
    }
    const scheduled = rows.reduce((sum, row) => sum + row.scheduled, 0)
    const completed = rows.reduce((sum, row) => sum + row.completed, 0)
    return {
      start,
      end,
      scheduled,
      completed,
      rate: scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100),
      tasks: rows,
    }
  }

  calendarDays(ym: string, filter: string | 'all' = 'all'): CalendarDay[] {
    const state = this.store.getSnapshot()
    return calendarGrid(ym).map((cell) => {
      if (!cell.inMonth) {
        return { ...cell, marked: false, scheduled: false }
      }
      if (filter === 'all') {
        const scheduledTasks = state.tasks.filter((task) => isScheduledOn(task, cell.date))
        const scheduled = scheduledTasks.length > 0
        const marked =
          scheduled &&
          scheduledTasks.every((task) =>
            state.taskInstances.some(
              (item) =>
                item.taskId === task.id &&
                item.businessDate === cell.date &&
                item.status === 'completed',
            ),
          )
        return { ...cell, marked, scheduled }
      }
      const task = state.tasks.find((item) => item.id === filter)
      const scheduled = task ? isScheduledOn(task, cell.date) : false
      const marked =
        scheduled &&
        state.taskInstances.some(
          (item) =>
            item.taskId === filter && item.businessDate === cell.date && item.status === 'completed',
        )
      return { ...cell, marked, scheduled }
    })
  }
}

export class MonthlySettlementService {
  private store: AppStore
  private clock: Clock

  constructor(store: AppStore, clock: Clock) {
    this.store = store
    this.clock = clock
  }

  async settlePastMonths(): Promise<void> {
    const currentYm = yearMonth(this.clock.today())
    const previous = addDays(monthRange(currentYm).start, -1)
    const previousYm = yearMonth(previous)
    await this.store.update((state) => {
      const starts = state.tasks.map((task) => task.schedule.startDate.slice(0, 7))
      if (starts.length === 0) return
      const earliest = starts.reduce((min, item) => (item < min ? item : min))
      let cursor = earliest
      while (cursor <= previousYm) {
        if (!state.settlements.some((item) => item.yearMonth === cursor)) {
          this.settleMonth(state, cursor)
        }
        cursor = yearMonth(addDays(monthRange(cursor).end, 1))
      }
    })
  }

  private settleMonth(state: { tasks: Task[]; taskInstances: TaskInstance[]; pointTransactions: PointTransaction[]; settlements: { yearMonth: string; settledAt: string; awardedTaskIds: string[] }[] }, ym: string): void {
    const { start, end } = monthRange(ym)
    const awardedTaskIds: string[] = []
    for (const task of state.tasks) {
      if (task.monthlyPerfectBonus <= 0) continue
      if (!isEligibleForMonthlyBonus(task, ym)) continue
      const scheduled = scheduledDates(task, start, end)
      if (scheduled.length === 0) continue
      const done = completedSet(state.taskInstances, task.id)
      const perfect = scheduled.every((date) => done.has(date))
      if (!perfect) continue
      awardedTaskIds.push(task.id)
      state.pointTransactions.push({
        id: createId(),
        type: 'monthly_bonus',
        delta: task.monthlyPerfectBonus,
        sourceId: `${task.id}:${ym}`,
        description: `${Number(ym.slice(5, 7))} 月${task.name}全勤`,
        businessDate: end,
        createdAt: this.clock.nowIso(),
      })
    }
    state.settlements.push({
      yearMonth: ym,
      settledAt: this.clock.nowIso(),
      awardedTaskIds,
    })
  }
}
