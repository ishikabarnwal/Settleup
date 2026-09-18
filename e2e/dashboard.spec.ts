import { expect, test } from '@playwright/test'
import { addExpenseViaApi, addMemberViaApi, createGroupViaApi, registerViaApi, useSession } from './helpers'

test('a new user sees the empty state and can create their first group', async ({ page }) => {
  const ishika = await registerViaApi(page, 'Ishika')
  await useSession(page, ishika)
  await page.goto('/')

  await expect(page).toHaveTitle('Your groups · SettleUp')
  await expect(page.getByRole('heading', { name: 'No groups yet' })).toBeVisible()

  await page.getByRole('button', { name: 'Create your first group' }).click()
  const dialog = page.getByRole('dialog', { name: 'New group' })
  await dialog.getByLabel('Name').fill('Goa trip')
  await dialog.getByLabel('Description (optional)').fill('December, 4 nights')
  await dialog.getByRole('button', { name: 'Create group' }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByText('Goa trip is ready')).toBeVisible()

  const card = page.getByRole('link', { name: /Goa trip/ })
  await expect(card).toContainText('December, 4 nights')
  await expect(card).toContainText("You're settled up")
  await expect(card).toContainText('1 member')
  await expect(card).toHaveAttribute('href', /\/groups\/\d+$/)
})

test('the new group form checks the name before sending', async ({ page }) => {
  const ishika = await registerViaApi(page, 'Ishika')
  await useSession(page, ishika)
  await page.goto('/')

  await page.getByRole('button', { name: 'Create your first group' }).click()
  const dialog = page.getByRole('dialog', { name: 'New group' })

  await dialog.getByRole('button', { name: 'Create group' }).click()
  await expect(dialog.getByText('Give the group a name')).toBeVisible()

  await dialog.getByLabel('Name').fill('x'.repeat(101))
  await dialog.getByRole('button', { name: 'Create group' }).click()
  await expect(dialog.getByText('Name must be at most 100 characters')).toBeVisible()

  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('heading', { name: 'No groups yet' })).toBeVisible()
})

test('each card shows where you stand in that group, and the header adds them up', async ({ page }) => {
  const ishika = await registerViaApi(page, 'Ishika')
  const riya = await registerViaApi(page, 'Riya')

  const trip = await createGroupViaApi(page, ishika, 'Goa trip')
  await addMemberViaApi(page, ishika, trip.id, riya)
  await addExpenseViaApi(page, ishika, trip.id, {
    description: 'Hotel',
    amount: 1000,
    paidBy: ishika.user.id,
    splitType: 'EQUAL',
  })

  const flat = await createGroupViaApi(page, riya, 'Flat 302')
  await addMemberViaApi(page, riya, flat.id, ishika)
  await addExpenseViaApi(page, riya, flat.id, {
    description: 'Wifi',
    amount: 300,
    paidBy: riya.user.id,
    splitType: 'EQUAL',
  })

  await useSession(page, ishika)
  await page.goto('/')

  await expect(page.getByRole('link', { name: /Goa trip/ })).toContainText("You're owed ₹500.00")
  await expect(page.getByRole('link', { name: /Flat 302/ })).toContainText('You owe ₹150.00')
  await expect(page.getByText('2 groups')).toBeVisible()

  const summary = page.locator('dl')
  await expect(summary).toContainText("You're owed₹500.00")
  await expect(summary).toContainText('You owe₹150.00')
})

test('a failed load says so and can be retried', async ({ page }) => {
  const ishika = await registerViaApi(page, 'Ishika')
  await createGroupViaApi(page, ishika, 'Goa trip')
  await useSession(page, ishika)

  let failing = true
  await page.route('**/api/groups', (route) =>
    failing
      ? route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ status: 500, error: 'Internal Server Error', message: 'Something went wrong', path: '/api/groups' }),
        })
      : route.continue(),
  )

  await page.goto('/')
  await expect(page.getByRole('heading', { name: "Couldn't load your groups" })).toBeVisible()

  failing = false
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('link', { name: /Goa trip/ })).toBeVisible()
})

test('a token the backend no longer accepts signs you out', async ({ page }) => {
  const ishika = await registerViaApi(page, 'Ishika')
  await useSession(page, { ...ishika, token: 'not-a-real-token' })

  await page.goto('/')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('Your session has ended. Please sign in again.')).toBeVisible()
})
