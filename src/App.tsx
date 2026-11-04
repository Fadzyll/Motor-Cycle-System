import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/layout/RequireAuth'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import { isSupabaseConfigured } from '@/lib/supabase'
import { BikesPage } from '@/pages/BikesPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SetupNeededPage } from '@/pages/SetupNeededPage'
import { WorkshopsPage } from '@/pages/WorkshopsPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export function App() {
  if (!isSupabaseConfigured) return <SetupNeededPage />

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/bikes" element={<BikesPage />} />
                <Route path="/workshops" element={<WorkshopsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
