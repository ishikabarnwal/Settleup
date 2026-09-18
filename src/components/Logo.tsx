import clsx from 'clsx'

/** The split-coin mark from the favicon, plus the wordmark. */
export function Logo({ tone = 'light', className }: { tone?: 'light' | 'dark'; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <LogoMark className="size-8" />
      <span className={clsx('text-lg font-semibold tracking-tight', tone === 'light' ? 'text-white' : 'text-ink')}>
        SettleUp
      </span>
    </span>
  )
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="logo-sweep" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-plum)" />
          <stop offset="0.55" stopColor="var(--color-rose)" />
          <stop offset="1" stopColor="var(--color-apricot)" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-sweep)" />
      <path d="M30 17a15 15 0 0 0 0 30z" fill="#fff" />
      <path d="M34 17a15 15 0 0 1 0 30z" fill="#fff" fillOpacity="0.72" />
    </svg>
  )
}
