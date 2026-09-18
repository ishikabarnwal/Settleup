// Shapes returned by settleup-backend. Money arrives as JSON numbers with at
// most two decimal places; anything that adds amounts up converts to paise first.

export type User = {
  id: number
  name: string
  email: string
}

export type AuthResponse = {
  token: string
  tokenType: 'Bearer'
  expiresAt: string
  user: User
}

export type GroupSummary = {
  id: number
  name: string
  description: string | null
  createdBy: number
  createdAt: string
  memberCount: number
}

export type GroupRole = 'OWNER' | 'MEMBER'

export type GroupMember = User & { role: GroupRole }

export type GroupDetail = {
  id: number
  name: string
  description: string | null
  createdBy: number
  createdAt: string
  members: GroupMember[]
}

export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE'

export type Expense = {
  id: number
  groupId: number
  description: string
  amount: number
  paidBy: User
  splitType: SplitType
  createdAt: string
  shares: { user: User; amount: number }[]
}

export type MemberBalance = {
  user: User
  totalPaid: number
  totalShare: number
  settlementsPaid: number
  settlementsReceived: number
  /** Positive: the group owes them. Negative: they owe the group. */
  net: number
}

export type Settlement = {
  id: number
  groupId: number
  paidBy: User
  paidTo: User
  amount: number
  note: string | null
  settledAt: string
}

export type SuggestedPayment = {
  from: User
  to: User
  amount: number
}

/** Every error from the backend comes back in this shape. */
export type ApiErrorBody = {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
  fieldErrors?: Record<string, string>
}

// Amounts are sent as numbers built from whole paise (e.g. 107025 / 100), which
// JSON always writes back out as the exact two-decimal value.
export type CreateExpenseRequest = {
  description: string
  amount: number
  paidBy: number
  splitType: SplitType
  participantIds?: number[]
  shares?: { userId: number; amount: number }[]
  percentages?: { userId: number; percent: number }[]
}

export type CreateSettlementRequest = {
  paidBy: number
  paidTo: number
  amount: number
  note?: string
}
