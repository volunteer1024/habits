import { STORAGE_KEY, emptyState, type AppState } from '@/domain/types'

export interface StorageAdapter {
  load(): Promise<AppState | null>
  save(state: AppState): Promise<void>
}

export class MemoryStorageAdapter implements StorageAdapter {
  private raw: string | null

  constructor(initial: AppState | null = null) {
    this.raw = initial ? JSON.stringify(initial) : null
  }

  async load(): Promise<AppState | null> {
    if (!this.raw) return null
    return JSON.parse(this.raw) as AppState
  }

  async save(state: AppState): Promise<void> {
    this.raw = JSON.stringify(state)
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  async load(): Promise<AppState | null> {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AppState
  }

  async save(state: AppState): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
}

export { emptyState }
