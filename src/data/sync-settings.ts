import { createId } from '@/domain/schedule'

export const SYNC_STORAGE_KEY = 'checkin:sync:v1'

const CLIENT_ID = /^[A-Za-z0-9_-]{8,80}$/
const DAY = /^\d{4}-\d{2}-\d{2}$/

export interface SyncRecord {
  clientId: string
  baseUrl: string
  lastSuccessDay: string
  lastSyncAt: string
}

export interface SyncSettingsStore {
  load(): Promise<SyncRecord>
  save(record: SyncRecord): Promise<void>
}

interface KeyValue {
  getItem(): string | null
  setItem(value: string): void
}

export function createSyncSettingsStore(storage: KeyValue): SyncSettingsStore {
  return {
    async load() {
      const parsed = parseRecord(storage.getItem())
      if (parsed) return parsed
      const created = emptyRecord()
      storage.setItem(JSON.stringify(created))
      return created
    },
    async save(record) {
      storage.setItem(JSON.stringify(record))
    },
  }
}

export function memorySyncSettings(initial: string | null = null): SyncSettingsStore {
  let raw = initial
  return createSyncSettingsStore({
    getItem: () => raw,
    setItem: (value) => {
      raw = value
    },
  })
}

export function localStorageSyncSettings(): SyncSettingsStore {
  return createSyncSettingsStore({
    getItem: () => localStorage.getItem(SYNC_STORAGE_KEY),
    setItem: (value) => {
      localStorage.setItem(SYNC_STORAGE_KEY, value)
    },
  })
}

function emptyRecord(): SyncRecord {
  return {
    clientId: createId(),
    baseUrl: '',
    lastSuccessDay: '',
    lastSyncAt: '',
  }
}

function parseRecord(raw: string | null): SyncRecord | null {
  if (!raw) return null
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(value)) return null
  if (typeof value.clientId !== 'string' || !CLIENT_ID.test(value.clientId)) return null
  if (typeof value.baseUrl !== 'string') return null
  if (typeof value.lastSuccessDay !== 'string') return null
  if (value.lastSuccessDay !== '' && !DAY.test(value.lastSuccessDay)) return null
  if (typeof value.lastSyncAt !== 'string') return null
  return {
    clientId: value.clientId,
    baseUrl: value.baseUrl,
    lastSuccessDay: value.lastSuccessDay,
    lastSyncAt: value.lastSyncAt,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
