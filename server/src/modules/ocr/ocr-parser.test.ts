import { describe, expect, it } from 'vitest'
import { parseReceiptText } from './ocr-parser.js'

describe('parseReceiptText', () => {
  it('extracts Croatian receipt fields and normalizes European amounts', () => {
    const result = parseReceiptText(
      'KONZUM\nDatum: 08.09.2026\nNamirnice\nUkupno: 1.234,56 EUR',
      'racun.png',
      92,
    )

    expect(result).toMatchObject({
      status: 'completed',
      sourceFile: 'racun.png',
      merchant: 'KONZUM',
      date: '2026-09-08',
      currency: 'EUR',
      total: 1234.56,
      suggestedCategory: 'Hrana',
      confidence: 92,
    })
  })

  it('keeps uncertain extraction in manual review', () => {
    const result = parseReceiptText('KONZUM\nUkupno: 12,50 EUR', 'racun.png', 96)

    expect(result.status).toBe('needs_review')
    expect(result.total).toBe(12.5)
    expect(result.date).toBeUndefined()
  })

  it('supports ISO dates and decimal-dot amounts', () => {
    const result = parseReceiptText('ACME\n2026-09-08\nTotal: 12.50 USD', undefined, 88)

    expect(result).toMatchObject({
      status: 'completed',
      date: '2026-09-08',
      currency: 'USD',
      total: 12.5,
    })
  })
})
