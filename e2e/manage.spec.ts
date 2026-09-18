import { expect, test, type Page } from '@playwright/test'
import {
  addExpenseViaApi,
  addMemberViaApi,
  createGroupViaApi,
  getViaApi,
  registerViaApi,
  removeMemberViaApi,
  settleViaApi,
  useSession,
} from './helpers'

/** Ishika owns a group with Riya in it. */
async function twoPersonGroup(page: Page) {
  const ishika = await registerViaApi(page, 'Ishika')
  const riya = await registerViaApi(page, 'Riya')
  const group = await createGroupViaApi(page, ishika, 'Goa trip')
  await addMemberViaApi(page, ishika, group.id, riya)
  return { ishika, riya, group }
}

const expensesList = (page: Page) => page.getByRole('list', { name: 'Expenses' })

test.describe('deleting an expense', () => {
  test('asks first, then removes it and the balances move', async ({ page }) => {
    const { ishika, riya, group } = await twoPersonGroup(page)
    await addExpenseViaApi(page, ishika, group.id, { description: 'Villa', amount: 900, paidBy: ishika.user.id, splitType: 'EQUAL' })
    await addExpenseViaApi(page, ishika, group.id, { description: 'Snacks', amount: 100, paidBy: ishika.user.id, splitType: 'EQUAL' })
    await useSession(page, riya)
    await page.goto(`/groups/${group.id}`)
    await expect(page.getByText('You owe ₹500.00')).toBeVisible()

    const villa = expensesList(page).getByRole('listitem').filter({ hasText: 'Villa' })
    await villa.getByText('Villa').click()
    await villa.getByRole('button', { name: 'Delete expense' }).click()

    const dialog = page.getByRole('dialog', { name: 'Delete this expense?' })
    await expect(dialog).toContainText('Villa')
    await expect(dialog).toContainText('₹900.00')

    // Changing your mind leaves it alone.
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toBeHidden()
    await expect(villa).toBeVisible()

    await villa.getByRole('button', { name: 'Delete expense' }).click()
    await dialog.getByRole('button', { name: 'Delete expense' }).click()

    await expect(dialog).toBeHidden()
    await expect(page.getByText('Deleted Villa')).toBeVisible()
    await expect(villa).toHaveCount(0)
    await expect(expensesList(page).getByRole('listitem')).toHaveCount(1)
    await expect(page.getByText('You owe ₹50.00')).toBeVisible()

    await page.getByRole('tab', { name: 'Balances' }).click()
    const rows = page.getByRole('list', { name: 'Balances' }).getByRole('listitem')
    await expect(rows.nth(0)).toContainText('gets back ₹50.00')
    await expect(rows.nth(1)).toContainText('owes ₹50.00')

    const remaining = await (await getViaApi(page, ishika, `/api/groups/${group.id}/expenses`)).json()
    expect(remaining.map((e: { description: string }) => e.description)).toEqual(['Snacks'])
  })

  test("shows the backend's reason when it can't be deleted", async ({ page }) => {
    const { ishika, riya, group } = await twoPersonGroup(page)
    await addExpenseViaApi(page, ishika, group.id, { description: 'Dinner', amount: 100, paidBy: ishika.user.id, splitType: 'EQUAL' })
    await settleViaApi(page, riya, group.id, { paidBy: riya.user.id, paidTo: ishika.user.id, amount: 50 })
    await removeMemberViaApi(page, ishika, group.id, riya)
    await useSession(page, ishika)
    await page.goto(`/groups/${group.id}`)

    const dinner = expensesList(page).getByRole('listitem').filter({ hasText: 'Dinner' })
    await dinner.getByText('Dinner').click()
    await dinner.getByRole('button', { name: 'Delete expense' }).click()
    const dialog = page.getByRole('dialog', { name: 'Delete this expense?' })
    await dialog.getByRole('button', { name: 'Delete expense' }).click()

    await expect(dialog.getByRole('alert')).toHaveText('This expense can\'t be deleted because Riya is no longer in the group')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dinner).toBeVisible()
  })
})

test.describe('deleting a payment', () => {
  test('asks first, then puts the debt back', async ({ page }) => {
    const { ishika, riya, group } = await twoPersonGroup(page)
    await addExpenseViaApi(page, ishika, group.id, { description: 'Villa', amount: 900, paidBy: ishika.user.id, splitType: 'EQUAL' })
    await settleViaApi(page, riya, group.id, { paidBy: riya.user.id, paidTo: ishika.user.id, amount: 450, note: 'UPI' })
    await useSession(page, ishika)
    await page.goto(`/groups/${group.id}?tab=settle`)

    await expect(page.getByRole('heading', { name: 'All settled up' })).toBeVisible()
    const history = page.getByRole('list', { name: 'Payment history' }).getByRole('listitem')
    await expect(history).toHaveCount(1)

    await history.first().getByRole('button', { name: 'Delete payment from Riya to You' }).click()
    const dialog = page.getByRole('dialog', { name: 'Delete this payment?' })
    await expect(dialog).toContainText('Riya → You, ₹450.00')

    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(history).toHaveCount(1)

    await history.first().getByRole('button', { name: /Delete payment/ }).click()
    await dialog.getByRole('button', { name: 'Delete payment' }).click()

    await expect(dialog).toBeHidden()
    await expect(page.getByText('Payment deleted')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'No payments yet' })).toBeVisible()

    // The 450 Riya paid is owed again, so it's suggested again and shows in the balance.
    const suggested = page.getByRole('list', { name: 'Suggested payments' }).getByRole('listitem')
    await expect(suggested).toHaveCount(1)
    await expect(suggested.first()).toContainText('₹450.00')
    await expect(page.getByText("You're owed ₹450.00")).toBeVisible()

    const left = await (await getViaApi(page, ishika, `/api/groups/${group.id}/settlements`)).json()
    expect(left).toHaveLength(0)
  })

  test("shows the backend's reason when it can't be deleted", async ({ page }) => {
    const { ishika, riya, group } = await twoPersonGroup(page)
    await addExpenseViaApi(page, ishika, group.id, { description: 'Dinner', amount: 100, paidBy: ishika.user.id, splitType: 'EQUAL' })
    await settleViaApi(page, riya, group.id, { paidBy: riya.user.id, paidTo: ishika.user.id, amount: 50 })
    await removeMemberViaApi(page, ishika, group.id, riya)
    await useSession(page, ishika)
    await page.goto(`/groups/${group.id}?tab=settle`)

    await page.getByRole('button', { name: /Delete payment/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Delete this payment?' })
    await dialog.getByRole('button', { name: 'Delete payment' }).click()

    await expect(dialog.getByRole('alert')).toHaveText("This settlement can't be deleted because Riya is no longer in the group")
    await expect(dialog).toBeVisible()
  })
})
