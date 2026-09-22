import { useEffect, useMemo, useState } from 'react'
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { hr } from 'date-fns/locale'
import { DayPicker, type DateRange } from 'react-day-picker'
import 'react-day-picker/style.css'
import Papa from 'papaparse'
import { toast } from 'react-toastify'
import { useAccountsQuery } from '../../hooks/use-account-queries'
import { useCategoriesQuery } from '../../hooks/use-category-queries'
import { useLabelsQuery } from '../../hooks/use-label-queries'
import {
  useProfileQuery,
  useResetDemoDataMutation,
  useUpdateProfileMutation,
} from '../../hooks/use-profile-queries'
import { useAllTransactionsQuery } from '../../hooks/use-transaction-queries'
import { useUIStore } from '../../stores/ui-store'
import { Page } from '../../components/ui/page'
import { Button } from '../../components/ui/button'
import { Icon } from '../../components/ui/icon'
import { AppModal } from '../../components/ui/modal'
import { supabaseEnabled } from '../../lib/supabase'
import { t } from '../../lib/i18n'
import { FieldError, fieldClassName } from '../../components/ui/form-field'
import { AppSelect } from '../../components/ui/select'
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '../../lib/constants'
import { downloadPdfReport } from '../../lib/pdf-export-api'

function formatRangeLabel(range: DateRange | undefined) {
  if (!range?.from) return t('settings.pdfChooseRange')
  const from = format(range.from, 'dd. MMM yyyy.', { locale: hr })
  const to = range.to ? format(range.to, 'dd. MMM yyyy.', { locale: hr }) : '…'
  return `${from} – ${to}`
}

function useCompactDatePicker() {
  const [isCompact, setIsCompact] = useState(() => {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 736px)').matches
    )
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mediaQuery = window.matchMedia('(max-width: 736px)')
    const update = () => setIsCompact(mediaQuery.matches)
    update()
    mediaQuery.addEventListener?.('change', update)
    return () => mediaQuery.removeEventListener?.('change', update)
  }, [])

  return isCompact
}

export function SettingsPage() {
  const [displayNameError, setDisplayNameError] = useState<string>()
  const defaultPdfRange = useMemo<DateRange>(
    () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
    [],
  )
  const [pdfExportOpen, setPdfExportOpen] = useState(false)
  const [draftPdfRange, setDraftPdfRange] = useState<DateRange | undefined>(defaultPdfRange)
  const [pdfPickerMonth, setPdfPickerMonth] = useState(defaultPdfRange.from ?? new Date())
  const [pdfExporting, setPdfExporting] = useState(false)
  const profile = useProfileQuery()
  const transactions = useAllTransactionsQuery()
  const accounts = useAccountsQuery()
  const categories = useCategoriesQuery()
  const labels = useLabelsQuery()
  const isCompactDatePicker = useCompactDatePicker()
  const { theme, setTheme } = useUIStore()
  const mutation = useUpdateProfileMutation({
    onSuccess: () => {
      toast.success(t('settings.saved'))
    },
  })
  const resetMutation = useResetDemoDataMutation()
  const displayName = profile.data?.displayName ?? profile.data?.email ?? t('common.user')
  const pdfQuickRanges = [
    {
      label: t('analytics.thisMonth'),
      range: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
    },
    {
      label: t('analytics.lastMonth'),
      range: () => {
        const lastMonth = subMonths(new Date(), 1)
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
      },
    },
    {
      label: t('analytics.thisYear'),
      range: () => ({ from: new Date(new Date().getFullYear(), 0, 1), to: new Date() }),
    },
  ]
  const openPdfExport = () => {
    const range = { from: startOfMonth(new Date()), to: endOfMonth(new Date()) }
    setDraftPdfRange(range)
    setPdfPickerMonth(range.from)
    setPdfExportOpen(true)
  }
  const exportPdf = async () => {
    if (!draftPdfRange?.from || !draftPdfRange.to) return
    setPdfExporting(true)
    try {
      await downloadPdfReport({
        dateFrom: format(draftPdfRange.from, 'yyyy-MM-dd'),
        dateTo: format(draftPdfRange.to, 'yyyy-MM-dd'),
        demo: {
          profile: profile.data,
          accounts: accounts.data,
          categories: categories.data,
          labels: labels.data,
          transactions: transactions.data,
        },
      })
      setPdfExportOpen(false)
      toast.success(t('settings.pdfDownloaded'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.pdfError'))
    } finally {
      setPdfExporting(false)
    }
  }
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
          <Button variant="secondary" onClick={openPdfExport}>
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
              resetMutation.mutate(undefined, {
                onSuccess: () => toast.success(t('settings.demoResetDone')),
              })
            }}
          >
            <Icon name="trash" size={16} /> {t('settings.demoReset')}
          </Button>
        </article>
      </section>
      <AppModal
        isOpen={pdfExportOpen}
        onRequestClose={() => {
          if (!pdfExporting) setPdfExportOpen(false)
        }}
        eyebrow={t('settings.pdfExportEyebrow')}
        title={t('settings.pdfExportTitle')}
        width={760}
        className="pdf-export-modal"
      >
        <div className="date-range-filter date-range-filter--pdf-export">
          <p className="modal__description">{t('settings.pdfExportDescription')}</p>
          <div className="date-range-filter__shortcuts">
            <span>{t('analytics.quickRanges')}</span>
            <div>
              {pdfQuickRanges.map((shortcut) => (
                <button
                  key={shortcut.label}
                  type="button"
                  onClick={() => {
                    const range = shortcut.range()
                    setDraftPdfRange(range)
                    setPdfPickerMonth(range.from)
                  }}
                >
                  {shortcut.label}
                </button>
              ))}
            </div>
          </div>
          <div className="date-range-filter__selection" aria-live="polite">
            <span>
              <Icon name="calendar-days" size={15} /> {t('analytics.selectedRange')}
            </span>
            <strong>{formatRangeLabel(draftPdfRange)}</strong>
          </div>
          <div className="pdf-export__calendar">
            <DayPicker
              mode="range"
              locale={hr}
              selected={draftPdfRange}
              onSelect={setDraftPdfRange}
              month={pdfPickerMonth}
              onMonthChange={setPdfPickerMonth}
              numberOfMonths={isCompactDatePicker ? 1 : 2}
              showOutsideDays
            />
          </div>
          <div className="modal__actions">
            <Button
              variant="ghost"
              type="button"
              disabled={pdfExporting}
              onClick={() => setPdfExportOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              type="button"
              disabled={!draftPdfRange?.from || !draftPdfRange.to || pdfExporting}
              onClick={() => void exportPdf()}
            >
              <Icon name="download" size={15} />{' '}
              {pdfExporting ? t('settings.pdfCreating') : t('settings.pdfCreate')}
            </Button>
          </div>
        </div>
      </AppModal>
    </Page>
  )
}
