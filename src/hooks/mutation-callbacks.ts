export type MutationCallbacks<TVariables> = {
  onSuccess?: (variables: TVariables) => void
  onError?: () => void
}
