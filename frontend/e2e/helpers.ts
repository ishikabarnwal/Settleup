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
  return {
    email,
    token: body.token as string,
    expiresAt: body.expiresAt as string,
    user: body.user as { id: number; name: string; email: string },
  }
}

export type TestUser = Awaited<ReturnType<typeof registerViaApi>>

/** Skip the login form: put the session where the app looks for it before the page loads. */
export async function useSession(page: Page, user: TestUser) {
  await page.addInitScript((session) => {
    localStorage.setItem('settleup.session', JSON.stringify(session))
  }, { token: user.token, expiresAt: user.expiresAt, user: user.user })
}

async function apiPost(page: Page, token: string, path: string, data: unknown) {
  const response = await page.request.post(path, { data, headers: { Authorization: `Bearer ${token}` } })
  expect(response.ok(), `${path} -> ${response.status()} ${await response.text()}`).toBeTruthy()
  return response.json()
}

export async function createGroupViaApi(page: Page, owner: TestUser, name: string, description?: string) {
  return apiPost(page, owner.token, '/api/groups', { name, description }) as Promise<{ id: number; name: string }>
}

export async function addMemberViaApi(page: Page, owner: TestUser, groupId: number, member: TestUser) {
  return apiPost(page, owner.token, `/api/groups/${groupId}/members`, { email: member.email })
}

export async function addExpenseViaApi(page: Page, user: TestUser, groupId: number, expense: Record<string, unknown>) {
  return apiPost(page, user.token, `/api/groups/${groupId}/expenses`, expense)
}

export async function settleViaApi(page: Page, user: TestUser, groupId: number, payment: Record<string, unknown>) {
  return apiPost(page, user.token, `/api/groups/${groupId}/settlements`, payment)
}

export async function signInThroughUi(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

export async function removeMemberViaApi(page: Page, owner: TestUser, groupId: number, member: TestUser) {
  const response = await page.request.delete(`/api/groups/${groupId}/members/${member.user.id}`, {
    headers: { Authorization: `Bearer ${owner.token}` },
  })
  expect(response.ok(), `remove member -> ${response.status()} ${await response.text()}`).toBeTruthy()
}

export async function getViaApi(page: Page, user: TestUser, path: string) {
  return page.request.get(path, { headers: { Authorization: `Bearer ${user.token}` } })
}
