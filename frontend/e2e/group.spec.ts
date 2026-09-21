import { expect, test, type Page } from '@playwright/test'
import {
  addExpenseViaApi,
  addMemberViaApi,
  createGroupViaApi,
  registerViaApi,
  settleViaApi,
  useSession,
  type TestUser,
} from './helpers'

/** Three people in one group, registered in order so ids go ishika < riya < kabir. */
async function tripWithThree(page: Page) {
  const ishika = await registerViaApi(page, 'Ishika')
  const riya = await registerViaApi(page, 'Riya')
  const kabir = await registerViaApi(page, 'Kabir')
  const group = await createGroupViaApi(page, ishika, 'Goa trip', 'December')
  await addMemberViaApi(page, ishika, group.id, riya)
  await addMemberViaApi(page, ishika, group.id, kabir)
  return { ishika, riya, kabir, group }
}

async function expensesFromApi(page: Page, user: TestUser, groupId: number) {
  const response = await page.request.get(`/api/groups/${groupId}/expenses`, {
    headers: { Authorization: `Bearer ${user.token}` },
  })
  return response.json() as Promise<{ description: string; shares: { user: { id: number }; amount: number }[] }[]>
}

async function openAddExpense(page: Page) {
  await page.getByRole('button', { name: 'Add expense' }).click()
  return page.getByRole('dialog', { name: 'Add an expense' })
}

test('creating a group from the dashboard takes you into it', async ({ page }) => {
  const ishika = await registerViaApi(page, 'Ishika')
  await useSession(page, ishika)
  await page.goto('/')

  await page.getByRole('button', { name: 'Create your first group' }).click()
  await page.getByRole('dialog', { name: 'New group' }).getByLabel('Name').fill('Flat 302')
  await page.getByRole('button', { name: 'Create group' }).click()

  await expect(page).toHaveURL(/\/groups\/\d+$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Flat 302' })).toBeVisible()
  await expect(page).toHaveTitle('Flat 302 · SettleUp')
  await expect(page.getByRole('heading', { name: 'No expenses yet' })).toBeVisible()
})

test('members are listed with the owner marked, and people can be added by email', async ({ page }) => {
  const ishika = await registerViaApi(page, 'Ishika')
  const riya = await registerViaApi(page, 'Riya')
  const group = await createGroupViaApi(page, ishika, 'Goa trip')
  await useSession(page, ishika)
  await page.goto(`/groups/${group.id}`)

  const members = page.getByRole('region', { name: 'Members' })
  await expect(members.getByRole('listitem')).toHaveCount(1)
  await expect(members.getByRole('listitem').first()).toContainText('Ishika (you)')
  await expect(members.getByRole('listitem').first()).toContainText('Owner')

  const email = members.getByLabel('Add someone')
  await email.fill('nobody.here@example.com')
  await members.getByRole('button', { name: 'Add' }).click()
  await expect(members.getByRole('alert')).toHaveText('No user is registered with nobody.here@example.com')

  await email.fill(riya.email)
  await members.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByText('Riya joined the group')).toBeVisible()
  await expect(members.getByRole('listitem')).toHaveCount(2)
  await expect(email).toHaveValue('')

  await email.fill(riya.email)
  await members.getByRole('button', { name: 'Add' }).click()
  await expect(members.getByRole('alert')).toHaveText('Riya is already in this group')
})

test('an equal split previews the exact shares the backend stores', async ({ page }) => {
  const { ishika, riya, kabir, group } = await tripWithThree(page)
  await useSession(page, ishika)
  await page.goto(`/groups/${group.id}`)

  const dialog = await openAddExpense(page)
  await dialog.getByLabel('Description').fill('Dinner')
  await dialog.getByLabel('Total').fill('100')

  // 100 / 3 leaves a paisa over, which goes to the lowest id: Ishika.
  const rows = dialog.getByRole('listitem')
  await expect(rows.nth(0)).toContainText('₹33.34')
  await expect(rows.nth(1)).toContainText('₹33.33')
  await expect(rows.nth(2)).toContainText('₹33.33')

  await dialog.getByRole('button', { name: 'Add expense' }).click()
  await expect(dialog).toBeHidden()

  const item = page.getByRole('list', { name: 'Expenses' }).getByRole('listitem').first()
  await expect(item).toContainText('Dinner')
  await expect(item).toContainText('₹100.00')
  await expect(item).toContainText('You paid · split equally')
  await expect(item).toContainText('you lent ₹66.66')

  const [saved] = await expensesFromApi(page, ishika, group.id)
  expect(saved.shares.map((s) => [s.user.id, s.amount])).toEqual([
    [ishika.user.id, 33.34],
    [riya.user.id, 33.33],
    [kabir.user.id, 33.33],
  ])
})

