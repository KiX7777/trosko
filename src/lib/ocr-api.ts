export type OcrResult = {
  status: 'completed' | 'needs_review' | 'failed'
  sourceFile?: string
  merchant?: string
  date?: string
  currency?: string
  total?: number
  suggestedCategory?: string
  confidence?: number
  extractedText?: string
  message: string
}

export async function parseReceipt(file: File): Promise<OcrResult> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/ocr/parse`, {
    method: 'POST',
    body: formData,
  })
  const payload = (await response.json()) as OcrResult
  if (!response.ok) throw new Error(payload.message || 'OCR obrada nije uspjela.')
  return payload
}
