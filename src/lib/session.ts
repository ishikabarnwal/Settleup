import type { AuthResponse, User } from './types'

/**
 * Where the login token lives.
 *
 * The ideal is an httpOnly cookie: script can't read it, so an XSS bug can't
 * steal the session. That has to be set by the server, though, and the
 * backend hands the token back in the response body for an Authorization
 * header, so a pure frontend can't get there on its own.
 *
 * The choice is between memory only (safest, but every refresh or new tab
 * logs you out) and localStorage (survives refreshes, but readable by any
 * script on the page). This uses localStorage and keeps the exposure small:
 * React escapes everything it renders, nothing uses dangerouslySetInnerHTML,
 * there are no third party scripts, and tokens expire after 12 hours. The
 * stored expiry is checked on load and a timer signs the user out when it
 * passes. Moving to cookies would mean a backend change (Set-Cookie on login,
 * reading the cookie in the JWT filter, and CSRF protection).
 */
export const STORAGE_KEY = 'settleup.session'

export type Session = {
  token: string
  expiresAt: string
  user: User
}

export function sessionFrom(response: AuthResponse): Session {
  return { token: response.token, expiresAt: response.expiresAt, user: response.user }
}

export function isExpired(session: Session, now = Date.now()): boolean {
  return new Date(session.expiresAt).getTime() <= now
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const session = JSON.parse(raw) as Session
    if (!session.token || !session.expiresAt || !session.user || isExpired(session)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

let current: Session | null = loadSession()

/** The session the API client should use right now, or null once it has expired. */
export function currentToken(): string | null {
  return current && !isExpired(current) ? current.token : null
}

export function currentSession(): Session | null {
  return current
}

/** Re-read storage, e.g. after another tab signed in or out. */
export function reloadSession(): Session | null {
  current = loadSession()
  return current
}

export function saveSession(session: Session | null) {
  current = session
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable (private mode, blocked site data). The
    // session still works for this tab, it just won't survive a refresh.
  }
}
