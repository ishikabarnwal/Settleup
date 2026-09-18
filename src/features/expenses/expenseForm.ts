import { FULL_PERCENT, formatPaise, parseAmount, parsePercent, splitByPercentage, splitEqually } from '../../lib/money'
import type { CreateExpenseRequest, SplitType } from '../../lib/types'

/**
 * Everything the add-expense form knows, and the rules that turn it into a
 * request. Kept free of React so the rules can be tested on their own. They
 * mirror the backend's: a description up to 200 characters, a positive amount
 * with at most two decimals, a payer from the group, and a split that covers
 * the whole amount.
 */
export type ExpenseForm = {
  description: string
  amount: string
  paidBy: number | null
  splitType: SplitType
  /** EQUAL: who's in. */
  included: number[]
  /** EXACT: each person's amount as typed. */
  exact: Record<number, string>
  /** PERCENTAGE: each person's percent as typed. */
  percent: Record<number, string>
}

export type ExpenseFormErrors = {
  description?: string
  amount?: string
  paidBy?: string
  /** A problem with the split as a whole (nobody in it, doesn't add up...). */
  split?: string
  /** Problems with one person's row, by user id. */
  rows?: Record<number, string>
}

export type ExpenseCheck = {
  errors: ExpenseFormErrors
  /** Only set when there are no errors. */
  request?: CreateExpenseRequest
  /** Each person's share in paise, as the backend will store it. Empty until it can be worked out. */
  preview: Map<number, number>
  /** For EXACT and PERCENTAGE: how much has been assigned so far (paise, or hundredths of a percent). */
  assigned: number
}

export function emptyForm(memberIds: number[], paidBy: number | null): ExpenseForm {
  return {
    description: '',
    amount: '',
    paidBy,
    splitType: 'EQUAL',
    included: [...memberIds],
    exact: {},
    percent: {},
  }
}

const toRupees = (paise: number) => paise / 100

export function checkExpense(form: ExpenseForm, memberIds: number[]): ExpenseCheck {
  const errors: ExpenseFormErrors = {}
  const rows: Record<number, string> = {}
  let preview = new Map<number, number>()
  let assigned = 0

  const description = form.description.trim()
  if (!description) errors.description = 'Say what this was for'
  else if (description.length > 200) errors.description = 'Keep it under 200 characters'

  const total = parseAmount(form.amount)
  if (!form.amount.trim()) errors.amount = 'Enter the total'
  else if (total === null) errors.amount = 'Use a number with at most two decimals, like 250 or 99.50'
  else if (total <= 0) errors.amount = 'The total has to be more than zero'

  if (form.paidBy === null || !memberIds.includes(form.paidBy)) errors.paidBy = 'Choose who paid'

  const validTotal = total !== null && total > 0 ? total : null
  let request: Pick<CreateExpenseRequest, 'participantIds' | 'shares' | 'percentages'> = {}

  switch (form.splitType) {
    case 'EQUAL': {
      const ids = memberIds.filter((id) => form.included.includes(id))
      if (ids.length === 0) errors.split = 'Pick at least one person to split with'
      else {
        if (validTotal !== null) preview = splitEqually(validTotal, ids)
        request = { participantIds: ids }
      }
      break
    }

    case 'EXACT': {
      const shares: { userId: number; amount: number }[] = []
      for (const id of memberIds) {
        const raw = (form.exact[id] ?? '').trim()
        if (!raw) continue
        const paise = parseAmount(raw)
        if (paise === null) rows[id] = 'Up to two decimals'
        else if (paise > 0) {
          shares.push({ userId: id, amount: toRupees(paise) })
          preview.set(id, paise)
          assigned += paise
        }
      }

      if (Object.keys(rows).length === 0) {
        if (shares.length === 0) errors.split = "Enter each person's amount"
        else if (validTotal !== null && assigned !== validTotal) {
          const gap = validTotal - assigned
          errors.split = `Amounts add up to ${formatPaise(assigned)}, ${formatPaise(Math.abs(gap))} ${gap > 0 ? 'short' : 'over'}`
        }
      }
      request = { shares }
      break
    }

    case 'PERCENTAGE': {
      const hundredths = new Map<number, number>()
      for (const id of memberIds) {
        const raw = (form.percent[id] ?? '').trim()
        if (!raw) continue
        const value = parsePercent(raw)
        if (value === null) rows[id] = 'Up to two decimals'
        else if (value > FULL_PERCENT) rows[id] = "Can't be more than 100%"
        else if (value > 0) {
          hundredths.set(id, value)
          assigned += value
        }
      }

      if (Object.keys(rows).length === 0) {
        if (hundredths.size === 0) errors.split = "Enter each person's percentage"
        else if (assigned !== FULL_PERCENT) {
          errors.split = `Percentages add up to ${formatPercent(assigned)}, they need to make 100%`
        } else if (validTotal !== null) {
          preview = splitByPercentage(validTotal, hundredths)
        }
      }
      request = {
        percentages: [...hundredths].map(([userId, value]) => ({ userId, percent: value / 100 })),
      }
      break
    }
  }

  if (Object.keys(rows).length > 0) errors.rows = rows

  const valid = Object.keys(errors).length === 0 && validTotal !== null && form.paidBy !== null
  return {
    errors,
    preview,
    assigned,
    request: valid
      ? {
          description,
          amount: toRupees(validTotal),
          paidBy: form.paidBy as number,
          splitType: form.splitType,
          ...request,
        }
      : undefined,
  }
}

export function formatPercent(hundredths: number): string {
  return `${(hundredths / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`
}
