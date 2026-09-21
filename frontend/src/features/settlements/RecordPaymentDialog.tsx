import { ArrowRight } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Dialog, DialogForm } from '../../components/ui/Dialog'
import { Field, FormError, Input, Select } from '../../components/ui/Field'
import { ApiError, errorMessage } from '../../lib/api'
import { useCurrentUser } from '../../lib/auth'
import { newIdempotencyKey } from '../../lib/idempotency'
import { formatPaise, parseAmount } from '../../lib/money'
import { useRecordSettlement } from '../../lib/queries'
import type { GroupMember } from '../../lib/types'

export type PaymentDraft = { paidBy?: number; paidTo?: number; amount?: number }

export function RecordPaymentDialog({
  groupId,
  members,
  draft,
  onClose,
}: {
  groupId: number
  members: GroupMember[]
  /** Open with these values filled in; null keeps the dialog closed. */
  draft: PaymentDraft | null
  onClose: () => void
}) {
  return (
    <Dialog
      open={draft !== null}
      onClose={onClose}
      title="Record a payment"
      description="Money that changed hands outside the app, like a UPI transfer or cash."
    >
      {draft && <PaymentForm groupId={groupId} members={members} draft={draft} onDone={onClose} />}
    </Dialog>
  )
}

type Errors = { paidBy?: string; paidTo?: string; amount?: string; note?: string }

function PaymentForm({
  groupId,
  members,
  draft,
  onDone,
}: {
  groupId: number
  members: GroupMember[]
  draft: PaymentDraft
  onDone: () => void
}) {
  const me = useCurrentUser()
  const [paidBy, setPaidBy] = useState<number | ''>(draft.paidBy ?? me.id)
  const [paidTo, setPaidTo] = useState<number | ''>(draft.paidTo ?? '')
  const [amount, setAmount] = useState(draft.amount !== undefined ? draft.amount.toFixed(2) : '')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey)
  const record = useRecordSettlement(groupId)

  const nameOf = (id: number) => {
    const member = members.find((m) => m.id === id)
    return member ? (member.id === me.id ? `${member.name} (you)` : member.name) : 'Someone'
  }

  // Same rules as the backend's CreateSettlementRequest.
  const validate = (): Errors => {
    const found: Errors = {}
    const paise = parseAmount(amount)
    if (paidBy === '') found.paidBy = 'Choose who paid'
    if (paidTo === '') found.paidTo = 'Choose who got paid'
    else if (paidTo === paidBy) found.paidTo = 'Pick someone other than the payer'
    if (!amount.trim()) found.amount = 'Enter the amount'
    else if (paise === null) found.amount = 'Use a number with at most two decimals'
    else if (paise <= 0) found.amount = 'The amount has to be more than zero'
    if (note.trim().length > 200) found.note = 'Keep the note under 200 characters'
    return found
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    setServerError(null)
    if (Object.keys(found).length > 0 || paidBy === '' || paidTo === '') return

    const paise = parseAmount(amount) as number
    record.mutate(
      {
        body: { paidBy, paidTo, amount: paise / 100, note: note.trim() || undefined },
        idempotencyKey,
      },
      {
        onSuccess: () => {
          toast.success('Payment recorded', {
            description: `${nameOf(paidBy)} paid ${nameOf(paidTo)} ${formatPaise(paise)}`,
          })
          setIdempotencyKey(newIdempotencyKey())
          onDone()
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            toast.info('That payment was already recorded')
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
          <Button type="submit" loading={record.isPending}>
            Record payment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={serverError} />

        <div className="grid items-start gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <Field label="From" error={errors.paidBy}>
            {(a11y) => (
              <Select {...a11y} value={paidBy} onChange={(e) => setPaidBy(e.target.value ? Number(e.target.value) : '')}>
                <option value="" disabled>
                  Who paid
                </option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {nameOf(m.id)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <ArrowRight aria-hidden className="mx-auto hidden size-4 text-stone-400 sm:mt-9 sm:block" />
          <Field label="To" error={errors.paidTo}>
            {(a11y) => (
              <Select {...a11y} value={paidTo} onChange={(e) => setPaidTo(e.target.value ? Number(e.target.value) : '')}>
                <option value="" disabled>
                  Who got paid
                </option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {nameOf(m.id)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field label="Amount" error={errors.amount}>
          {(a11y) => (
            <Input
              {...a11y}
              inputMode="decimal"
              prefix="₹"
              placeholder="0.00"
              value={amount}
              autoFocus={draft.amount === undefined}
              onChange={(e) => setAmount(e.target.value)}
            />
          )}
        </Field>

        <Field label="Note (optional)" error={errors.note}>
          {(a11y) => (
            <Input {...a11y} placeholder="UPI, cash…" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
          )}
        </Field>
      </div>
    </DialogForm>
  )
}
