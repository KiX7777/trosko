import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parseReceipt } from '../lib/ocr-api'
import {
  createReceipt,
  deleteReceipt,
  getReceipts,
  markReceiptOcrFailed,
  updateReceiptOcr,
} from '../lib/repository'
import type { Receipt } from '../types/domain'
import type { MutationCallbacks } from './mutation-callbacks'
import { queryKeys } from './query-keys'

export function useReceiptsQuery() {
  return useQuery({ queryKey: queryKeys.receipts(), queryFn: getReceipts })
}

export function useProcessReceiptMutation(callbacks: MutationCallbacks<File> = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const receipt = await createReceipt(file)
      try {
        const result = await parseReceipt(file)
        return await updateReceiptOcr(receipt.id, result.status, result)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'OCR obrada nije uspjela.'
        return markReceiptOcrFailed(receipt.id, message)
      }
    },
    onSuccess: (_data, file) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.receipts() })
      callbacks.onSuccess?.(file)
    },
    onError: callbacks.onError,
  })
}

export function useDeleteReceiptMutation(callbacks: MutationCallbacks<Receipt> = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteReceipt,
    onSuccess: (_data, receipt) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.receipts() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions() })
      callbacks.onSuccess?.(receipt)
    },
    onError: callbacks.onError,
  })
}
