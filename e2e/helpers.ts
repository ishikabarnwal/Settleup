import { expect, type Page } from '@playwright/test'

export const PASSWORD = 'secret123'

/** A fresh address per call, so tests never trip over each other's accounts. */
export function uniqueEmail(name: string): string {
  const random = Math.random().toString(36).slice(2, 8)
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.${Date.now()}.${random}@example.com`
}

export async function registerThroughUi(page: Page, name: string, email = uniqueEmail(name)) {
  await page.goto('/register')
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL('/')
  return email
}

/** Straight to the API for setup steps the test isn't about. */
export async function registerViaApi(page: Page, name: string, email = uniqueEmail(name)) {
  const response = await page.request.post('/api/auth/register', {
    data: { name, email, password: PASSWORD },
  })
  expect(response.status()).toBe(201)
  const body = await response.json()
  return { email, token: body.token as string, user: body.user as { id: number; name: string; email: string } }
}

export async function signInThroughUi(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
}
