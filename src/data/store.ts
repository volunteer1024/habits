import type { StorageAdapter } from './adapter'
import { emptyState } from '@/domain/types'
import type { AppState } from '@/domain/types'

export class AppStore {
  private adapter: StorageAdapter
  private snapshot: AppState
  private listeners: Set<() => void>
  private hydratedFromStorage: boolean

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
    this.snapshot = emptyState()
    this.listeners = new Set()
    this.hydratedFromStorage = false
  }

  get needsSeed(): boolean {
    return !this.hydratedFromStorage
  }

  getSnapshot = (): AppState => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async hydrate(): Promise<AppState> {
    const loaded = await this.adapter.load()
    if (loaded) {
      this.snapshot = loaded
      this.hydratedFromStorage = true
    } else {
      this.snapshot = emptyState()
      this.hydratedFromStorage = false
    }
    this.notify()
    return this.snapshot
  }

  async update(mutator: (state: AppState) => void): Promise<AppState> {
    const next = structuredClone(this.snapshot)
    mutator(next)
    this.snapshot = next
    this.hydratedFromStorage = true
    await this.adapter.save(next)
    this.notify()
    return this.snapshot
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }
}
