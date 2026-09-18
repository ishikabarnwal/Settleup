import { ArrowRight, CircleCheck, History, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { errorMessage } from '../../lib/api'
import { useCurrentUser } from '../../lib/auth'
import { formatDateTime } from '../../lib/dates'
import { formatPaise, toPaise } from '../../lib/money'
import { useDeleteSettlement } from '../../lib/queries'
import type { Settlement, SuggestedPayment, User } from '../../lib/types'
import type { PaymentDraft } from './RecordPaymentDialog'

export function SettleUpPanel({
  groupId,
  suggested,
  history,
  onRecord,
}: {
  groupId: number
  suggested: SuggestedPayment[]
  history: Settlement[]
  onRecord: (draft: PaymentDraft) => void
}) {
  const me = useCurrentUser()
  const [deleting, setDeleting] = useState<Settlement | null>(null)
  const name = (user: User) => (user.id === me.id ? 'You' : user.name)

  return (
    <div className="space-y-8">
      <section aria-labelledby="suggested-heading">
        <div className="mb-3">
          <h2 id="suggested-heading" className="font-semibold text-ink">
            Suggested payments
          </h2>
          <p className="text-sm text-stone-500">The fewest payments that would square everyone up.</p>
        </div>

        {suggested.length === 0 ? (
          <EmptyState icon={<CircleCheck className="size-6" />} title="All settled up" className="py-8">
            Nobody owes anybody in this group right now.
          </EmptyState>
        ) : (
          <ul className="space-y-2.5" aria-label="Suggested payments">
            {suggested.map((payment) => (
              <li
                key={`${payment.from.id}-${payment.to.id}`}
                className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 sm:flex-row sm:items-center"
              >
                <PaymentPeople from={payment.from} to={payment.to} amount={toPaise(payment.amount)} />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onRecord({ paidBy: payment.from.id, paidTo: payment.to.id, amount: payment.amount })}
                >
                  Record payment
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-3 font-semibold text-ink">
          Payment history
        </h2>

        {history.length === 0 ? (
          <EmptyState icon={<History className="size-6" />} title="No payments yet" className="py-8">
            Payments you record between members show up here.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white" aria-label="Payment history">
            {history.map((payment) => (
              <li key={payment.id} className="flex items-center gap-2 px-4 py-3 sm:gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                  <PaymentPeople from={payment.paidBy} to={payment.paidTo} amount={toPaise(payment.amount)} />
                  <div className="text-xs text-stone-500 sm:text-right">
                    <time dateTime={payment.settledAt}>{formatDateTime(payment.settledAt)}</time>
                    {payment.note && <p className="text-stone-600">“{payment.note}”</p>}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="px-2 text-stone-500 hover:text-rose"
                  icon={<Trash2 className="size-4" />}
                  aria-label={`Delete payment from ${name(payment.paidBy)} to ${name(payment.paidTo)}`}
                  title="Delete payment"
                  onClick={() => setDeleting(payment)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <DeleteSettlementDialog groupId={groupId} settlement={deleting} name={name} onClose={() => setDeleting(null)} />
    </div>
  )
}

function DeleteSettlementDialog({
  groupId,
  settlement,
  name,
  onClose,
}: {
  groupId: number
  settlement: Settlement | null
  name: (user: User) => string
  onClose: () => void
}) {
  const deleteSettlement = useDeleteSettlement(groupId)
  const close = () => {
    deleteSettlement.reset()
    onClose()
  }

  return (
    <ConfirmDialog
      open={settlement !== null}
      title="Delete this payment?"
      confirmLabel="Delete payment"
      pending={deleteSettlement.isPending}
      error={deleteSettlement.isError ? errorMessage(deleteSettlement.error) : null}
      onClose={close}
      onConfirm={() =>
        settlement &&
        deleteSettlement.mutate(settlement.id, {
          onSuccess: () => {
            toast.success('Payment deleted')
            close()
          },
        })
      }
    >
      {settlement && (
        <p>
          <span className="font-medium text-stone-900">
            {name(settlement.paidBy)} → {name(settlement.paidTo)}, {formatPaise(toPaise(settlement.amount))}
          </span>{' '}
          will be taken off the record, so whatever it paid off is owed again. This can't be undone.
        </p>
      )}
    </ConfirmDialog>
  )
}

function PaymentPeople({ from, to, amount }: { from: User; to: User; amount: number }) {
  const me = useCurrentUser()
  const name = (user: User) => (user.id === me.id ? 'You' : user.name)

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <div className="flex -space-x-1.5">
        <Avatar id={from.id} name={from.name} size="sm" className="ring-2 ring-white" />
        <Avatar id={to.id} name={to.name} size="sm" className="ring-2 ring-white" />
      </div>
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-medium">{name(from)}</span>
        <ArrowRight aria-hidden className="mx-1.5 inline size-3.5 text-stone-400" />
        <span className="sr-only"> pays </span>
        <span className="font-medium">{name(to)}</span>
      </p>
      <span className="font-semibold text-ink tabular-nums">{formatPaise(amount)}</span>
    </div>
  )
}
