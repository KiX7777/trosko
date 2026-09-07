export type ApiErrorCode = 'VALIDATION_ERROR' | 'UPSTREAM_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR'

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
