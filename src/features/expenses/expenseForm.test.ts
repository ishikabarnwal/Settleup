import { describe, expect, it } from 'vitest'
import { checkExpense, emptyForm, type ExpenseForm } from './expenseForm'

const members = [1, 2, 3]
const form = (overrides: Partial<ExpenseForm>): ExpenseForm => ({
  ...emptyForm(members, 1),
  description: 'Dinner',
  amount: '100',
  ...overrides,
})

describe('the basics', () => {
  it('needs a description, a positive total and a payer', () => {
    const { errors, request } = checkExpense(form({ description: '  ', amount: '0', paidBy: null }), members)
    expect(errors.description).toBe('Say what this was for')
    expect(errors.amount).toBe('The total has to be more than zero')
    expect(errors.paidBy).toBe('Choose who paid')
    expect(request).toBeUndefined()
  })

  it('rejects totals the backend would reject', () => {
    expect(checkExpense(form({ amount: '10.001' }), members).errors.amount).toMatch(/two decimals/)
    expect(checkExpense(form({ amount: 'abc' }), members).errors.amount).toMatch(/two decimals/)
    expect(checkExpense(form({ description: 'x'.repeat(201) }), members).errors.description).toMatch(/200/)
  })

  it('ignores a payer who is not in the group', () => {
    expect(checkExpense(form({ paidBy: 99 }), members).errors.paidBy).toBe('Choose who paid')
  })
})

describe('equal splits', () => {
  it('previews the same rounding as the backend and sends who is in', () => {
    const { request, preview, errors } = checkExpense(form({ included: [3, 1, 2] }), members)
    expect(errors).toEqual({})
    expect([...preview]).toEqual([
      [1, 3334],
      [2, 3333],
      [3, 3333],
    ])
    expect(request).toEqual({ description: 'Dinner', amount: 100, paidBy: 1, splitType: 'EQUAL', participantIds: [1, 2, 3] })
  })

  it('needs at least one person', () => {
    expect(checkExpense(form({ included: [] }), members).errors.split).toBe('Pick at least one person to split with')
  })
})

describe('exact splits', () => {
  it('sends the amounts entered, leaving out blanks and zeros', () => {
    const { request, errors } = checkExpense(
      form({ splitType: 'EXACT', amount: '250', exact: { 1: '100', 2: '150.00', 3: '0' } }),
      members,
    )
    expect(errors).toEqual({})
    expect(request?.shares).toEqual([
      { userId: 1, amount: 100 },
      { userId: 2, amount: 150 },
    ])
    expect(request?.participantIds).toBeUndefined()
  })

  it('says how far off the amounts are', () => {
    const short = checkExpense(form({ splitType: 'EXACT', amount: '250', exact: { 1: '100', 2: '100' } }), members)
    expect(short.errors.split).toBe('Amounts add up to ₹200.00, ₹50.00 short')
    expect(short.assigned).toBe(20000)

    const over = checkExpense(form({ splitType: 'EXACT', amount: '250', exact: { 1: '200', 2: '100' } }), members)
    expect(over.errors.split).toBe('Amounts add up to ₹300.00, ₹50.00 over')
  })

  it('flags a badly typed amount on its own row', () => {
    const { errors } = checkExpense(form({ splitType: 'EXACT', exact: { 1: '50.555', 2: '50' } }), members)
    expect(errors.rows).toEqual({ 1: 'Up to two decimals' })
  })
})

describe('percentage splits', () => {
  it('matches the backend on 33.33 / 33.33 / 33.34 of 10.00', () => {
    const { request, preview, errors } = checkExpense(
      form({ splitType: 'PERCENTAGE', amount: '10', percent: { 1: '33.33', 2: '33.33', 3: '33.34' } }),
      members,
    )
    expect(errors).toEqual({})
    expect([...preview]).toEqual([
      [1, 334],
      [2, 333],
      [3, 333],
    ])
    expect(request?.percentages).toEqual([
      { userId: 1, percent: 33.33 },
      { userId: 2, percent: 33.33 },
      { userId: 3, percent: 33.34 },
    ])
  })

  it('has to make exactly 100', () => {
    const { errors } = checkExpense(form({ splitType: 'PERCENTAGE', percent: { 1: '60', 2: '30' } }), members)
    expect(errors.split).toBe('Percentages add up to 90%, they need to make 100%')
  })

  it('rejects a single percentage over 100 or with too many decimals', () => {
    const { errors } = checkExpense(form({ splitType: 'PERCENTAGE', percent: { 1: '120', 2: '33.333' } }), members)
    expect(errors.rows).toEqual({ 1: "Can't be more than 100%", 2: 'Up to two decimals' })
  })
})
