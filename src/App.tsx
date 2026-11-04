import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/layout/RequireAuth'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import { isSupabaseConfigured } from '@/lib/supabase'
import { DashboardPage } from '@/pages/DashboardPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { VerifyPage } from '@/pages/auth/VerifyPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SetupNeededPage } from '@/pages/SetupNeededPage'
import { WorkshopsPage } from '@/pages/WorkshopsPage'
import { BikeDetailPage } from '@/pages/bikes/BikeDetailPage'
import { BikesPage } from '@/pages/bikes/BikesPage'
import { EditBikePage } from '@/pages/bikes/EditBikePage'
import { HistoryPage } from '@/pages/bikes/HistoryPage'
import { LogServicePage } from '@/pages/bikes/LogServicePage'
import { NewBikePage } from '@/pages/bikes/NewBikePage'
import { RidePage } from '@/pages/bikes/RidePage'
import { SchedulePage } from '@/pages/bikes/SchedulePage'

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
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/bikes" element={<BikesPage />} />
                <Route path="/bikes/new" element={<NewBikePage />} />
                <Route path="/bikes/:bikeId" element={<BikeDetailPage />} />
                <Route path="/bikes/:bikeId/edit" element={<EditBikePage />} />
                <Route path="/bikes/:bikeId/service/new" element={<LogServicePage />} />
                <Route path="/bikes/:bikeId/history" element={<HistoryPage />} />
                <Route path="/bikes/:bikeId/schedule" element={<SchedulePage />} />
                <Route path="/bikes/:bikeId/ride" element={<RidePage />} />
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
