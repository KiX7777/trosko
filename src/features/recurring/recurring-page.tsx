import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { z } from 'zod'
import { useAccountsQuery } from '../../hooks/use-account-queries'
import { useCategoriesQuery } from '../../hooks/use-category-queries'
import { useRecurringQuery, useSaveRecurringMutation } from '../../hooks/use-recurring-queries'
import { formatCurrency, formatDate } from '../../lib/format'
import { Page } from '../../components/ui/page'
import { Button } from '../../components/ui/button'
import { Icon } from '../../components/ui/icon'
import { AppModal } from '../../components/ui/modal'
import { StatusPill } from '../../components/ui/status'
import { CurrencyInput } from '../../components/ui/currency-input'
import { FieldError, fieldClassName } from '../../components/ui/form-field'
import { AppSelect } from '../../components/ui/select'
import { t } from '../../lib/i18n'
import type { RecurringTransaction } from '../../types/domain'
import { CategoryBadge } from '../../components/ui/category-badge'
import { formatCategoryOption } from '../../components/ui/category-options'

const schema = z.object({
  description: z
    .string()
    .trim()
    .min(1, t('validation.required'))
    .min(2, t('validation.minTwoChars')),
  type: z.enum(['expense', 'income']),
  amount: z.coerce.number().positive(t('validation.positiveAmount')),
  accountId: z.string().min(1, t('validation.required')),
  categoryId: z.string().optional(),
  frequency: z.enum(['weekly', 'monthly', 'yearly', 'custom']),
  interval: z.coerce.number().positive(t('validation.positiveAmount')),
  startDate: z.string().min(1, t('validation.invalidDate')),
  nextRunAt: z.string().min(1, t('validation.invalidDate')),
  autoLog: z.boolean(),
  active: z.boolean(),
})
type RecurringFormInput = z.input<typeof schema>
type RecurringFormOutput = z.output<typeof schema>

const defaultFormValues = {
  type: 'expense',
  frequency: 'monthly',
  interval: 1,
  startDate: '2026-09-07',
  nextRunAt: '2026-10-07',
  amount: 0,
  autoLog: false,
  active: true,
} satisfies Partial<RecurringFormInput>

