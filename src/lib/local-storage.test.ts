import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageService } from './local-storage'

describe('LocalStorageService', () => {
  beforeEach(() => localStorage.clear())

  it('stores and retrieves JSON values', () => {
    const storage = new LocalStorageService()

    storage.set('dashboard-filter', ['account-current', 'account-cash'])

    expect(storage.get('dashboard-filter', [] as string[])).toEqual([
      'account-current',
      'account-cash',
    ])

    storage.remove('dashboard-filter')

    expect(storage.get('dashboard-filter', [] as string[])).toEqual([])
  })

  it('returns the fallback when stored JSON is invalid', () => {
    const storage = new LocalStorageService()
    localStorage.setItem('invalid', '{')

    expect(storage.get('invalid', ['fallback'])).toEqual(['fallback'])
  })
})
