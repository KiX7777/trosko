import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDate, formatSignedCurrency } from './format'

describe('Troško formatting', () => {
  it('formats euro amounts with Croatian separators', () => {
    expect(formatCurrency(1234.5, 'EUR')).toContain('1.234,50')
  })

  it('adds the correct sign for ledger values', () => {
    expect(formatSignedCurrency(-42, 'EUR')).toMatch(/42,00/)
    expect(formatSignedCurrency(-42, 'EUR').trimStart().startsWith('−')).toBe(true)
    expect(formatSignedCurrency(42, 'EUR')).toContain('+42,00')
  })

  it('formats ISO dates for the Croatian locale', () => {
    expect(formatDate('2026-09-07T12:00:00.000Z')).toBe('07. ruj 2026.')
  })
})
