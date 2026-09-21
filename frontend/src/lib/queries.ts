import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type { CreateExpenseRequest, CreateSettlementRequest, GroupSummary } from './types'

/**
 * Query keys. Everything about one group sits under ['groups', id] so a single
 * invalidation after a change refreshes its expenses, balances and settlements
 * together.
 */
export const keys = {
  groups: ['groups'] as const,
  group: (groupId: number) => ['groups', groupId] as const,
  expenses: (groupId: number) => ['groups', groupId, 'expenses'] as const,
  balances: (groupId: number) => ['groups', groupId, 'balances'] as const,
  settlements: (groupId: number) => ['groups', groupId, 'settlements'] as const,
  suggested: (groupId: number) => ['groups', groupId, 'suggested'] as const,
}

export function useGroups() {
  return useQuery({ queryKey: keys.groups, queryFn: api.groups })
}

/** Each group's balances, fetched in parallel, for the per-group figures on the dashboard. */
export function useBalancesForGroups(groups: GroupSummary[] | undefined) {
  return useQueries({
    queries: (groups ?? []).map((group) => ({
      queryKey: keys.balances(group.id),
      queryFn: () => api.balances(group.id),
    })),
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.groups, exact: true }),
  })
}

export function useGroup(groupId: number) {
  return useQuery({ queryKey: keys.group(groupId), queryFn: () => api.group(groupId) })
}

export function useExpenses(groupId: number) {
  return useQuery({ queryKey: keys.expenses(groupId), queryFn: () => api.expenses(groupId) })
}

export function useBalances(groupId: number) {
  return useQuery({ queryKey: keys.balances(groupId), queryFn: () => api.balances(groupId) })
}

export function useSettlements(groupId: number) {
  return useQuery({ queryKey: keys.settlements(groupId), queryFn: () => api.settlements(groupId) })
}

export function useSuggestedPayments(groupId: number) {
  return useQuery({ queryKey: keys.suggested(groupId), queryFn: () => api.suggestedPayments(groupId) })
}

/** After anything changes inside a group, refresh the group and the dashboard list. */
function useRefreshGroup(groupId: number) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.group(groupId) }),
      queryClient.invalidateQueries({ queryKey: keys.groups, exact: true }),
    ])
}

export function useAddMember(groupId: number) {
  const refresh = useRefreshGroup(groupId)
  return useMutation({
    mutationFn: (email: string) => api.addMember(groupId, email),
    onSuccess: refresh,
  })
}

export function useCreateExpense(groupId: number) {
  const refresh = useRefreshGroup(groupId)
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: CreateExpenseRequest; idempotencyKey: string }) =>
      api.createExpense(groupId, body, idempotencyKey),
    onSuccess: refresh,
  })
}

export function useDeleteExpense(groupId: number) {
  const refresh = useRefreshGroup(groupId)
  return useMutation({
    mutationFn: (expenseId: number) => api.deleteExpense(groupId, expenseId),
    onSuccess: refresh,
  })
}

export function useDeleteSettlement(groupId: number) {
  const refresh = useRefreshGroup(groupId)
  return useMutation({
    mutationFn: (settlementId: number) => api.deleteSettlement(groupId, settlementId),
    onSuccess: refresh,
  })
}

export function useRemoveMember(groupId: number) {
  const refresh = useRefreshGroup(groupId)
  return useMutation({
    mutationFn: (userId: number) => api.removeMember(groupId, userId),
    onSuccess: refresh,
  })
}

/**
 * Only the dashboard list needs refreshing. The group's own cached data is
 * left to expire: clearing it while its page is still on screen would make
 * that page ask for the group again and get a 404 on the way out.
 */
export function useDeleteGroup(groupId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.deleteGroup(groupId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.groups, exact: true }),
  })
}

export function useRecordSettlement(groupId: number) {
  const refresh = useRefreshGroup(groupId)
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: CreateSettlementRequest; idempotencyKey: string }) =>
      api.recordSettlement(groupId, body, idempotencyKey),
    onSuccess: refresh,
  })
}
