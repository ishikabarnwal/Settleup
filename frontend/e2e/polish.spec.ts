import { expect, test } from '@playwright/test'
import { addExpenseViaApi, addMemberViaApi, createGroupViaApi, registerViaApi, useSession } from './helpers'

test('every page has its own title', async ({ page }) => {
  await page.goto('/login')
  await expect(page).toHaveTitle('Sign in · SettleUp')
  await page.goto('/register')
  await expect(page).toHaveTitle('Create account · SettleUp')

  const ishika = await registerViaApi(page, 'Ishika')
  const group = await createGroupViaApi(page, ishika, 'Flat 302')
  await useSession(page, ishika)

  await page.goto('/')
  await expect(page).toHaveTitle('Your groups · SettleUp')
  await page.goto(`/groups/${group.id}`)
  await expect(page).toHaveTitle('Flat 302 · SettleUp')
  await page.goto('/no/such/page')
  await expect(page).toHaveTitle('Page not found · SettleUp')
})

test('the favicon and home screen icon are served', async ({ page }) => {
  const favicon = await page.request.get('/favicon.svg')
  expect(favicon.status()).toBe(200)
  expect(favicon.headers()['content-type']).toContain('image/svg+xml')

  const touchIcon = await page.request.get('/apple-touch-icon.png')
  expect(touchIcon.status()).toBe(200)
  expect(touchIcon.headers()['content-type']).toContain('image/png')

  await page.goto('/login')
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg')
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/apple-touch-icon.png')
})

test('the group tabs work from the keyboard', async ({ page }) => {
  const ishika = await registerViaApi(page, 'Ishika')
  const group = await createGroupViaApi(page, ishika, 'Goa trip')
  await useSession(page, ishika)
  await page.goto(`/groups/${group.id}`)

  await page.getByRole('tab', { name: 'Expenses' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Balances' })).toBeFocused()
  await expect(page.getByRole('tab', { name: 'Balances' })).toHaveAttribute('aria-selected', 'true')
  await expect(page).toHaveURL(/tab=balances/)

  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('tab', { name: 'Settle up' })).toBeFocused()
})

test('keyboard users can skip straight past the navigation', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Tab-key navigation is a desktop concern')
  const ishika = await registerViaApi(page, 'Ishika')
  await useSession(page, ishika)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'No groups yet' })).toBeVisible()

  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to content' })
  await expect(skip).toBeFocused()
  await expect(skip).toBeInViewport()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeFocused()
})

test('a group shows a skeleton while it loads', async ({ page }) => {
  const ishika = await registerViaApi(page, 'Ishika')
  const group = await createGroupViaApi(page, ishika, 'Goa trip')
  await useSession(page, ishika)

  let release!: () => void
  const held = new Promise<void>((resolve) => (release = resolve))
  await page.route(`**/api/groups/${group.id}`, async (route) => {
    await held
    await route.continue()
  })

  await page.goto(`/groups/${group.id}`)
  await expect(page.getByLabel('Loading group')).toBeVisible()
  release()
  await expect(page.getByRole('heading', { level: 1, name: 'Goa trip' })).toBeVisible()
})

test('if a refresh fails, the page says so and keeps what it was showing', async ({ page }) => {
  const ishika = await registerViaApi(page, 'Ishika')
  const riya = await registerViaApi(page, 'Riya')
  const group = await createGroupViaApi(page, ishika, 'Goa trip')
  await addMemberViaApi(page, ishika, group.id, riya)
  await addExpenseViaApi(page, ishika, group.id, { description: 'Villa', amount: 1000, paidBy: ishika.user.id, splitType: 'EQUAL' })
  await useSession(page, ishika)
  await page.goto(`/groups/${group.id}`)
  await expect(page.getByText("You're owed ₹500.00")).toBeVisible()

  // Balances stop loading from here on; adding an expense makes the page refetch them.
  await page.route('**/api/groups/*/balances', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ status: 503, error: 'Service Unavailable', message: 'The server is busy, try again', path: '' }),
    }),
  )

  await page.getByRole('button', { name: 'Add expense' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add an expense' })
  await dialog.getByLabel('Description').fill('Snacks')
  await dialog.getByLabel('Total').fill('100')
  await dialog.getByRole('button', { name: 'Add expense' }).click()

  await expect(page.getByText("Couldn't refresh")).toBeVisible()
  await expect(page.getByText('The server is busy, try again')).toBeVisible()
  await expect(page.getByText("You're owed ₹500.00")).toBeVisible()
})

test('opening a group from far down the list starts at the top of the page', async ({ page }) => {
  const ishika = await registerViaApi(page, 'Ishika')
  for (let i = 1; i <= 12; i++) await createGroupViaApi(page, ishika, `Group ${i}`)
  await useSession(page, ishika)
  await page.goto('/')

  const oldest = page.getByRole('link', { name: /^Group 1\b/ })
  await oldest.scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(200)

  await oldest.click()
  await expect(page.getByRole('heading', { level: 1, name: 'Group 1' })).toBeVisible()
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
})
