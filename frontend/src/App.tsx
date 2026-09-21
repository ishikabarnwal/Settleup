import { Navigate, Route, Routes, useLocation } from 'react-router'
import type { ReactNode } from 'react'
import { AppShell } from './components/AppShell'
import { ScrollToTop } from './components/ScrollToTop'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { DashboardPage } from './features/groups/DashboardPage'
import { GroupPage } from './features/groups/GroupPage'
import { LandingPage } from './features/landing/LandingPage'
import { NotFoundPage } from './features/NotFoundPage'
import { useAuth } from './lib/auth'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    // Remember where they were headed so login can send them back there.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return children
}

/**
 * The login and register pages. Once someone is signed in they're sent on,
 * either to the page that bounced them to login or to their groups. Doing
 * this here rather than in the form means there is only one redirect.
 */
function GuestOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return children

  const from = (location.state as { from?: string } | null)?.from
  return <Navigate to={from && from.startsWith('/') && !from.startsWith('//') ? from : '/'} replace />
}

/**
 * "/" is two pages: the landing page for visitors, and the dashboard once
 * you're signed in. Deciding here means a signed-in user never sees the
 * landing page, not even for a moment.
 */
function Home() {
  const { user } = useAuth()
  if (!user) return <LandingPage />

  return (
    <AppShell>
      <DashboardPage />
    </AppShell>
  )
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route
          path="/login"
          element={
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly>
              <RegisterPage />
            </GuestOnly>
          }
        />
        <Route index element={<Home />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="groups/:groupId" element={<GroupPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  )
}
