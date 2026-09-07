import { Injectable } from '@nestjs/common'
import type { OcrRequest, OcrResult } from './ocr.types.js'

@Injectable()
export class OcrService {
  async parseReceipt(input: OcrRequest): Promise<OcrResult> {
    // OCR providers are intentionally kept behind this boundary. Until a provider
    // is configured, the UI receives a safe review item instead of a guessed entry.
    const text = input.text?.trim() ?? ''
    const totalMatch = text.match(/(?:ukupno|total|amount)\s*[:€ ]*([0-9]+(?:[.,][0-9]{1,2})?)/i)
    return {
      status: 'needs_review',
      sourceFile: input.fileName,
      currency: text.includes('€') ? 'EUR' : undefined,
      total: totalMatch ? Number(totalMatch[1].replace(',', '.')) : undefined,
      message: 'Račun je spreman za ručnu provjeru prije spremanja transakcije.',
    }
  }
}
