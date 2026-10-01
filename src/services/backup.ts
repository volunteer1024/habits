import type { AppStore } from '@/data/store'
import type { AppState } from '@/domain/types'

export async function restoreBackup(store: AppStore, state: AppState): Promise<AppState> {
  const next = structuredClone(state)
  return store.update((current) => {
    current.tasks = next.tasks
    current.taskInstances = next.taskInstances
    current.habits = next.habits
    current.habitLogs = next.habitLogs
    current.rewards = next.rewards
    current.redemptions = next.redemptions
    current.pointTransactions = next.pointTransactions
    current.settlements = next.settlements
  })
}
