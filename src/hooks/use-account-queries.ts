import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  archiveAccount,
  createAccount,
  getAccounts,
  updateAccount,
  updateAccountBalanceManually,
} from '../lib/repository'
import type { CreateAccountInput, UpdateAccountInput } from '../types/domain'
import type { MutationCallbacks } from './mutation-callbacks'
import { queryKeys } from './query-keys'

function invalidateAccounts(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.accounts() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardRoot() })
}

export function useAccountsQuery() {
  return useQuery({ queryKey: queryKeys.accounts(), queryFn: () => getAccounts() })
}

export function useCreateAccountMutation(callbacks: MutationCallbacks<CreateAccountInput> = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAccount,
    onSuccess: (_data, variables) => {
      invalidateAccounts(queryClient)
      callbacks.onSuccess?.(variables)
    },
    onError: callbacks.onError,
  })
}

export function useUpdateAccountMutation(callbacks: MutationCallbacks<UpdateAccountInput> = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateAccount,
    onSuccess: (_data, variables) => {
      invalidateAccounts(queryClient)
      callbacks.onSuccess?.(variables)
    },
    onError: callbacks.onError,
  })
}

export type UpdateAccountBalanceInput = { accountId: string; balance: number }

export function useUpdateAccountBalanceMutation(
  callbacks: MutationCallbacks<UpdateAccountBalanceInput> = {},
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ accountId, balance }: UpdateAccountBalanceInput) =>
      updateAccountBalanceManually(accountId, balance),
    onSuccess: (_data, variables) => {
      invalidateAccounts(queryClient)
      callbacks.onSuccess?.(variables)
    },
    onError: callbacks.onError,
  })
}

export function useArchiveAccountMutation(callbacks: MutationCallbacks<string> = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: archiveAccount,
    onSuccess: (_data, variables) => {
      invalidateAccounts(queryClient)
      callbacks.onSuccess?.(variables)
    },
    onError: callbacks.onError,
  })
}
