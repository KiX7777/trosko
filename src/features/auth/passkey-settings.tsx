import { useCallback, useEffect, useState } from 'react'
import type { PasskeyListItem } from '@supabase/supabase-js'
import { toast } from 'react-toastify'
import { Button } from '../../components/ui/button'
import { Icon } from '../../components/ui/icon'
import { AppModal } from '../../components/ui/modal'
import { formatDate } from '../../lib/format'
import { t } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'
import { getPasskeyErrorMessage, isPasskeySupported } from './passkey'

export function PasskeySettings() {
  const [passkeys, setPasskeys] = useState<PasskeyListItem[]>([])
  const [loading, setLoading] = useState(Boolean(supabase))
  const [registering, setRegistering] = useState(false)
  const [passkeyToDelete, setPasskeyToDelete] = useState<PasskeyListItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const supported = isPasskeySupported()

  const loadPasskeys = useCallback(async () => {
    if (!supabase) return

    const { data, error } = await supabase.auth.passkey.list()
    if (error) {
      toast.error(getPasskeyErrorMessage(error))
    } else {
      setPasskeys(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!supabase) return
    let cancelled = false

    void supabase.auth.passkey.list().then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        toast.error(getPasskeyErrorMessage(error))
      } else {
        setPasskeys(data ?? [])
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  async function registerPasskey() {
    if (!supabase || !supported) return
    setRegistering(true)
    try {
      const { error } = await supabase.auth.registerPasskey()
      if (error) {
        toast.error(getPasskeyErrorMessage(error))
        return
      }
      toast.success(t('settings.passkeyRegistered'))
      await loadPasskeys()
    } catch (error) {
      toast.error(getPasskeyErrorMessage(error))
    } finally {
      setRegistering(false)
    }
  }

  async function deletePasskey() {
    if (!supabase || !passkeyToDelete) return
    setDeleting(true)
    try {
      const { error } = await supabase.auth.passkey.delete({ passkeyId: passkeyToDelete.id })
      if (error) {
        toast.error(getPasskeyErrorMessage(error))
        return
      }
      setPasskeys((current) => current.filter((passkey) => passkey.id !== passkeyToDelete.id))
      setPasskeyToDelete(null)
      toast.success(t('settings.passkeyDeleted'))
    } catch (error) {
      toast.error(getPasskeyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <article className="card settings__card">
        <div className="settings__card-heading">
          <span className="settings__icon">
            <Icon name="fingerprint" size={18} />
          </span>
          <div>
            <h3>{t('settings.passkeys')}</h3>
            <p>{t('settings.passkeysDescription')}</p>
          </div>
        </div>

        {!supabase ? (
          <p className="passkey__hint">{t('settings.passkeysDemoUnavailable')}</p>
        ) : !supported ? (
          <p className="passkey__hint passkey__hint--warning">{t('auth.passkeyUnsupported')}</p>
        ) : loading ? (
          <p className="passkey__hint">{t('settings.passkeysLoading')}</p>
        ) : (
          <div className="passkey__list" aria-live="polite">
            {passkeys.length === 0 ? (
              <p className="passkey__hint">{t('settings.passkeysEmpty')}</p>
            ) : (
              passkeys.map((passkey, index) => (
                <div className="passkey__item" key={passkey.id}>
                  <span className="passkey__item-icon">
                    <Icon name="fingerprint" size={17} />
                  </span>
                  <div>
                    <strong>
                      {passkey.friendly_name ||
                        t('settings.passkeyFallbackName', { index: index + 1 })}
                    </strong>
                    <span>
                      {passkey.last_used_at
                        ? t('settings.passkeyLastUsed', { date: formatDate(passkey.last_used_at) })
                        : t('settings.passkeyCreated', { date: formatDate(passkey.created_at) })}
                    </span>
                  </div>
                  <Button
                    variant="icon"
                    type="button"
                    aria-label={t('settings.passkeyDeleteLabel', {
                      name:
                        passkey.friendly_name ||
                        t('settings.passkeyFallbackName', { index: index + 1 }),
                    })}
                    onClick={() => setPasskeyToDelete(passkey)}
                  >
                    <Icon name="trash" size={16} />
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

        <Button
          variant="secondary"
          type="button"
          disabled={!supabase || !supported || registering}
          onClick={() => void registerPasskey()}
        >
          <Icon name="fingerprint" size={17} />
          {registering ? t('settings.passkeyRegistering') : t('settings.passkeyRegister')}
        </Button>
      </article>

      <AppModal
        isOpen={Boolean(passkeyToDelete)}
        onRequestClose={() => {
          if (!deleting) setPasskeyToDelete(null)
        }}
        eyebrow={t('settings.passkeyDeleteEyebrow')}
        title={t('settings.passkeyDeleteTitle')}
        width={480}
      >
        <p className="modal__description">{t('settings.passkeyDeleteDescription')}</p>
        <div className="modal__actions">
          <Button
            variant="ghost"
            type="button"
            disabled={deleting}
            onClick={() => setPasskeyToDelete(null)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            type="button"
            disabled={deleting}
            onClick={() => void deletePasskey()}
          >
            <Icon name="trash" size={16} />
            {deleting ? t('settings.passkeyDeleting') : t('settings.passkeyDelete')}
          </Button>
        </div>
      </AppModal>
    </>
  )
}
