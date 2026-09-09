import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRecurring, getRecurring, updateRecurring } from '../lib/repository'
import type { CreateRecurringInput, RecurringTransaction } from '../types/domain'
import type { MutationCallbacks } from './mutation-callbacks'
import { queryKeys } from './query-keys'

export function useRecurringQuery() {
  return useQuery({ queryKey: queryKeys.recurring(), queryFn: getRecurring })
}

export type SaveRecurringValues = Omit<CreateRecurringInput, 'currency'>

export type SaveRecurringInput = {
  item: RecurringTransaction | null
  values: SaveRecurringValues
}

export function useSaveRecurringMutation(callbacks: MutationCallbacks<SaveRecurringInput> = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ item, values }: SaveRecurringInput) =>
      item
        ? updateRecurring({ id: item.id, ...values, currency: item.currency })
        : createRecurring({ ...values, currency: 'EUR' }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.recurring() })
      callbacks.onSuccess?.(variables)
    },
    onError: callbacks.onError,
  })
}
