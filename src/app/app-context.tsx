import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LocalStorageAdapter } from '@/data/adapter'
import { systemClock } from '@/domain/clock'
import { createApp, type AppRuntime } from '@/services/create-app'

export const AppContext = createContext<AppRuntime | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const runtime = useMemo(() => createApp(new LocalStorageAdapter(), systemClock()), [])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void runtime
      .bootstrap()
      .then(() => setReady(true))
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : '加载失败')
      })
  }, [runtime])

  if (error) {
    return (
      <div className="flex min-h-svh items-center justify-center px-6 text-center text-sm text-muted-foreground">
        {error}
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        加载中…
      </div>
    )
  }

  return <AppContext.Provider value={runtime}>{children}</AppContext.Provider>
}
