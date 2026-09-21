import clsx from 'clsx'
import { X } from 'lucide-react'
import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react'

type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  /** Usually a DialogForm, or a DialogBody followed by a DialogFooter. */
  children: ReactNode
  size?: 'md' | 'lg'
}

/**
 * Built on the native <dialog> element, which gives focus trapping, Escape to
 * close and an inert background for free. On phones it becomes a bottom sheet.
 *
 * The body scrolls and the footer doesn't, so the main action stays on screen
 * however long the form gets.
 */
export function Dialog({ open, onClose, title, description, children, size = 'md' }: DialogProps) {
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
        'm-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-panel bg-surface p-0 text-stone-900 shadow-float',
        'backdrop:bg-ink/55 backdrop:backdrop-blur-[2px]',
        'sm:m-auto sm:rounded-panel',
        size === 'md' ? 'sm:max-w-md' : 'sm:max-w-2xl',
        'open:animate-pop-in',
      )}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <header className="flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-ink">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mt-1 -mr-2 rounded-control p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  )
}

export function DialogBody({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-2 pb-6">{children}</div>
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="flex shrink-0 flex-col-reverse gap-2 bg-sunken/60 px-6 py-4 sm:flex-row sm:justify-end">
      {children}
    </footer>
  )
}

/** A form laid out as a scrolling body plus a fixed footer, so the submit button is always reachable. */
export function DialogForm({
  onSubmit,
  children,
  footer,
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <form
      noValidate
      onSubmit={(event) => {
        onSubmit(event)
        // On a phone the first problem is often below the fold, and the save
        // button seems to do nothing. Once React has shown the errors, bring
        // the first one into view.
        const form = event.currentTarget
        requestAnimationFrame(() =>
          form.querySelector('[aria-invalid="true"], [role="alert"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
        )
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <DialogBody>{children}</DialogBody>
      <DialogFooter>{footer}</DialogFooter>
    </form>
  )
}
