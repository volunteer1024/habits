import { createId } from '@/domain/schedule'
import type { AppState, BadHabit, Reward, Task } from '@/domain/types'

function dailyTask(
  name: string,
  points: number,
  recordOffsetDays: number,
  today: string,
  timestamp: string,
): Task {
  return {
    id: createId(),
    name,
    points,
    monthlyPerfectBonus: 0,
    recordOffsetDays,
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
    schedule: {
      frequency: 'daily',
      interval: 1,
      startDate: today,
      endType: 'never',
    },
  }
}

function habit(name: string, penalty: number, timestamp: string): BadHabit {
  return {
    id: createId(),
    name,
    penalty,
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function reward(name: string, cost: number, timestamp: string): Reward {
  return {
    id: createId(),
    name,
    cost,
    maxRedemptions: null,
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function applySeed(state: AppState, today: string, timestamp: string): void {
  state.tasks.push(
    dailyTask('背单词', 5, 0, today, timestamp),
    dailyTask('早睡', 10, -1, today, timestamp),
    dailyTask('喝药', 1, 0, today, timestamp),
  )
  state.habits.push(
    habit('手冲', 20, timestamp),
    habit('喝奶茶', 10, timestamp),
    habit('喝碳酸饮料', 5, timestamp),
    habit('喝酒', 20, timestamp),
  )
  state.rewards.push(
    reward('按摩', 600, timestamp),
    reward('任意 200 元电子产品', 200, timestamp),
  )
}
