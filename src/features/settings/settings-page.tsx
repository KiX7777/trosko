import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Papa from 'papaparse'
import { toast } from 'react-toastify'
import { getProfile, getTransactions, resetDemoData, updateProfile } from '../../lib/repository'
import { useUIStore } from '../../stores/ui-store'
import { Page } from '../../components/ui/page'
import { Button } from '../../components/ui/button'
import { Icon } from '../../components/ui/icon'
import { supabaseEnabled } from '../../lib/supabase'
import { t } from '../../lib/i18n'
import { FieldError, fieldClassName } from '../../components/ui/form-field'
import { AppSelect } from '../../components/ui/select'
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '../../lib/constants'

export function SettingsPage() {
  const [displayNameError, setDisplayNameError] = useState<string>()
  const profile = useQuery({ queryKey: ['profile'], queryFn: getProfile })
  const transactions = useQuery({
    queryKey: ['transactions'],
    queryFn: () => getTransactions(),
  })
  const client = useQueryClient()
  const { theme, setTheme } = useUIStore()
  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['profile'] })
      toast.success(t('settings.saved'))
    },
  })
  const displayName = profile.data?.displayName ?? profile.data?.email ?? t('common.user')
  return (
    <Page
      eyebrow={t('page.preferences')}
      title={t('settings.title')}
      description={t('settings.description')}
      action={
        <span className="settings__state">
          <span className="settings__online-dot" />{' '}
          {supabaseEnabled ? t('auth.active') : t('settings.demoActive')}
        </span>
      }
    >
      <section className="settings__grid">
        <article className="card settings__card">
          <div className="settings__card-heading">
            <span className="settings__icon">
              <Icon name="user" size={18} />
            </span>
            <div>
              <h3>{t('settings.profile')}</h3>
              <p>{t('settings.profileDescription')}</p>
            </div>
          </div>
          <label className="form__field">
            <span>{t('settings.displayName')}</span>
            <input
              defaultValue={displayName}
              className={fieldClassName(Boolean(displayNameError))}
              aria-invalid={Boolean(displayNameError)}
              aria-describedby="settings-display-name-error"
              onChange={() => setDisplayNameError(undefined)}
              onBlur={(event) => {
                const nextDisplayName = event.target.value.trim()
                if (!nextDisplayName) {
                  setDisplayNameError(t('validation.required'))
                  return
                }
                setDisplayNameError(undefined)
                mutation.mutate({ displayName: nextDisplayName })
              }}
            />
            <FieldError id="settings-display-name-error" message={displayNameError} />
          </label>
          <label className="form__field">
            <span>{t('auth.email')}</span>
            <input value={profile.data?.email ?? ''} readOnly />
          </label>
          <label className="form__field">
            <span>{t('settings.primaryCurrency')}</span>
            <AppSelect
              value={profile.data?.primaryCurrency ?? DEFAULT_CURRENCY}
              onChange={(value) => mutation.mutate({ primaryCurrency: value })}
              options={SUPPORTED_CURRENCIES.map((value) => ({
                value,
                label: value,
              }))}
            />
          </label>
        </article>
        <article className="card settings__card">
          <div className="settings__card-heading">
            <span className="settings__icon">
              <Icon name="sparkles" size={18} />
            </span>
            <div>
              <h3>{t('settings.theme')}</h3>
              <p>{t('settings.themeDescription')}</p>
            </div>
          </div>
          <div className="theme__options">
            {(['system', 'light', 'dark'] as const).map((value) => (
              <button
                key={value}
                className={theme === value ? 'is-selected' : ''}
                onClick={() => setTheme(value)}
              >
                <span className={`theme__preview theme__preview--${value}`} />
                <strong>
                  {value === 'system'
                    ? t('settings.system')
                    : value === 'light'
                      ? t('settings.light')
                      : t('settings.dark')}
                </strong>
                {theme === value && <Icon name="trend" size={15} />}
              </button>
            ))}
          </div>
        </article>
        <article className="card settings__card">
          <div className="settings__card-heading">
            <span className="settings__icon">
              <Icon name="download" size={18} />
            </span>
            <div>
              <h3>{t('settings.dataExport')}</h3>
              <p>{t('settings.dataExportDescription')}</p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              const csv = Papa.unparse(
                (transactions.data ?? []).map((tx) => ({
                  [t('export.date')]: tx.transactionDate,
                  [t('export.description')]: tx.description,
                  [t('export.merchant')]: tx.merchant ?? '',
                  [t('export.type')]: tx.type,
                  [t('export.amount')]: tx.amount,
                  [t('export.currency')]: tx.currency,
                  [t('export.notes')]: tx.notes ?? '',
                })),
              )
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const anchor = document.createElement('a')
              anchor.href = url
              anchor.download = 'trosko-transactions.csv'
              anchor.click()
              URL.revokeObjectURL(url)
              toast.success(t('settings.csvDownloaded'))
            }}
          >
            <Icon name="download" size={16} /> {t('settings.exportCsv')}
          </Button>
          <Button variant="secondary" onClick={() => toast.info(t('settings.pdfInfo'))}>
            {t('settings.pdfReport')} <Icon name="file-text" size={16} />
          </Button>
        </article>
        <article className="card settings__card">
          <div className="settings__card-heading">
            <span className="settings__icon">
              <Icon name="archive" size={18} />
            </span>
            <div>
              <h3>{t('settings.demoData')}</h3>
              <p>{t('settings.demoDataDescription')}</p>
            </div>
          </div>
          <Button
            variant="danger"
            onClick={() => {
              void resetDemoData()
              void client.invalidateQueries()
              toast.success(t('settings.demoResetDone'))
            }}
          >
            <Icon name="trash" size={16} /> {t('settings.demoReset')}
          </Button>
        </article>
      </section>
    </Page>
  )
}
