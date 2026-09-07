import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { z } from 'zod'
import { createAccount, getAccounts } from '../../lib/repository'
import { formatCurrency } from '../../lib/format'
import { Page } from '../../components/ui/page'
import { Button } from '../../components/ui/button'
import { Icon } from '../../components/ui/icon'
import { AppModal } from '../../components/ui/modal'
import { CurrencyInput } from '../../components/ui/currency-input'
import { t } from '../../lib/i18n'

const schema = z.object({
  name: z.string().min(2),
  type: z.enum(['cash', 'current', 'credit_card', 'savings', 'wallet', 'other']),
  currency: z.string().length(3),
  initialBalance: z.coerce.number(),
  color: z.string(),
})
type AccountFormInput = z.input<typeof schema>
type AccountFormOutput = z.output<typeof schema>

export function AccountsPage() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => getAccounts(true) })
  const form = useForm<AccountFormInput, unknown, AccountFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'current', currency: 'EUR', initialBalance: 0, color: '#6bd8cb' },
  })
  const mutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setOpen(false)
      form.reset({ type: 'current', currency: 'EUR', initialBalance: 0, color: '#6bd8cb' })
      toast.success(t('accounts.add'))
    },
  })
  const total = (accounts.data ?? [])
    .filter((account) => !account.archivedAt)
    .reduce((sum, account) => sum + account.balance, 0)
  return (
    <Page
      eyebrow={t('page.accounts')}
      title={t('accounts.title')}
      description={t('accounts.description')}
      action={
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Icon name="plus" size={17} /> {t('accounts.new')}
        </Button>
      }
    >
      <section className="account-summary">
        <div>
          <span className="eyebrow">{t('accounts.totalInEur')}</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
        <div className="account-summary-note">
          <Icon name="sparkles" size={17} /> {t('accounts.balanceFromTransactions')}
        </div>
      </section>
      <div className="account-grid">
        {(accounts.data ?? []).map((account) => (
          <article
            className={`account-detail-card ${account.archivedAt ? 'archived' : ''}`}
            key={account.id}
          >
            <div className="account-detail-top">
              <span className="account-detail-icon" style={{ color: account.color }}>
                <Icon
                  name={
                    account.type === 'credit_card'
                      ? 'card'
                      : account.type === 'wallet'
                        ? 'wallet'
                        : account.type === 'savings'
                          ? 'sparkles'
                          : 'landmark'
                  }
                  size={22}
                />
              </span>
              <button aria-label={t('aria.optionsFor', { name: account.name })}>
                <Icon name="more" size={18} />
              </button>
            </div>
            <span className="account-type-label">
              {t(
                `common.${account.type === 'credit_card' ? 'creditCard' : account.type === 'current' ? 'currentAccount' : account.type}` as Parameters<
                  typeof t
                >[0],
              )}
            </span>
            <h3>{account.name}</h3>
            <strong>{formatCurrency(account.balance, account.currency)}</strong>
            <div className="account-detail-footer">
              <span>{t('accounts.initialBalance')}</span>
              <span>{formatCurrency(account.initialBalance, account.currency)}</span>
            </div>
          </article>
        ))}
      </div>
      <article className="surface-card info-panel">
        <Icon name="sparkles" size={20} />
        <div>
          <h3>{t('accounts.accurateBalance')}</h3>
          <p>{t('accounts.accurateBalanceDescription')}</p>
        </div>
      </article>
      <AppModal
        isOpen={open}
        onRequestClose={() => setOpen(false)}
        eyebrow={t('page.accounts')}
        title={t('accounts.add')}
      >
        <form
          className="form-stack"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <label className="form-field">
            <span>{t('accounts.accountName')}</span>
            <input placeholder={t('accounts.accountNamePlaceholder')} {...form.register('name')} />
          </label>
          <div className="form-grid-2">
            <label className="form-field">
              <span>{t('common.type')}</span>
              <select {...form.register('type')}>
                <option value="current">{t('common.currentAccount')}</option>
                <option value="credit_card">{t('common.creditCard')}</option>
                <option value="savings">{t('common.savings')}</option>
                <option value="cash">{t('common.cash')}</option>
                <option value="wallet">{t('common.wallet')}</option>
                <option value="other">{t('common.other')}</option>
              </select>
            </label>
            <label className="form-field">
              <span>{t('common.currency')}</span>
              <select {...form.register('currency')}>
                <option>EUR</option>
                <option>USD</option>
                <option>GBP</option>
                <option>CHF</option>
              </select>
            </label>
          </div>
          <label className="form-field">
            <span>{t('accounts.initialBalance')}</span>
            <Controller
              control={form.control}
              name="initialBalance"
              render={({ field }) => (
                <CurrencyInput
                  name={field.name}
                  value={field.value as number | undefined}
                  onBlur={field.onBlur}
                  getInputRef={field.ref}
                  onValueChange={field.onChange}
                  currency={form.watch('currency')}
                  placeholder={t('quickAdd.amountPlaceholder')}
                />
              )}
            />
          </label>
          <div className="modal-actions">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary">
              {t('accounts.save')}
            </Button>
          </div>
        </form>
      </AppModal>
    </Page>
  )
}
