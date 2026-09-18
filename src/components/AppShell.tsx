import { LogOut } from 'lucide-react'
import { Link, Outlet } from 'react-router'
import { useCurrentUser, useAuth } from '../lib/auth'
import { Logo } from './Logo'
import { Avatar } from './ui/Avatar'

export function AppShell() {
  const user = useCurrentUser()
  const { signOut } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-white px-3 py-2 text-sm font-medium text-ink shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 bg-ink text-white shadow-sm shadow-ink/20">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="rounded-lg" aria-label="SettleUp home">
            <Logo />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2.5">
              <Avatar id={user.id} name={user.name} size="sm" />
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-white/60">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
              <span className="sr-only sm:hidden">Sign out</span>
            </button>
          </div>
        </div>
        {/* A thin line of the gradient under the nav ties the dark bar to the brand. */}
        <div aria-hidden className="h-0.5 bg-brand-sweep" />
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 outline-none sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
