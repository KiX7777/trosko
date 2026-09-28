import { describe, expect, it } from 'vitest'
import { getPasskeyErrorMessage, isPasskeySupported } from './passkey'

describe('passkey helpers', () => {
  it('maps a cancelled WebAuthn ceremony to a friendly message', () => {
    expect(getPasskeyErrorMessage({ code: 'ERROR_CEREMONY_ABORTED' })).toBe(
      'Passkey prijava je otkazana.',
    )
  })

  it('maps a relying-party mismatch to a configuration message', () => {
    expect(getPasskeyErrorMessage({ code: 'ERROR_INVALID_RP_ID' })).toBe(
      'Domena aplikacije ne odgovara Supabase passkey postavkama.',
    )
  })

  it('reports support when the WebAuthn browser APIs are available', () => {
    Object.defineProperty(window, 'PublicKeyCredential', {
      configurable: true,
      value: class PublicKeyCredential {},
    })
    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: {},
    })

    expect(isPasskeySupported()).toBe(true)
  })
})
