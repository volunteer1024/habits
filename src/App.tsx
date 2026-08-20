import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from '@/app/app-context'
import { AppShell } from '@/components/layout/app-shell'
import { Toaster } from '@/components/ui/sonner'
import { TodayPage } from '@/pages/today-page'
import { StatsPage } from '@/pages/stats-page'
import { PointsPage } from '@/pages/points-page'
import { MePage } from '@/pages/me-page'
import { AboutPage } from '@/pages/about-page'
import { TaskSettingsPage } from '@/pages/task-settings-page'
import { HabitSettingsPage } from '@/pages/habit-settings-page'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<TodayPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/points" element={<PointsPage />} />
            <Route path="/rewards/new" element={<PointsPage />} />
            <Route path="/rewards/:id" element={<PointsPage />} />
            <Route path="/me" element={<MePage />} />
            <Route path="/me/about" element={<AboutPage />} />
            <Route path="/settings/tasks" element={<TaskSettingsPage />} />
            <Route path="/settings/tasks/new" element={<TaskSettingsPage />} />
            <Route path="/settings/tasks/:id" element={<TaskSettingsPage />} />
            <Route path="/settings/habits" element={<HabitSettingsPage />} />
            <Route path="/settings/habits/new" element={<HabitSettingsPage />} />
            <Route path="/settings/habits/:id" element={<HabitSettingsPage />} />
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AppProvider>
  )
}
