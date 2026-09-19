import { LayoutGrid, LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useCurrentUser, useAuth } from '../lib/auth'
import { NavPill } from './NavPill'
import { navItemClasses } from './ui/buttonStyles'
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
      <NavPill
        center={
          <NavLink to="/" end className={navItemClasses()}>
            <LayoutGrid className="size-4" />
            Your groups
          </NavLink>
        }
        right={
          <>
            <div className="flex items-center gap-3 pr-1 sm:pr-2">
              <Avatar id={user.id} name={user.name} size="sm" />
              <span className="hidden max-w-40 truncate text-sm font-medium lg:inline">{user.name}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                signOut()
                navigate('/', { replace: true })
              }}
              className={navItemClasses('px-3 sm:px-4')}
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
              <span className="sr-only sm:hidden">Sign out</span>
            </button>
          </>
        }
      />

      <main id="main" tabIndex={-1} className="page-container flex-1 pt-8 pb-16 outline-none sm:pt-12">
        {children ?? <Outlet />}
      </main>
    </div>
  )
}
