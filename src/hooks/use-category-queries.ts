import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCategory, deleteCategory, getCategories, updateCategory } from '../lib/repository'
import type { Category } from '../types/domain'
import type { MutationCallbacks } from './mutation-callbacks'
import { queryKeys } from './query-keys'

export type CategoryInput = Pick<Category, 'name' | 'type' | 'icon' | 'color'> & {
  parentId?: string
}

function invalidateCategories(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.categories() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardRoot() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.transactions() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.recurring() })
}

export function useCategoriesQuery() {
  return useQuery({ queryKey: queryKeys.categories(), queryFn: getCategories })
}

export function useCreateCategoryMutation(callbacks: MutationCallbacks<CategoryInput> = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCategory,
    onSuccess: (_data, variables) => {
      invalidateCategories(queryClient)
      callbacks.onSuccess?.(variables)
    },
    onError: callbacks.onError,
  })
}

export function useUpdateCategoryMutation(
  callbacks: MutationCallbacks<CategoryInput & { id: string }> = {},
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateCategory,
    onSuccess: (_data, variables) => {
      invalidateCategories(queryClient)
      callbacks.onSuccess?.(variables)
    },
    onError: callbacks.onError,
  })
}

export function useDeleteCategoryMutation(callbacks: MutationCallbacks<string> = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: (_data, variables) => {
      invalidateCategories(queryClient)
      callbacks.onSuccess?.(variables)
    },
    onError: callbacks.onError,
  })
}
