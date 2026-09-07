import { describe, expect, it } from 'vitest'
import { t } from './i18n'

describe('translations', () => {
  it('returns the Croatian translation', () => {
    expect(t('nav.dashboard')).toBe('Nadzorna ploča')
  })

  it('interpolates translation parameters', () => {
    expect(t('dashboard.welcome', { name: 'Ana' })).toBe('Dobro došao, Ana 👋')
  })
})
