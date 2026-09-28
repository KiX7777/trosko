import { t } from '../../lib/i18n'

type PasskeyError = {
  code?: string
  message?: string
  name?: string
}

export function isPasskeySupported() {
  return (
    typeof window !== 'undefined' &&
    'PublicKeyCredential' in window &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.credentials)
  )
}

export function getPasskeyErrorMessage(error: unknown) {
  const passkeyError = error as PasskeyError | null

  if (
    passkeyError?.code === 'ERROR_CEREMONY_ABORTED' ||
    passkeyError?.name === 'AbortError' ||
    passkeyError?.name === 'NotAllowedError'
  ) {
    return t('auth.passkeyCancelled')
  }

  switch (passkeyError?.code) {
    case 'passkey_disabled':
      return t('auth.passkeyDisabled')
    case 'webauthn_credential_not_found':
      return t('auth.passkeyNotFound')
    case 'webauthn_credential_exists':
    case 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED':
      return t('auth.passkeyAlreadyRegistered')
    case 'ERROR_INVALID_DOMAIN':
    case 'ERROR_INVALID_RP_ID':
      return t('auth.passkeyDomainError')
    case 'ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT':
    case 'ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT':
    case 'ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG':
      return t('auth.passkeyAuthenticatorUnsupported')
    default:
      return passkeyError?.message || t('auth.passkeyError')
  }
}
