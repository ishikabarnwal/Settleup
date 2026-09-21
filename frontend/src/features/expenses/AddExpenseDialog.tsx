import clsx from 'clsx'
import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Dialog, DialogForm } from '../../components/ui/Dialog'
import { Field, FormError, Input, Select } from '../../components/ui/Field'
import { Segmented } from '../../components/ui/Segmented'
import { ApiError, errorMessage } from '../../lib/api'
import { useCurrentUser } from '../../lib/auth'
import { newIdempotencyKey } from '../../lib/idempotency'
import { FULL_PERCENT, formatPaise, parseAmount } from '../../lib/money'
import { useCreateExpense } from '../../lib/queries'
import type { GroupMember, SplitType } from '../../lib/types'
import { checkExpense, emptyForm, formatPercent, type ExpenseForm } from './expenseForm'

const splitOptions: { value: SplitType; label: string }[] = [
  { value: 'EQUAL', label: 'Equally' },
  { value: 'EXACT', label: 'By amount' },
  { value: 'PERCENTAGE', label: 'By %' },
]

export function AddExpenseDialog({
  groupId,
  members,
  open,
  onClose,
}: {
  groupId: number
  members: GroupMember[]
  open: boolean
  onClose: () => void
}) {
  // Remount the form each time it opens so it always starts clean.
  return (
    <Dialog open={open} onClose={onClose} title="Add an expense" size="lg">
      {open && <ExpenseFormBody groupId={groupId} members={members} onDone={onClose} />}
    </Dialog>
  )
}

