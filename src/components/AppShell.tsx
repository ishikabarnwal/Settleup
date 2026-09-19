import { LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, Outlet, useNavigate } from 'react-router'
import { useCurrentUser, useAuth } from '../lib/auth'
import { Logo } from './Logo'
import { Avatar } from './ui/Avatar'

/** The signed-in frame. Renders its route's page, or `children` when used directly (the dashboard at "/"). */
export function AppShell({ children }: { children?: ReactNode }) {
  const user = useCurrentUser()
  const { signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-surface px-4 py-2 text-sm font-medium text-plum shadow-raised focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 bg-ink text-white shadow-sm shadow-ink/20">
        <div className="page-container flex h-16 items-center justify-between">
          <Link to="/" className="rounded-control" aria-label="SettleUp home">
            <Logo />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-3">
              <Avatar id={user.id} name={user.name} size="sm" />
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-white/60">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                signOut()
                navigate('/', { replace: true })
              }}
              className="inline-flex h-10 items-center gap-2 rounded-control px-3 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
              <span className="sr-only sm:hidden">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="page-container flex-1 py-8 outline-none sm:py-12">
        {children ?? <Outlet />}
      </main>
    </div>
  )
}
