import clsx from 'clsx'
import { ChevronDown, Plus, Receipt, Trash2 } from 'lucide-react'
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
import { useDeleteExpense } from '../../lib/queries'
import type { Expense, SplitType } from '../../lib/types'

const splitLabel: Record<SplitType, string> = {
  EQUAL: 'split equally',
  EXACT: 'split by amount',
  PERCENTAGE: 'split by percentage',
}

const dayFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric' })
const monthFormat = new Intl.DateTimeFormat('en-IN', { month: 'short' })

export function ExpenseList({ groupId, expenses, onAdd }: { groupId: number; expenses: Expense[]; onAdd: () => void }) {
  const [deleting, setDeleting] = useState<Expense | null>(null)

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="size-6" />}
        title="No expenses yet"
        action={
          <Button icon={<Plus className="size-4" />} onClick={onAdd}>
            Add the first expense
          </Button>
        }
      >
        Add what someone paid for and SettleUp works out who owes what.
      </EmptyState>
    )
  }

  // The backend already returns these newest first.
  return (
    <>
      <ul className="space-y-3" aria-label="Expenses">
        {expenses.map((expense) => (
          <ExpenseItem key={expense.id} expense={expense} onDelete={() => setDeleting(expense)} />
        ))}
      </ul>
      <DeleteExpenseDialog groupId={groupId} expense={deleting} onClose={() => setDeleting(null)} />
    </>
  )
}

function DeleteExpenseDialog({
  groupId,
  expense,
  onClose,
}: {
  groupId: number
  expense: Expense | null
  onClose: () => void
}) {
  const deleteExpense = useDeleteExpense(groupId)
  const close = () => {
    deleteExpense.reset()
    onClose()
  }

  return (
    <ConfirmDialog
      open={expense !== null}
      title="Delete this expense?"
      confirmLabel="Delete expense"
      pending={deleteExpense.isPending}
      error={deleteExpense.isError ? errorMessage(deleteExpense.error) : null}
      onClose={close}
      onConfirm={() =>
        expense &&
        deleteExpense.mutate(expense.id, {
          onSuccess: () => {
            toast.success(`Deleted ${expense.description}`)
            close()
          },
        })
      }
    >
      {expense && (
        <p>
          <span className="font-medium text-stone-900">{expense.description}</span> ({formatPaise(toPaise(expense.amount))})
          will be removed for everyone in the group, and balances will be worked out again without it. This can't be
          undone.
        </p>
      )}
    </ConfirmDialog>
  )
}

function ExpenseItem({ expense, onDelete }: { expense: Expense; onDelete: () => void }) {
  const me = useCurrentUser()
  const date = new Date(expense.createdAt)
  const paidByMe = expense.paidBy.id === me.id
  const myShare = toPaise(expense.shares.find((s) => s.user.id === me.id)?.amount ?? 0)
  const total = toPaise(expense.amount)

  // How this expense moves your balance, the way people actually think about it.
  const effect = paidByMe
    ? total - myShare > 0
      ? { text: 'you lent', amount: total - myShare, tone: 'text-owed' }
      : null
    : myShare > 0
      ? { text: 'you borrowed', amount: myShare, tone: 'text-owes' }
      : null

  return (
    <li>
      <details className="group rounded-card bg-surface shadow-card transition open:shadow-raised">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6 [&::-webkit-details-marker]:hidden">
          <time
            dateTime={expense.createdAt}
            title={formatDateTime(expense.createdAt)}
            className="hidden w-12 shrink-0 flex-col items-center rounded-control bg-sunken py-1 leading-tight sm:flex"
          >
            <span className="text-[11px] font-medium text-stone-500 uppercase">{monthFormat.format(date)}</span>
            <span className="text-base font-semibold text-ink">{dayFormat.format(date)}</span>
          </time>

          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 font-medium break-words text-stone-900">{expense.description}</p>
            <p className="truncate text-xs text-stone-500">
              {/* On phones the date tile is hidden to leave room for the name, so the date goes here. */}
              <span className="sm:hidden">
                {dayFormat.format(date)} {monthFormat.format(date)} ·{' '}
              </span>
              {paidByMe ? 'You' : expense.paidBy.name} paid · {splitLabel[expense.splitType]}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="font-semibold text-ink tabular-nums">{formatPaise(total)}</p>
            <p className={clsx('text-xs tabular-nums', effect ? effect.tone : 'text-stone-400')}>
              {effect ? `${effect.text} ${formatPaise(effect.amount)}` : 'not involved'}
            </p>
          </div>

          <ChevronDown aria-hidden className="size-4 shrink-0 text-stone-400 transition group-open:rotate-180" />
        </summary>

        <div className="border-t border-stone-100 px-4 py-4 sm:px-6">
          <p className="mb-3 text-xs font-medium tracking-wide text-stone-500 uppercase">Shares</p>
          <ul className="space-y-2">
            {expense.shares.map((share) => (
              <li key={share.user.id} className="flex items-center gap-3 text-sm">
                <Avatar id={share.user.id} name={share.user.name} size="sm" />
                <span className="flex-1 truncate">
                  {share.user.name}
                  {share.user.id === me.id && <span className="text-stone-500"> (you)</span>}
                </span>
                <span className="text-stone-700 tabular-nums">{formatPaise(toPaise(share.amount))}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end border-t border-stone-100 pt-4">
            <Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} onClick={onDelete}>
              Delete expense
            </Button>
          </div>
        </div>
      </details>
    </li>
  )
}
