export type TaskStatus = 'active' | 'archived'
export type InstanceStatus = 'pending' | 'completed'
export type Frequency = 'daily' | 'weekly'
export type EndType = 'never' | 'count'
export type PointTransactionType =
  | 'task_complete'
  | 'task_undo'
  | 'bad_habit'
  | 'bad_habit_undo'
  | 'reward_redeem'
  | 'monthly_bonus'

export interface ScheduleRule {
  frequency: Frequency
  interval: number
  startDate: string
  weekdays?: number[]
  endType: EndType
  count?: number
}

export interface Task {
  id: string
  name: string
  points: number
  monthlyPerfectBonus: number
  schedule: ScheduleRule
  recordOffsetDays: number
  status: TaskStatus
  createdAt: string
  updatedAt: string
  archivedOn?: string
}

export interface TaskInstance {
  id: string
  taskId: string
  businessDate: string
  status: InstanceStatus
  completedAt?: string
  lockedPoints?: number
  taskNameSnapshot?: string
}

export interface BadHabit {
  id: string
  name: string
  penalty: number
  status: TaskStatus
  createdAt: string
  updatedAt: string
}

export interface BadHabitLog {
  id: string
  habitId: string
  businessDate: string
  habitNameSnapshot: string
  penaltySnapshot: number
  createdAt: string
}

export interface Reward {
  id: string
  name: string
  cost: number
  maxRedemptions: number | null
  status: TaskStatus
  createdAt: string
  updatedAt: string
}

export interface RewardRedemption {
  id: string
  rewardId: string
  rewardNameSnapshot: string
  costSnapshot: number
  redeemedAt: string
}

export interface PointTransaction {
  id: string
  type: PointTransactionType
  delta: number
  sourceId: string
  description: string
  businessDate: string
  createdAt: string
}

export interface MonthlySettlement {
  yearMonth: string
  settledAt: string
  awardedTaskIds: string[]
}

export interface AppState {
  tasks: Task[]
  taskInstances: TaskInstance[]
  habits: BadHabit[]
  habitLogs: BadHabitLog[]
  rewards: Reward[]
  redemptions: RewardRedemption[]
  pointTransactions: PointTransaction[]
  settlements: MonthlySettlement[]
}

export const STORAGE_KEY = 'checkin:v1'
export const APP_VERSION = '0.1.0'
export const APP_NAME = 'Habits'

export const PROFILE = {
  name: '孤笑',
  id: '0000001',
} as const

export function emptyState(): AppState {
  return {
    tasks: [],
    taskInstances: [],
    habits: [],
    habitLogs: [],
    rewards: [],
    redemptions: [],
    pointTransactions: [],
    settlements: [],
  }
}

export function displayTaskName(task: Pick<Task, 'name' | 'recordOffsetDays'>): string {
  if (task.recordOffsetDays === -1) {
    return `${task.name}（昨晚）`
  }
  return task.name
}
