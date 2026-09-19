import clsx from 'clsx'
import { Menu, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Logo } from './Logo'

/**
 * The floating navigation used everywhere: a pill of frosted ink that sits
 * a little below the top of the window, inside the page margins rather than
 * running edge to edge. It stays put while the page scrolls under it.
 *
 * `fixed` is for pages whose first section should run up underneath it (the
 * landing hero); elsewhere it takes up its own space at the top.
 */
export function NavPill({
  center,
  right,
  menu,
  fixed = false,
}: {
  center?: ReactNode
  right: ReactNode
  /** Links that fold into a menu button on small screens. */
  menu?: { label: string; content: (close: () => void) => ReactNode }
  fixed?: boolean
}) {
  return (
    // Fixed, it floats over an inset hero panel, so it drops a little further to sit inside it.
    <header className={clsx('pointer-events-none top-0 z-40', fixed ? 'fixed inset-x-0 pt-7' : 'sticky pt-4')}>
      <div className="page-container">
        <div className="pointer-events-auto relative flex h-14 items-center justify-between gap-2 rounded-full bg-ink/92 py-2 pr-2 pl-5 text-white shadow-float ring-1 ring-white/10 backdrop-blur-xl backdrop-saturate-150">
          <Link to="/" className="shrink-0 rounded-full" aria-label="SettleUp home">
            <Logo />
          </Link>

          {center && <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">{center}</div>}

          <div className="flex items-center gap-1 sm:gap-2">
            {right}
            {menu && <MobileMenu label={menu.label}>{menu.content}</MobileMenu>}
          </div>
        </div>
      </div>
    </header>
  )
}

function MobileMenu({ label, children }: { label: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const wrapper = useRef<HTMLDivElement>(null)
  const close = () => setOpen(false)

  // Escape or a tap anywhere else closes it, like any other menu.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    const onPointer = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    <div ref={wrapper} className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex size-10 items-center justify-center rounded-full text-white/85 transition hover:bg-white/10 hover:text-white"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
        <span className="sr-only">{open ? `Close ${label.toLowerCase()}` : label}</span>
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute inset-x-0 top-full mt-2 animate-pop-in rounded-panel bg-ink p-2 text-white shadow-float ring-1 ring-white/10"
        >
          {children(close)}
        </div>
      )}
    </div>
  )
}
