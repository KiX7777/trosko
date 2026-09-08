import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { z } from 'zod'
import {
  archiveAccount,
  createAccount,
  getAccounts,
  updateAccount,
  updateAccountBalanceManually,
} from '../../lib/repository'
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
import type { Account } from '../../types/domain'

const accountSchema = z.object({
  name: z.string().trim().min(1, t('validation.required')).min(2, t('validation.minTwoChars')),
  type: z.enum(['cash', 'current', 'credit_card', 'savings', 'wallet', 'other']),
  currency: z.string().length(3, t('validation.invalidCurrency')),
  initialBalance: z.coerce.number().min(0, t('validation.invalidAmount')),
  color: z.string().min(1, t('validation.required')),
})
const balanceSchema = z.object({
  balance: z.coerce.number().min(0, t('validation.invalidAmount')),
})

type AccountFormInput = z.input<typeof accountSchema>
type AccountFormOutput = z.output<typeof accountSchema>
type BalanceFormInput = z.input<typeof balanceSchema>
type BalanceFormOutput = z.output<typeof balanceSchema>

const accountDefaults: AccountFormInput = {
  type: 'current',
  currency: DEFAULT_CURRENCY,
  initialBalance: 0,
  color: '#6bd8cb',
  name: '',
}

export function AccountsPage() {
  const [accountModal, setAccountModal] = useState<'create' | 'edit' | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [balanceAccount, setBalanceAccount] = useState<Account | null>(null)
  const [deleteAccount, setDeleteAccount] = useState<Account | null>(null)
  const [menuAccountId, setMenuAccountId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => getAccounts() })
  const form = useForm<AccountFormInput, unknown, AccountFormOutput>({
    resolver: zodResolver(accountSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: accountDefaults,
  })
  const balanceForm = useForm<BalanceFormInput, unknown, BalanceFormOutput>({
    resolver: zodResolver(balanceSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { balance: 0 },
  })

  useEffect(() => {
    if (!menuAccountId) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuAccountId(null)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [menuAccountId])

  const refreshAccounts = () => {
    void queryClient.invalidateQueries({ queryKey: ['accounts'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
  const createMutation = useMutation({
    mutationFn: (values: AccountFormOutput) => createAccount(values),
    onSuccess: () => {
      refreshAccounts()
      setAccountModal(null)
      form.reset(accountDefaults)
      toast.success(t('accounts.added'))
    },
    onError: () => toast.error(t('accounts.error')),
  })
  const editMutation = useMutation({
    mutationFn: (values: AccountFormOutput & { id: string }) => updateAccount(values),
    onSuccess: () => {
      refreshAccounts()
      setAccountModal(null)
      setSelectedAccount(null)
      toast.success(t('accounts.updated'))
    },
    onError: () => toast.error(t('accounts.error')),
  })
  const balanceMutation = useMutation({
    mutationFn: ({ accountId, balance }: { accountId: string; balance: number }) =>
      updateAccountBalanceManually(accountId, balance),
    onSuccess: () => {
      refreshAccounts()
      setBalanceAccount(null)
      toast.success(t('accounts.balanceUpdated'))
    },
    onError: () => toast.error(t('accounts.error')),
  })
  const archiveMutation = useMutation({
    mutationFn: archiveAccount,
    onSuccess: () => {
      refreshAccounts()
      setDeleteAccount(null)
      toast.success(t('accounts.deleted'))
    },
    onError: () => toast.error(t('accounts.error')),
  })

  const openCreate = () => {
    setSelectedAccount(null)
    form.reset(accountDefaults)
    setAccountModal('create')
  }
  const openEdit = (account: Account) => {
    setSelectedAccount(account)
    form.reset({
      name: account.name,
      type: account.type,
      currency: account.currency,
      initialBalance: account.initialBalance,
      color: account.color,
    })
    setMenuAccountId(null)
    setAccountModal('edit')
  }
  const openBalance = (account: Account) => {
    setBalanceAccount(account)
    balanceForm.reset({ balance: account.balance })
    setMenuAccountId(null)
  }
  const closeAccountModal = () => {
    setAccountModal(null)
    setSelectedAccount(null)
  }
  const total = (accounts.data ?? [])
    .filter((account) => !account.archivedAt)
    .reduce((sum, account) => sum + account.balance, 0)

  return (
    <Page
      eyebrow={t('page.accounts')}
      title={t('accounts.title')}
      description={t('accounts.description')}
      action={
        <Button variant="primary" onClick={openCreate}>
          <Icon name="plus" size={17} /> {t('accounts.new')}
        </Button>
      }
    >
      <section className="account-summary">
        <div>
          <span className="eyebrow">{t('accounts.totalInEur')}</span>
          <strong>{formatCurrency(total)}</strong>
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
              <div
                className="account-card__menu"
                ref={menuAccountId === account.id ? menuRef : undefined}
              >
                <button
                  type="button"
                  aria-label={t('aria.optionsFor', { name: account.name })}
                  aria-expanded={menuAccountId === account.id}
                  aria-haspopup="menu"
                  onClick={() =>
                    setMenuAccountId((current) => (current === account.id ? null : account.id))
                  }
                >
                  <Icon name="more" size={18} />
                </button>
                {menuAccountId === account.id && (
                  <div className="account-card__menu-popover" role="menu">
                    <button
                      type="button"
                      className="account-card__menu-action"
                      role="menuitem"
                      onClick={() => openEdit(account)}
                    >
                      <Icon name="pencil" size={16} /> {t('accounts.edit')}
                    </button>
                    <button
                      type="button"
                      className="account-card__menu-action"
                      role="menuitem"
                      onClick={() => openBalance(account)}
                    >
                      <Icon name="currency" size={16} /> {t('accounts.changeBalance')}
                    </button>
                    <button
                      type="button"
                      className="account-card__menu-action account-card__menu-action--danger"
                      role="menuitem"
                      onClick={() => {
                        setMenuAccountId(null)
                        setDeleteAccount(account)
                      }}
                    >
                      <Icon name="trash" size={16} /> {t('accounts.delete')}
                    </button>
                  </div>
                )}
              </div>
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

      <AppModal
        isOpen={accountModal !== null}
        onRequestClose={closeAccountModal}
        eyebrow={t('page.accounts')}
        title={accountModal === 'edit' ? t('accounts.editTitle') : t('accounts.add')}
      >
        <form
          className="form__stack"
          onSubmit={form.handleSubmit((values) => {
            if (accountModal === 'edit' && selectedAccount) {
              editMutation.mutate({ ...values, id: selectedAccount.id })
            } else {
              createMutation.mutate(values)
            }
          })}
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
                    options={SUPPORTED_CURRENCIES.map((value) => ({ value, label: value }))}
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
            <Button type="button" variant="ghost" onClick={closeAccountModal}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createMutation.isPending || editMutation.isPending}
            >
              {accountModal === 'edit' ? t('accounts.saveChanges') : t('accounts.save')}
            </Button>
          </div>
        </form>
      </AppModal>

      <AppModal
        isOpen={balanceAccount !== null}
        onRequestClose={() => setBalanceAccount(null)}
        eyebrow={t('accounts.changeBalance')}
        title={balanceAccount ? t('accounts.balanceTitle', { name: balanceAccount.name }) : ''}
      >
        <form
          className="form__stack"
          onSubmit={balanceForm.handleSubmit((values) => {
            if (balanceAccount) {
              balanceMutation.mutate({ accountId: balanceAccount.id, balance: values.balance })
            }
          })}
        >
          <p className="modal__description">{t('accounts.balanceDescription')}</p>
          <label className="form__field">
            <span>{t('accounts.currentBalance')}</span>
            <Controller
              control={balanceForm.control}
              name="balance"
              render={({ field }) => (
                <CurrencyInput
                  name={field.name}
                  value={field.value as number | undefined}
                  onBlur={field.onBlur}
                  getInputRef={field.ref}
                  onValueChange={field.onChange}
                  className={fieldClassName(Boolean(balanceForm.formState.errors.balance))}
                  aria-invalid={Boolean(balanceForm.formState.errors.balance)}
                  aria-describedby="current-balance-error"
                  currency={balanceAccount?.currency}
                  placeholder={t('quickAdd.amountPlaceholder')}
                />
              )}
            />
            <FieldError
              id="current-balance-error"
              message={balanceForm.formState.errors.balance?.message}
            />
          </label>
          <div className="modal__actions">
            <Button type="button" variant="ghost" onClick={() => setBalanceAccount(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={balanceMutation.isPending}>
              {t('accounts.saveChanges')}
            </Button>
          </div>
        </form>
      </AppModal>

      <AppModal
        isOpen={deleteAccount !== null}
        onRequestClose={() => setDeleteAccount(null)}
        eyebrow={t('accounts.delete')}
        title={t('accounts.deleteTitle')}
        width={440}
      >
        <div className="confirm-modal">
          <p>
            {deleteAccount ? t('accounts.deleteDescription', { name: deleteAccount.name }) : ''}
          </p>
          <div className="modal__actions">
            <Button type="button" variant="ghost" onClick={() => setDeleteAccount(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={archiveMutation.isPending}
              onClick={() => deleteAccount && archiveMutation.mutate(deleteAccount.id)}
            >
              {t('accounts.delete')}
            </Button>
          </div>
        </div>
      </AppModal>
    </Page>
  )
}
