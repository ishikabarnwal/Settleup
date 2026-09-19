import clsx from 'clsx'
import type { ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon: ReactNode
  title: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center rounded-card bg-sunken/50 px-6 py-12 text-center ring-1 ring-stone-200 ring-inset',
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-control bg-surface text-plum shadow-card">{icon}</div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {children && <p className="mt-2 max-w-sm text-sm text-stone-500">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
