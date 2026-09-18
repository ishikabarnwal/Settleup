import { currentToken } from './session'
import type {
  ApiErrorBody,
  AuthResponse,
  CreateExpenseRequest,
  CreateSettlementRequest,
  Expense,
  GroupDetail,
  GroupSummary,
  MemberBalance,
  Settlement,
  SuggestedPayment,
  User,
} from './types'

/**
 * Empty in development, so requests go to /api on this origin and the Vite
 * proxy forwards them. Set VITE_API_URL at build time to talk to a deployed
 * backend directly.
 */
const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

let onUnauthorized: () => void = () => {}

/** Set by the auth provider: what to do when the backend rejects the session's token. */
export function onSessionRejected(handler: () => void) {
  onUnauthorized = handler
}

type RequestOptions = {
  body?: unknown
  idempotencyKey?: string
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const token = currentToken()
  const headers: Record<string, string> = { Accept: 'application/json' }

  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey

  let response: Response
  try {
    response = await fetch(BASE_URL + path, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.")
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  const data: unknown = text ? safeParse(text) : undefined

  if (!response.ok) {
    const body = isApiErrorBody(data) ? data : undefined

    // A rejected token on a signed-in request means the session is over
    // (expired or the user no longer exists). Login failures are also 401s
    // but carry no token, so they fall through to a normal error.
    if (response.status === 401 && token) onUnauthorized()

    throw new ApiError(
      response.status,
      body?.message ?? `Something went wrong (${response.status})`,
      body?.fieldErrors,
    )
  }

  return data as T
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && 'message' in value && 'status' in value
}

export const api = {
  register: (body: { name: string; email: string; password: string }) =>
    request<AuthResponse>('POST', '/api/auth/register', { body }),

  login: (body: { email: string; password: string }) =>
    request<AuthResponse>('POST', '/api/auth/login', { body }),

  me: () => request<User>('GET', '/api/users/me'),

  groups: () => request<GroupSummary[]>('GET', '/api/groups'),

  createGroup: (body: { name: string; description?: string }) =>
    request<GroupSummary>('POST', '/api/groups', { body }),

  group: (groupId: number) => request<GroupDetail>('GET', `/api/groups/${groupId}`),

  addMember: (groupId: number, email: string) =>
    request<GroupDetail>('POST', `/api/groups/${groupId}/members`, { body: { email } }),

  expenses: (groupId: number) => request<Expense[]>('GET', `/api/groups/${groupId}/expenses`),

  createExpense: (groupId: number, body: CreateExpenseRequest, idempotencyKey: string) =>
    request<Expense>('POST', `/api/groups/${groupId}/expenses`, { body, idempotencyKey }),

  balances: (groupId: number) => request<MemberBalance[]>('GET', `/api/groups/${groupId}/balances`),

  settlements: (groupId: number) => request<Settlement[]>('GET', `/api/groups/${groupId}/settlements`),

  suggestedPayments: (groupId: number) =>
    request<SuggestedPayment[]>('GET', `/api/groups/${groupId}/settlements/suggested`),

  recordSettlement: (groupId: number, body: CreateSettlementRequest, idempotencyKey: string) =>
    request<Settlement>('POST', `/api/groups/${groupId}/settlements`, { body, idempotencyKey }),
}

/** Turns anything thrown by a request into a sentence worth showing. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong'
}