test('an equal split can leave people out, but not everyone', async ({ page }) => {
  const { ishika, kabir, group } = await tripWithThree(page)
  await useSession(page, ishika)
  await page.goto(`/groups/${group.id}`)

  const dialog = await openAddExpense(page)
  await dialog.getByLabel('Description').fill('Cab')
  await dialog.getByLabel('Total').fill('300')

  for (const name of ['Ishika (you)', 'Riya', 'Kabir']) await dialog.getByLabel(name).uncheck()
  await dialog.getByRole('button', { name: 'Add expense' }).click()
  await expect(dialog.getByText('Pick at least one person to split with')).toBeVisible()

  await dialog.getByLabel('Kabir').check()
  await dialog.getByRole('button', { name: 'Add expense' }).click()
  await expect(dialog).toBeHidden()

  const [saved] = await expensesFromApi(page, ishika, group.id)
  expect(saved.shares.map((s) => [s.user.id, s.amount])).toEqual([[kabir.user.id, 300]])
})

test('an exact split has to add up before it can be saved', async ({ page }) => {
  const { ishika, riya, group } = await tripWithThree(page)
  await useSession(page, ishika)
  await page.goto(`/groups/${group.id}`)

  let posts = 0
  page.on('request', (r) => r.method() === 'POST' && r.url().includes('/expenses') && posts++)

  const dialog = await openAddExpense(page)
  await dialog.getByLabel('Description').fill('Groceries')
  await dialog.getByLabel('Total').fill('250')
  await dialog.getByRole('radio', { name: 'By amount' }).click()
  await dialog.getByLabel('Amount for Ishika').fill('100')
  await dialog.getByLabel('Amount for Riya').fill('100')

  await expect(dialog.getByText('₹50.00 left')).toBeVisible()
  await dialog.getByRole('button', { name: 'Add expense' }).click()
  await expect(dialog.getByText('Amounts add up to ₹200.00, ₹50.00 short')).toBeVisible()
  expect(posts).toBe(0)

  await dialog.getByLabel('Amount for Riya').fill('150')
  await expect(dialog.getByText('Adds up')).toBeVisible()
  await dialog.getByRole('button', { name: 'Add expense' }).click()
  await expect(dialog).toBeHidden()

  const item = page.getByRole('list', { name: 'Expenses' }).getByRole('listitem').first()
  await expect(item).toContainText('split by amount')
  await item.getByText('Groceries').click()
  await expect(item.getByText('Shares')).toBeVisible()
  await expect(item).toContainText('₹150.00')

  const [saved] = await expensesFromApi(page, ishika, group.id)
  expect(saved.shares.map((s) => [s.user.id, s.amount])).toEqual([
    [ishika.user.id, 100],
    [riya.user.id, 150],
  ])
})

test('a percentage split has to make 100 and rounds like the backend', async ({ page }) => {
  const { ishika, riya, kabir, group } = await tripWithThree(page)
  await useSession(page, ishika)
  await page.goto(`/groups/${group.id}`)

  const dialog = await openAddExpense(page)
  await dialog.getByLabel('Description').fill('Chai')
  await dialog.getByLabel('Total').fill('10')
  await dialog.getByRole('radio', { name: 'By %' }).click()
  await dialog.getByLabel('Percent for Ishika').fill('33.33')
  await dialog.getByLabel('Percent for Riya').fill('33.33')
  await dialog.getByLabel('Percent for Kabir').fill('30')

  await dialog.getByRole('button', { name: 'Add expense' }).click()
  // Visible isn't enough on a phone: it has to be scrolled into view too.
  await expect(dialog.getByText('Percentages add up to 96.66%, they need to make 100%')).toBeInViewport()

  await dialog.getByLabel('Percent for Kabir').fill('33.34')
  await expect(dialog.getByText('Adds up')).toBeVisible()
  await dialog.getByRole('button', { name: 'Add expense' }).click()
  await expect(dialog).toBeHidden()

  const [saved] = await expensesFromApi(page, ishika, group.id)
  expect(saved.shares.map((s) => [s.user.id, s.amount])).toEqual([
    [ishika.user.id, 3.34],
    [riya.user.id, 3.33],
    [kabir.user.id, 3.33],
  ])
})

test('a save whose response gets lost can be retried without creating a duplicate', async ({ page }) => {
  const { ishika, group } = await tripWithThree(page)
  await useSession(page, ishika)
  await page.goto(`/groups/${group.id}`)

  // Let the first save reach the backend, then drop the reply on the floor,
  // as if the connection died on the way back.
  let dropped = false
  const keys: string[] = []
  await page.route('**/api/groups/*/expenses', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    keys.push(route.request().headers()['idempotency-key'])
    if (dropped) return route.continue()
    dropped = true
    await route.fetch()
    await route.abort('connectionreset')
  })

  const dialog = await openAddExpense(page)
  await dialog.getByLabel('Description').fill('Villa')
  await dialog.getByLabel('Total').fill('900')
  await dialog.getByRole('button', { name: 'Add expense' }).click()
  await expect(dialog.getByRole('alert')).toContainText("Can't reach the server")

  await dialog.getByRole('button', { name: 'Add expense' }).click()
  await expect(dialog).toBeHidden()

  expect(keys).toHaveLength(2)
  expect(keys[0]).toBe(keys[1])
  expect(await expensesFromApi(page, ishika, group.id)).toHaveLength(1)
  await expect(page.getByRole('list', { name: 'Expenses' }).getByRole('listitem')).toHaveCount(1)
})

