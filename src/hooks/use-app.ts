import { useContext, useMemo, useSyncExternalStore } from 'react'
import { AppContext } from '@/app/app-context'

export function useApp() {
  const runtime = useContext(AppContext)
  if (!runtime) {
    throw new Error('useApp must be used within AppProvider')
  }
  const state = useSyncExternalStore(
    runtime.store.subscribe,
    runtime.store.getSnapshot,
    runtime.store.getSnapshot,
  )
  return useMemo(() => ({ ...runtime, state }), [runtime, state])
}
