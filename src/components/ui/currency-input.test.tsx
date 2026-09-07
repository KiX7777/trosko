import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CurrencyInput } from './currency-input'

describe('CurrencyInput', () => {
  it('renders Croatian money formatting with the selected currency', () => {
    render(<CurrencyInput value={1234.5} currency="EUR" onValueChange={vi.fn()} />)

    expect(screen.getByRole('textbox')).toHaveValue('1.234,50 EUR')
  })
})