test('balances show who is owed and who owes, and the tab is linkable', async ({ page }) => {
  const { ishika, riya, kabir, group } = await tripWithThree(page)
  await addExpenseViaApi(page, ishika, group.id, { description: 'Villa', amount: 900, paidBy: ishika.user.id, splitType: 'EQUAL' })
  await useSession(page, riya)

  await page.goto(`/groups/${group.id}?tab=balances`)
  await expect(page.getByRole('tab', { name: 'Balances' })).toHaveAttribute('aria-selected', 'true')

  const rows = page.getByRole('list', { name: 'Balances' }).getByRole('listitem')
  await expect(rows.nth(0)).toContainText('Ishika')
  await expect(rows.nth(0)).toContainText('gets back ₹600.00')
  await expect(rows.nth(1)).toContainText('Riya (you)')
  await expect(rows.nth(1)).toContainText('owes ₹300.00')
  await expect(rows.nth(2)).toContainText('owes ₹300.00')
  await expect(page.getByText('You owe ₹300.00')).toBeVisible()

  await page.getByRole('tab', { name: 'Expenses' }).click()
  await expect(page).toHaveURL(new RegExp(`/groups/${group.id}$`))
  void kabir
})

test('a suggested payment can be recorded in one go and clears the debt', async ({ page }) => {
  const { ishika, riya, kabir, group } = await tripWithThree(page)
  await addExpenseViaApi(page, ishika, group.id, { description: 'Villa', amount: 900, paidBy: ishika.user.id, splitType: 'EQUAL' })
  await settleViaApi(page, kabir, group.id, { paidBy: kabir.user.id, paidTo: ishika.user.id, amount: 300, note: 'cash' })
  await useSession(page, riya)
  await page.goto(`/groups/${group.id}?tab=settle`)

  const suggested = page.getByRole('list', { name: 'Suggested payments' }).getByRole('listitem')
  await expect(suggested).toHaveCount(1)
  await expect(suggested.first()).toContainText('You')
  await expect(suggested.first()).toContainText('Ishika')
  await expect(suggested.first()).toContainText('₹300.00')

  const history = page.getByRole('list', { name: 'Payment history' }).getByRole('listitem')
  await expect(history).toHaveCount(1)
  await expect(history.first()).toContainText('Kabir')
  await expect(history.first()).toContainText('“cash”')

  await suggested.first().getByRole('button', { name: 'Record payment' }).click()
  const dialog = page.getByRole('dialog', { name: 'Record a payment' })
  await expect(dialog.getByLabel('From')).toHaveValue(String(riya.user.id))
  await expect(dialog.getByLabel('To')).toHaveValue(String(ishika.user.id))
  await expect(dialog.getByLabel('Amount')).toHaveValue('300.00')
  await dialog.getByLabel('Note (optional)').fill('UPI')
  await dialog.getByRole('button', { name: 'Record payment' }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByText('Payment recorded')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'All settled up' })).toBeVisible()
  await expect(history).toHaveCount(2)
  await expect(page.getByText("You're settled up")).toBeVisible()
})

test('the payment form refuses paying yourself and bad amounts', async ({ page }) => {
  const { ishika, group } = await tripWithThree(page)
  await useSession(page, ishika)
  await page.goto(`/groups/${group.id}`)

  await page.getByRole('button', { name: 'Record payment' }).click()
  const dialog = page.getByRole('dialog', { name: 'Record a payment' })

  await dialog.getByLabel('To').selectOption({ label: 'Ishika (you)' })
  await dialog.getByLabel('Amount').fill('12.345')
  await dialog.getByRole('button', { name: 'Record payment' }).click()

  await expect(dialog.getByText('Pick someone other than the payer')).toBeVisible()
  await expect(dialog.getByText('Use a number with at most two decimals')).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()
})

test('a group you are not in, or that does not exist, says so clearly', async ({ page }) => {
  const ishika = await registerViaApi(page, 'Ishika')
  const outsider = await registerViaApi(page, 'Sam')
  const group = await createGroupViaApi(page, ishika, 'Private')
  await useSession(page, outsider)

  await page.goto(`/groups/${group.id}`)
  await expect(page.getByRole('heading', { name: "You're not in this group" })).toBeVisible()

  await page.goto('/groups/999999999')
  await expect(page.getByRole('heading', { name: "This group doesn't exist" })).toBeVisible()

  await page.getByRole('link', { name: 'All groups' }).click()
  await expect(page).toHaveURL('/')
})