export function RecurringPage() {
  const [open, setOpen] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null)
  const recurring = useRecurringQuery()
  const accounts = useAccountsQuery()
  const categories = useCategoriesQuery()
  const categoryMap = new Map((categories.data ?? []).map((category) => [category.id, category]))
  const form = useForm<RecurringFormInput, unknown, RecurringFormOutput>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: defaultFormValues,
  })
  const mutation = useSaveRecurringMutation({
    onSuccess: (variables) => {
      setOpen(false)
      setEditingRecurring(null)
      form.reset(defaultFormValues)
      toast.success(t(variables.item ? 'recurring.updated' : 'recurring.save'))
    },
    onError: () => {
      toast.error(t('recurring.error'))
    },
  })
  const openNewRecurring = () => {
    setEditingRecurring(null)
    form.reset(defaultFormValues)
    setOpen(true)
  }
  const openEditRecurring = (item: RecurringTransaction) => {
    setEditingRecurring(item)
    form.reset({
      description: item.description,
      type: item.type,
      amount: item.amount,
      accountId: item.accountId,
      categoryId: item.categoryId,
      frequency: item.frequency,
      interval: item.interval,
      startDate: item.startDate,
      nextRunAt: item.nextRunAt,
      autoLog: item.autoLog,
      active: item.active,
    })
    setOpen(true)
  }
  const frequencyLabel = (frequency: string) => t(`common.${frequency}` as Parameters<typeof t>[0])
  return (
    <Page
      eyebrow={t('page.recurring')}
      title={t('recurring.title')}
      action={
        <Button variant="primary" onClick={openNewRecurring}>
          <Icon name="plus" size={17} /> {t('recurring.new')}
        </Button>
      }
    >
      <div className="recurring-overview">
        <div>
          <span className="eyebrow">{t('recurring.activeObligations')}</span>
          <strong>{recurring.data?.filter((item) => item.active).length ?? 0}</strong>
          <small>{t('recurring.templates')}</small>
        </div>
        <div>
          <span className="eyebrow">{t('recurring.monthly')}</span>
          <strong>
            {formatCurrency(
              (recurring.data ?? [])
                .filter((item) => item.active && item.frequency === 'monthly')
                .reduce((sum, item) => sum + (item.type === 'expense' ? item.amount : 0), 0),
            )}
          </strong>
          <small>{t('recurring.projectedOutflow')}</small>
        </div>
        <div>
          <span className="eyebrow">{t('recurring.nextObligation')}</span>
          <strong>
            {recurring.data
              ?.filter((item) => item.active && item.type === 'expense')
              .sort((a, b) => a.nextRunAt.localeCompare(b.nextRunAt))[0]?.nextRunAt ?? '—'}
          </strong>
          <small>{t('recurring.chargeDate')}</small>
        </div>
      </div>
      <div className="card card--recurring-table">
        <div className="table__meta">
          <span>
            {recurring.data?.length ?? 0} {t('recurring.templates')}
          </span>
          <span className="table__muted">{t('recurring.recurringNote')}</span>
        </div>
        <div className="table__scroll">
          <table>
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th>{t('common.account')}</th>
                <th>{t('common.category')}</th>
                <th>{t('recurring.ritam')}</th>
                <th>{t('recurring.next')}</th>
                <th>{t('recurring.status')}</th>
                <th>{t('recurring.autoLog')}</th>
                <th>{t('common.amount')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(recurring.data ?? []).map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="table__description">
                      <span className="recurring__icon">
                        <Icon name="calendar-days" size={16} />
                      </span>
                      <span>
                        <strong>{item.description}</strong>
                        <small>
                          {item.type === 'expense'
                            ? t('common.expense')
                            : t('common.incomeSingular')}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td>
                    {accounts.data?.find((account) => account.id === item.accountId)?.name ?? '—'}
                  </td>
                  <td>
                    {item.categoryId && categoryMap.get(item.categoryId) ? (
                      <CategoryBadge category={categoryMap.get(item.categoryId)!} size="small" />
                    ) : (
                      <span className="table__muted">—</span>
                    )}
                  </td>
                  <td>
                    {item.interval > 1
                      ? `${t('recurring.every', { interval: item.interval })} `
                      : ''}
                    {frequencyLabel(item.frequency)}
                  </td>
                  <td>{formatDate(`${item.nextRunAt}T12:00:00.000Z`)}</td>
                  <td>
                    <StatusPill tone={item.active ? 'positive' : 'neutral'}>
                      {item.active ? t('recurring.upcoming') : t('recurring.paused')}
                    </StatusPill>
                  </td>
                  <td>
                    <StatusPill tone={item.autoLog ? 'positive' : 'neutral'}>
                      {item.autoLog ? t('recurring.autoLogOn') : t('recurring.autoLogOff')}
                    </StatusPill>
                  </td>
                  <td>
                    <strong
                      className={item.type === 'expense' ? 'amount--negative' : 'amount--positive'}
                    >
                      {item.type === 'expense' ? '-' : '+'}
                      {formatCurrency(item.amount)}
                    </strong>
                  </td>
                  <td>
                    <Button
                      variant="icon"
                      aria-label={t('aria.edit', { name: item.description })}
                      onClick={() => openEditRecurring(item)}
                    >
                      <Icon name="pencil" size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <AppModal
        isOpen={open}
        onRequestClose={() => setOpen(false)}
        eyebrow={t('recurring.templateEyebrow')}
        title={t(editingRecurring ? 'recurring.editPayment' : 'recurring.newPayment')}
      >
        <form
          className="form__stack"
          onSubmit={form.handleSubmit((values) =>
            mutation.mutate({ item: editingRecurring, values }),
          )}
        >
          <label className="form__field">
            <span>{t('common.name')}</span>
            <input
              placeholder={t('recurring.descriptionPlaceholder')}
              className={fieldClassName(Boolean(form.formState.errors.description))}
              aria-invalid={Boolean(form.formState.errors.description)}
              aria-describedby="recurring-description-error"
              {...form.register('description')}
            />
            <FieldError
              id="recurring-description-error"
              message={form.formState.errors.description?.message}
            />
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
                      { value: 'expense', label: t('common.expense') },
                      { value: 'income', label: t('common.incomeSingular') },
                    ]}
                  />
                )}
              />
            </label>
            <label className="form__field">
              <span>{t('common.amount')}</span>
              <Controller
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <CurrencyInput
                    name={field.name}
                    value={field.value as number | undefined}
                    onBlur={field.onBlur}
                    getInputRef={field.ref}
                    onValueChange={field.onChange}
                    className={fieldClassName(Boolean(form.formState.errors.amount))}
                    aria-invalid={Boolean(form.formState.errors.amount)}
                    aria-describedby="recurring-amount-error"
                    currency="EUR"
                    placeholder={t('quickAdd.amountPlaceholder')}
                  />
                )}
              />
              <FieldError
                id="recurring-amount-error"
                message={form.formState.errors.amount?.message}
              />
            </label>
          </div>
          <label className="form__field">
            <span>{t('common.account')}</span>
            <Controller
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <AppSelect
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={t('common.noAccount')}
                  options={(accounts.data ?? []).map((account) => ({
                    value: account.id,
                    label: account.name,
                  }))}
                  invalid={Boolean(form.formState.errors.accountId)}
                  describedBy="recurring-account-error"
                  isSearchable
                  isClearable
                />
              )}
            />
            <FieldError
              id="recurring-account-error"
              message={form.formState.errors.accountId?.message}
            />
          </label>
          <div className="form__grid--two">
            <label className="form__field">
              <span>{t('recurring.frequency')}</span>
              <Controller
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <AppSelect
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={[
                      { value: 'weekly', label: t('common.weekly') },
                      { value: 'monthly', label: t('common.monthly') },
                      { value: 'yearly', label: t('common.yearly') },
                      { value: 'custom', label: t('common.custom') },
                    ]}
                  />
                )}
              />
            </label>
            <label className="form__field">
              <span>{t('common.category')}</span>
              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <AppSelect
                    value={field.value}
                    onChange={(value) => field.onChange(value || undefined)}
                    onBlur={field.onBlur}
                    placeholder={t('common.noCategory')}
                    options={(categories.data ?? []).map((category) => ({
                      value: category.id,
                      label: category.name,
                    }))}
                    formatOptionLabel={formatCategoryOption(categories.data ?? [])}
                    isClearable
                  />
                )}
              />
            </label>
          </div>
          <div className="form__grid--two">
            <label className="form__field">
              <span>{t('recurring.start')}</span>
              <input
                type="date"
                className={fieldClassName(Boolean(form.formState.errors.startDate))}
                aria-invalid={Boolean(form.formState.errors.startDate)}
                aria-describedby="recurring-start-error"
                {...form.register('startDate')}
              />
              <FieldError
                id="recurring-start-error"
                message={form.formState.errors.startDate?.message}
              />
            </label>
            <label className="form__field">
              <span>{t('recurring.nextCharge')}</span>
              <input
                type="date"
                className={fieldClassName(Boolean(form.formState.errors.nextRunAt))}
                aria-invalid={Boolean(form.formState.errors.nextRunAt)}
                aria-describedby="recurring-next-error"
                {...form.register('nextRunAt')}
              />
              <FieldError
                id="recurring-next-error"
                message={form.formState.errors.nextRunAt?.message}
              />
            </label>
          </div>
          <label className="recurring__auto-log">
            <input type="checkbox" {...form.register('autoLog')} />
            <span>
              <strong>{t('recurring.autoLog')}</strong>
              <small>{t('recurring.autoLogDescription')}</small>
            </span>
          </label>
          <label className="recurring__auto-log">
            <input type="checkbox" {...form.register('active')} />
            <span>
              <strong>{t('recurring.active')}</strong>
              <small>{t('recurring.activeDescription')}</small>
            </span>
          </label>
          <div className="modal__actions">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={mutation.isPending}>
              {mutation.isPending
                ? t('recurring.saving')
                : t(editingRecurring ? 'recurring.update' : 'recurring.save')}
            </Button>
          </div>
        </form>
      </AppModal>
    </Page>
  )
}
