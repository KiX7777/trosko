export interface OcrRequest {
  fileName?: string
  text?: string
}

export interface OcrResult {
  status: 'needs_review' | 'failed'
  sourceFile?: string
  merchant?: string
  date?: string
  currency?: string
  total?: number
  suggestedCategory?: string
  message: string
}
