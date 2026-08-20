import type { AppStore } from './store'
import type { BadHabit, Reward, Task } from '@/domain/types'
import { AppError } from '@/domain/errors'

export interface TaskRepository {
  list(): Promise<Task[]>
  get(id: string): Promise<Task | null>
  create(task: Task): Promise<Task>
  update(id: string, patch: Partial<Task>): Promise<Task>
  archive(id: string): Promise<void>
}

export interface HabitRepository {
  list(): Promise<BadHabit[]>
  get(id: string): Promise<BadHabit | null>
  create(habit: BadHabit): Promise<BadHabit>
  update(id: string, patch: Partial<BadHabit>): Promise<BadHabit>
  archive(id: string): Promise<void>
}

export interface RewardRepository {
  list(): Promise<Reward[]>
  get(id: string): Promise<Reward | null>
  create(reward: Reward): Promise<Reward>
  update(id: string, patch: Partial<Reward>): Promise<Reward>
  archive(id: string): Promise<void>
}

export class LocalTaskRepository implements TaskRepository {
  private store: AppStore

  constructor(store: AppStore) {
    this.store = store
  }

  async list(): Promise<Task[]> {
    return this.store.getSnapshot().tasks
  }

  async get(id: string): Promise<Task | null> {
    return this.store.getSnapshot().tasks.find((task) => task.id === id) ?? null
  }

  async create(task: Task): Promise<Task> {
    await this.store.update((state) => {
      state.tasks.push(task)
    })
    return task
  }

  async update(id: string, patch: Partial<Task>): Promise<Task> {
    let next: Task | undefined
    await this.store.update((state) => {
      const task = state.tasks.find((item) => item.id === id)
      if (!task) throw new AppError('NOT_FOUND', '任务不存在')
      Object.assign(task, patch)
      next = task
    })
    if (!next) throw new AppError('NOT_FOUND', '任务不存在')
    return next
  }

  async archive(id: string): Promise<void> {
    await this.update(id, { status: 'archived' })
  }
}

export class LocalHabitRepository implements HabitRepository {
  private store: AppStore

  constructor(store: AppStore) {
    this.store = store
  }

  async list(): Promise<BadHabit[]> {
    return this.store.getSnapshot().habits
  }

  async get(id: string): Promise<BadHabit | null> {
    return this.store.getSnapshot().habits.find((habit) => habit.id === id) ?? null
  }

  async create(habit: BadHabit): Promise<BadHabit> {
    await this.store.update((state) => {
      state.habits.push(habit)
    })
    return habit
  }

  async update(id: string, patch: Partial<BadHabit>): Promise<BadHabit> {
    let next: BadHabit | undefined
    await this.store.update((state) => {
      const habit = state.habits.find((item) => item.id === id)
      if (!habit) throw new AppError('NOT_FOUND', '坏习惯不存在')
      Object.assign(habit, patch)
      next = habit
    })
    if (!next) throw new AppError('NOT_FOUND', '坏习惯不存在')
    return next
  }

  async archive(id: string): Promise<void> {
    await this.update(id, { status: 'archived' })
  }
}

export class LocalRewardRepository implements RewardRepository {
  private store: AppStore

  constructor(store: AppStore) {
    this.store = store
  }

  async list(): Promise<Reward[]> {
    return this.store.getSnapshot().rewards
  }

  async get(id: string): Promise<Reward | null> {
    return this.store.getSnapshot().rewards.find((reward) => reward.id === id) ?? null
  }

  async create(reward: Reward): Promise<Reward> {
    await this.store.update((state) => {
      state.rewards.push(reward)
    })
    return reward
  }

  async update(id: string, patch: Partial<Reward>): Promise<Reward> {
    let next: Reward | undefined
    await this.store.update((state) => {
      const reward = state.rewards.find((item) => item.id === id)
      if (!reward) throw new AppError('NOT_FOUND', '奖励不存在')
      Object.assign(reward, patch)
      next = reward
    })
    if (!next) throw new AppError('NOT_FOUND', '奖励不存在')
    return next
  }

  async archive(id: string): Promise<void> {
    await this.update(id, { status: 'archived' })
  }
}
