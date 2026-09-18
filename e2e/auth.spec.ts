import { expect, test } from '@playwright/test'
import { PASSWORD, registerThroughUi, registerViaApi, signInThroughUi, uniqueEmail } from './helpers'

test('registering signs you in and survives a reload', async ({ page }) => {
  await registerThroughUi(page, 'Ishika Barnwal')

  await expect(page.getByRole('heading', { name: 'Hi, Ishika' })).toBeVisible()
  await expect(page).toHaveTitle('Your groups · SettleUp')

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Hi, Ishika' })).toBeVisible()
})

test('signing out takes you back to the login page and stays signed out', async ({ page }) => {
  await registerThroughUi(page, 'Riya')

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
})

test('logging in with the right password lands on the dashboard', async ({ page }) => {
  const { email } = await registerViaApi(page, 'Tara')

  await signInThroughUi(page, email)

  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Hi, Tara' })).toBeVisible()
})

test('a wrong password shows the backend message and keeps you on the form', async ({ page }) => {
  const { email } = await registerViaApi(page, 'Kabir')

  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('not-the-password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('alert')).toHaveText('Invalid email or password')
  await expect(page).toHaveURL(/\/login$/)
})

test('an email that is already registered is flagged on the email field', async ({ page }) => {
  const { email } = await registerViaApi(page, 'Meera')

  await page.goto('/register')
  await page.getByLabel('Name').fill('Someone Else')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()

  const emailField = page.getByLabel('Email')
  await expect(emailField).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('An account with that email already exists')).toBeVisible()
})

test('obvious mistakes are caught before anything is sent', async ({ page }) => {
  let requests = 0
  page.on('request', (request) => {
    if (request.url().includes('/api/')) requests++
  })

  await page.goto('/register')
  await page.getByLabel('Email').fill('not-an-email')
  await page.getByLabel('Password', { exact: true }).fill('short')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByText('Enter your name')).toBeVisible()
  await expect(page.getByText('Enter a valid email address')).toBeVisible()
  await expect(page.getByText('Use at least 8 characters')).toBeVisible()
  expect(requests).toBe(0)
})

test('a signed out visit is sent to login and back again afterwards', async ({ page }) => {
  const { email } = await registerViaApi(page, 'Dev')

  await page.goto('/groups/12345')
  await expect(page).toHaveURL(/\/login$/)

  await signInThroughUi(page, email)
  await expect(page).toHaveURL('/groups/12345')
})

test('signed in users skip the login page', async ({ page }) => {
  await registerThroughUi(page, 'Zoya', uniqueEmail('zoya'))

  await page.goto('/login')
  await expect(page).toHaveURL('/')
})
