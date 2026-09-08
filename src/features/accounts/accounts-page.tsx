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
import { FieldError, fieldClassName } from '../../components/ui/form-field'
import { AppSelect } from '../../components/ui/select'
import { t } from '../../lib/i18n'
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '../../lib/constants'

const schema = z.object({
  name: z.string().trim().min(1, t('validation.required')).min(2, t('validation.minTwoChars')),
  type: z.enum(['cash', 'current', 'credit_card', 'savings', 'wallet', 'other']),
  currency: z.string().length(3, t('validation.invalidCurrency')),
  initialBalance: z.coerce.number().min(0, t('validation.invalidAmount')),
  color: z.string().min(1, t('validation.required')),
})
type AccountFormInput = z.input<typeof schema>
type AccountFormOutput = z.output<typeof schema>

export function AccountsPage() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => getAccounts(true) })
  const form = useForm<AccountFormInput, unknown, AccountFormOutput>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      type: 'current',
      currency: DEFAULT_CURRENCY,
      initialBalance: 0,
      color: '#6bd8cb',
    },
  })
  const mutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setOpen(false)
      form.reset({
        type: 'current',
        currency: DEFAULT_CURRENCY,
        initialBalance: 0,
        color: '#6bd8cb',
      })
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
        <div className="account-summary__note">
          <Icon name="sparkles" size={17} /> {t('accounts.balanceFromTransactions')}
        </div>
      </section>
      <div className="accounts__grid">
        {(accounts.data ?? []).map((account) => (
          <article
            className={`account-card ${account.archivedAt ? 'is-archived' : ''}`}
            key={account.id}
          >
            <div className="account-card__top">
              <span className="account-card__icon" style={{ color: account.color }}>
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
            <span className="account-card__type">
              {t(
                `common.${account.type === 'credit_card' ? 'creditCard' : account.type === 'current' ? 'currentAccount' : account.type}` as Parameters<
                  typeof t
                >[0],
              )}
            </span>
            <h3>{account.name}</h3>
            <strong>{formatCurrency(account.balance, account.currency)}</strong>
            <div className="account-card__footer">
              <span>{t('accounts.initialBalance')}</span>
              <span>{formatCurrency(account.initialBalance, account.currency)}</span>
            </div>
          </article>
        ))}
      </div>
      <article className="card panel--info">
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
          className="form__stack"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <label className="form__field">
            <span>{t('accounts.accountName')}</span>
            <input
              placeholder={t('accounts.accountNamePlaceholder')}
              className={fieldClassName(Boolean(form.formState.errors.name))}
              aria-invalid={Boolean(form.formState.errors.name)}
              aria-describedby="account-name-error"
              {...form.register('name')}
            />
            <FieldError id="account-name-error" message={form.formState.errors.name?.message} />
          </label>
          <div className="form__grid--two">
            <label className="form__field">
              <span>{t('common.type')}</span>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <AppSelect
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={[
                      { value: 'current', label: t('common.currentAccount') },
                      { value: 'credit_card', label: t('common.creditCard') },
                      { value: 'savings', label: t('common.savings') },
                      { value: 'cash', label: t('common.cash') },
                      { value: 'wallet', label: t('common.wallet') },
                      { value: 'other', label: t('common.other') },
                    ]}
                  />
                )}
              />
            </label>
            <label className="form__field">
              <span>{t('common.currency')}</span>
              <Controller
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <AppSelect
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={SUPPORTED_CURRENCIES.map((value) => ({
                      value,
                      label: value,
                    }))}
                    invalid={Boolean(form.formState.errors.currency)}
                    describedBy="account-currency-error"
                  />
                )}
              />
              <FieldError
                id="account-currency-error"
                message={form.formState.errors.currency?.message}
              />
            </label>
          </div>
          <label className="form__field">
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
                  className={fieldClassName(Boolean(form.formState.errors.initialBalance))}
                  aria-invalid={Boolean(form.formState.errors.initialBalance)}
                  aria-describedby="account-balance-error"
                  currency={form.watch('currency')}
                  placeholder={t('quickAdd.amountPlaceholder')}
                />
              )}
            />
            <FieldError
              id="account-balance-error"
              message={form.formState.errors.initialBalance?.message}
            />
          </label>
          <div className="modal__actions">
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
