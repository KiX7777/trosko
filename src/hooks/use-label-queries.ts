import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createLabel, getLabels } from '../lib/repository'
import type { Label } from '../types/domain'
import type { MutationCallbacks } from './mutation-callbacks'
import { queryKeys } from './query-keys'

export type LabelInput = Pick<Label, 'name' | 'color'>

export function useLabelsQuery() {
  return useQuery({ queryKey: queryKeys.labels(), queryFn: getLabels })
}

export function useCreateLabelMutation(callbacks: MutationCallbacks<LabelInput> = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createLabel,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labels() })
      callbacks.onSuccess?.(variables)
    },
    onError: callbacks.onError,
  })
}
