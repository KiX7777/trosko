import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getProfile, resetDemoData, updateProfile } from '../lib/repository'
import { queryKeys } from './query-keys'
import type { Profile } from '../types/domain'
import type { MutationCallbacks } from './mutation-callbacks'

export function useProfileQuery() {
  return useQuery({ queryKey: queryKeys.profile(), queryFn: getProfile })
}

export function useUpdateProfileMutation(callbacks: MutationCallbacks<Partial<Profile>> = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile() })
      callbacks.onSuccess?.(variables)
    },
    onError: callbacks.onError,
  })
}

export function useResetDemoDataMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: resetDemoData,
    onSuccess: () => {
      void queryClient.invalidateQueries()
    },
  })
}