function ExpenseFormBody({ groupId, members, onDone }: { groupId: number; members: GroupMember[]; onDone: () => void }) {
  const me = useCurrentUser()
  const memberIds = useMemo(() => members.map((m) => m.id), [members])
  const [form, setForm] = useState<ExpenseForm>(() => emptyForm(memberIds, memberIds.includes(me.id) ? me.id : null))
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey)
  const createExpense = useCreateExpense(groupId)

  const check = checkExpense(form, memberIds)
  // Only nag once they've tried to save; before that, show the preview quietly.
  const errors = submitted ? check.errors : {}
  const total = parseAmount(form.amount)

  const update = (patch: Partial<ExpenseForm>) => {
    setForm((current) => ({ ...current, ...patch }))
    setServerError(null)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (!check.request) return

    createExpense.mutate(
      { body: check.request, idempotencyKey },
      {
        onSuccess: (expense) => {
          toast.success(`Added ${expense.description}`, { description: formatPaise(Math.round(expense.amount * 100)) })
          setIdempotencyKey(newIdempotencyKey())
          onDone()
        },
        onError: (error) => {
          // 409 here means this key already created an expense (the first try
          // got through but its response was lost). Refreshing shows it.
          if (error instanceof ApiError && error.status === 409) {
            toast.info('That expense was already saved')
            onDone()
            return
          }
          setServerError(errorMessage(error))
        },
      },
    )
  }

  return (
    <DialogForm
      onSubmit={submit}
      footer={
        <>
          <Button variant="secondary" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={createExpense.isPending}>
            Add expense
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <FormError message={serverError} />

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
          <Field label="Description" error={errors.description}>
            {(a11y) => (
              <Input
                {...a11y}
                autoFocus
                placeholder="Dinner at Thalassa"
                value={form.description}
                maxLength={200}
                onChange={(e) => update({ description: e.target.value })}
              />
            )}
          </Field>
          <Field label="Total" error={errors.amount}>
            {(a11y) => (
              <Input
                {...a11y}
                inputMode="decimal"
                prefix="₹"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => update({ amount: e.target.value })}
              />
            )}
          </Field>
        </div>

        <Field label="Paid by" error={errors.paidBy}>
          {(a11y) => (
            <Select
              {...a11y}
              value={form.paidBy ?? ''}
              onChange={(e) => update({ paidBy: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="" disabled>
                Choose who paid
              </option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.id === me.id ? `${member.name} (you)` : member.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <fieldset className="space-y-3">
          <legend className="mb-1.5 text-sm font-medium text-stone-700">Split</legend>
          <Segmented label="How to split" options={splitOptions} value={form.splitType} onChange={(splitType) => update({ splitType })} />

          <ul className="divide-y divide-stone-100 rounded-control bg-canvas/50 ring-1 ring-stone-200 ring-inset">
            {members.map((member) => (
              <SplitRow
                key={member.id}
                member={member}
                isMe={member.id === me.id}
                form={form}
                share={check.preview.get(member.id)}
                error={errors.rows?.[member.id]}
                total={total}
                onChange={update}
              />
            ))}
          </ul>

          <SplitSummary form={form} total={total} assigned={check.assigned} includedCount={form.included.length} />
          {errors.split && (
            <p role="alert" className="text-sm text-rose">
              {errors.split}
            </p>
          )}
        </fieldset>
      </div>
    </DialogForm>
  )
}

function SplitRow({
  member,
  isMe,
  form,
  share,
  error,
  total,
  onChange,
}: {
  member: GroupMember
  isMe: boolean
  form: ExpenseForm
  share: number | undefined
  error: string | undefined
  total: number | null
  onChange: (patch: Partial<ExpenseForm>) => void
}) {
  const name = isMe ? `${member.name} (you)` : member.name
  const included = form.included.includes(member.id)

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      {form.splitType === 'EQUAL' ? (
        <label className="flex flex-1 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={included}
            onChange={(e) =>
              onChange({
                included: e.target.checked
                  ? [...form.included, member.id]
                  : form.included.filter((id) => id !== member.id),
              })
            }
            className="size-4 rounded border-stone-300 accent-plum"
          />
          <Avatar id={member.id} name={member.name} size="sm" />
          <span className={clsx('flex-1 truncate text-sm', !included && 'text-stone-400')}>{name}</span>
        </label>
      ) : (
        <>
          <Avatar id={member.id} name={member.name} size="sm" />
          <span className="flex-1 truncate text-sm">{name}</span>
        </>
      )}

      {form.splitType === 'EQUAL' && (
        <span className="w-24 text-right text-sm text-stone-600 tabular-nums">
          {included && share !== undefined ? formatPaise(share) : '—'}
        </span>
      )}

      {form.splitType === 'EXACT' && (
        <div className="w-32">
          <Input
            aria-label={`Amount for ${member.name}`}
            aria-invalid={error ? true : undefined}
            inputMode="decimal"
            prefix="₹"
            placeholder="0.00"
            value={form.exact[member.id] ?? ''}
            onChange={(e) => onChange({ exact: { ...form.exact, [member.id]: e.target.value } })}
            className="h-9 text-right"
          />
          {error && <p className="mt-1 text-right text-xs text-rose">{error}</p>}
        </div>
      )}

      {form.splitType === 'PERCENTAGE' && (
        <div className="flex items-center gap-3">
          <span className="hidden w-20 text-right text-xs text-stone-500 tabular-nums sm:block">
            {share !== undefined && total ? formatPaise(share) : ''}
          </span>
          <div className="w-24">
            <Input
              aria-label={`Percent for ${member.name}`}
              aria-invalid={error ? true : undefined}
              inputMode="decimal"
              suffix="%"
              placeholder="0"
              value={form.percent[member.id] ?? ''}
              onChange={(e) => onChange({ percent: { ...form.percent, [member.id]: e.target.value } })}
              className="h-9 text-right"
            />
            {error && <p className="mt-1 text-right text-xs text-rose">{error}</p>}
          </div>
        </div>
      )}
    </li>
  )
}

/** A running total so people can see how close their numbers are before saving. */
function SplitSummary({
  form,
  total,
  assigned,
  includedCount,
}: {
  form: ExpenseForm
  total: number | null
  assigned: number
  includedCount: number
}) {
  if (form.splitType === 'EQUAL') {
    return (
      <p className="text-sm text-stone-500">
        {includedCount === 0
          ? 'Nobody selected'
          : `Split between ${includedCount} ${includedCount === 1 ? 'person' : 'people'}. Leftover paise go to the first names on the list.`}
      </p>
    )
  }

  if (form.splitType === 'EXACT') {
    const left = total !== null ? total - assigned : null
    return (
      <p className="flex justify-between text-sm text-stone-500 tabular-nums">
        <span>{formatPaise(assigned)} assigned</span>
        {left !== null && (
          <span className={clsx(left === 0 ? 'text-owed' : 'text-stone-700')}>
            {left === 0 ? 'Adds up' : left > 0 ? `${formatPaise(left)} left` : `${formatPaise(-left)} too much`}
          </span>
        )}
      </p>
    )
  }

  const left = FULL_PERCENT - assigned
  return (
    <p className="flex justify-between text-sm text-stone-500 tabular-nums">
      <span>{formatPercent(assigned)} of 100%</span>
      <span className={clsx(left === 0 ? 'text-owed' : 'text-stone-700')}>
        {left === 0 ? 'Adds up' : left > 0 ? `${formatPercent(left)} left` : `${formatPercent(-left)} too much`}
      </span>
    </p>
  )
}
