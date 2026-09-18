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
        'flex flex-col items-center rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center',
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-blush/45 text-wine">{icon}</div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {children && <p className="mt-1.5 max-w-sm text-sm text-stone-500">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
