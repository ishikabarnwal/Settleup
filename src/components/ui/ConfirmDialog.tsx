import type { ReactNode } from 'react'
import { Button } from './Button'
import { Dialog, DialogBody, DialogFooter } from './Dialog'
import { FormError } from './Field'

/**
 * "Are you sure?" for anything that can't be undone. If the backend refuses,
 * its message shows here and the dialog stays open, so the reason is never lost.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  pending: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <DialogBody>
        <div className="space-y-4">
          <FormError message={error} />
          <div className="text-sm text-stone-600">{children}</div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" loading={pending} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
