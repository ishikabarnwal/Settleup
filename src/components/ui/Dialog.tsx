import clsx from 'clsx'
import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
}

/**
 * Built on the native <dialog> element, which gives focus trapping, Escape to
 * close and an inert background for free. On phones it becomes a bottom sheet.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === event.currentTarget) onClose()
      }}
      className={clsx(
        'm-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-2xl bg-white p-0 text-stone-900 shadow-2xl',
        'backdrop:bg-ink/55 backdrop:backdrop-blur-[2px]',
        'sm:m-auto sm:rounded-2xl',
        size === 'md' ? 'sm:max-w-md' : 'sm:max-w-2xl',
        'open:animate-pop-in',
      )}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-ink">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-sm text-stone-500">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-1 rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </header>
          <div className="overflow-y-auto px-5 py-5">{children}</div>
          {footer && (
            <footer className="flex flex-col-reverse gap-2 border-t border-stone-200 bg-stone-50 px-5 py-3.5 sm:flex-row sm:justify-end">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  )
}
