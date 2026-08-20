import { applySeed } from '@/data/seed'
import type { StorageAdapter } from '@/data/adapter'
import {
  LocalHabitRepository,
  LocalRewardRepository,
  LocalTaskRepository,
} from '@/data/repositories'
import { AppStore } from '@/data/store'
import type { Clock } from '@/domain/clock'
import {
  HabitService,
  MonthlySettlementService,
  PointService,
  RewardService,
  StatsService,
  TaskService,
} from './domain-services'

export interface AppRuntime {
  store: AppStore
  clock: Clock
  tasks: TaskService
  habits: HabitService
  points: PointService
  rewards: RewardService
  stats: StatsService
  settlement: MonthlySettlementService
  bootstrap(): Promise<void>
}

export function createApp(adapter: StorageAdapter, clock: Clock): AppRuntime {
  const store = new AppStore(adapter)
  const taskRepo = new LocalTaskRepository(store)
  const habitRepo = new LocalHabitRepository(store)
  const rewardRepo = new LocalRewardRepository(store)
  const tasks = new TaskService(store, clock, taskRepo)
  const habits = new HabitService(store, clock, habitRepo)
  const points = new PointService(store)
  const rewards = new RewardService(store, clock, rewardRepo, points)
  const stats = new StatsService(store, clock)
  const settlement = new MonthlySettlementService(store, clock)
  let bootPromise: Promise<void> | null = null

  return {
    store,
    clock,
    tasks,
    habits,
    points,
    rewards,
    stats,
    settlement,
    async bootstrap() {
      if (bootPromise) {
        await bootPromise
        return
      }
      bootPromise = (async () => {
        await store.hydrate()
        if (store.needsSeed) {
          await store.update((state) => {
            applySeed(state, clock.today(), clock.nowIso())
          })
        }
        await settlement.settlePastMonths()
      })()
      try {
        await bootPromise
      } finally {
        bootPromise = null
      }
    },
  }
}
