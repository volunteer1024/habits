import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, Coins, SunMedium, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/domain/types'

const nav = [
  { to: '/today', label: '今日', icon: SunMedium },
  { to: '/stats', label: '统计', icon: BarChart3 },
  { to: '/points', label: '积分', icon: Coins },
  { to: '/me', label: '我的', icon: User },
]

function NavItems({ className }: { className?: string }) {
  return (
    <nav className={className}>
      {nav.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-complete-soft text-complete'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon className="size-4" />
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}

export function AppShell() {
  return (
    <div className="min-h-svh bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-56 border-r bg-sidebar px-4 py-6 md:flex md:flex-col">
        <div className="mb-8 px-3">
          <p className="font-heading text-lg font-semibold tracking-tight">{APP_NAME}</p>
          <p className="mt-1 text-xs text-muted-foreground">任务 · 积分 · 奖励</p>
        </div>
        <NavItems className="flex flex-col gap-1" />
      </aside>

      <div className="md:pl-56">
        <main className="mx-auto min-h-svh w-full max-w-[720px] px-4 pt-4 pb-24 md:px-6 md:pt-8 md:pb-10">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 backdrop-blur-md md:hidden">
        <div className="mx-auto grid max-w-[720px] grid-cols-4 px-2 py-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium',
                    isActive ? 'text-complete' : 'text-muted-foreground',
                  )
                }
              >
                <Icon className="size-5" />
                {item.label}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
