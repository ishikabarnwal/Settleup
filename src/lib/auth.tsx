import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { onSessionRejected } from './api'
import { STORAGE_KEY, currentSession, reloadSession, saveSession, sessionFrom, type Session } from './session'
import type { AuthResponse, User } from './types'

type AuthContextValue = {
  user: User | null
  signIn: (response: AuthResponse) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(currentSession)
  const navigate = useNavigate()
  const location = useLocation()
  const here = location.pathname + location.search

  // Ending a session by itself, rather than by clicking Sign out, lands on
  // the login page with a note of where they were, so they can pick up again.
  const endSession = useCallback(
    (message: string) => {
      saveSession(null)
      setSession(null)
      queryClient.clear()
      toast.error(message, { id: 'session-ended' })
      navigate('/login', { replace: true, state: here === '/' ? undefined : { from: here } })
    },
    [queryClient, navigate, here],
  )

  const signOut = useCallback(() => {
    saveSession(null)
    setSession(null)
    queryClient.clear()
  }, [queryClient])

  const signIn = useCallback(
    (response: AuthResponse) => {
      const next = sessionFrom(response)
      queryClient.clear()
      saveSession(next)
      setSession(next)
    },
    [queryClient],
  )

  useEffect(() => {
    onSessionRejected(() => {
      if (!currentSession()) return
      endSession('Your session has ended. Please sign in again.')
    })
  }, [endSession])

  // Sign out on the dot when the token expires rather than waiting for a failed request.
  useEffect(() => {
    if (!session) return
    const msLeft = new Date(session.expiresAt).getTime() - Date.now()
    // setTimeout can't wait longer than ~24.8 days; tokens last 12 hours anyway.
    const timer = window.setTimeout(
      () => endSession('Your session expired. Please sign in again.'),
      Math.min(Math.max(msLeft, 0), 2_147_483_647),
    )
    return () => window.clearTimeout(timer)
  }, [session, endSession])

  // Keep tabs in step: signing in or out in one tab does the same in the others.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      queryClient.clear()
      setSession(reloadSession())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [queryClient])

  const value = useMemo(() => ({ user: session?.user ?? null, signIn, signOut }), [session, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

/** For pages behind the login, where a user is guaranteed. */
export function useCurrentUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error('useCurrentUser needs a signed in user')
  return user
}
