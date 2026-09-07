import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { z } from 'zod'
import { createRecurring, getAccounts, getCategories, getRecurring } from '../../lib/repository'
import { formatCurrency, formatDate } from '../../lib/format'
import { Page } from '../../components/ui/page'
import { Button } from '../../components/ui/button'
import { Icon } from '../../components/ui/icon'
import { AppModal } from '../../components/ui/modal'
import { StatusPill } from '../../components/ui/status-pill'
import { CurrencyInput } from '../../components/ui/currency-input'
import { t } from '../../lib/i18n'

const schema = z.object({
  description: z.string().min(2),
  type: z.enum(['expense', 'income']),
  amount: z.coerce.number().positive(),
  accountId: z.string().min(1),
  categoryId: z.string().optional(),
  frequency: z.enum(['weekly', 'monthly', 'yearly', 'custom']),
  interval: z.coerce.number().positive(),
  startDate: z.string(),
  nextRunAt: z.string(),
})
type RecurringFormInput = z.input<typeof schema>
type RecurringFormOutput = z.output<typeof schema>

export function RecurringPage() {
  const [open, setOpen] = useState(false)
  const recurring = useQuery({ queryKey: ['recurring'], queryFn: getRecurring })
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => getAccounts() })
  const categories = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const client = useQueryClient()
  const form = useForm<RecurringFormInput, unknown, RecurringFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'expense',
      frequency: 'monthly',
      interval: 1,
      startDate: '2026-09-07',
      nextRunAt: '2026-10-07',
      amount: 0,
    },
  })
  const mutation = useMutation({
    mutationFn: createRecurring,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['recurring'] })
      setOpen(false)
      form.reset({
        type: 'expense',
        frequency: 'monthly',
        interval: 1,
        startDate: '2026-09-07',
        nextRunAt: '2026-10-07',
        amount: 0,
      })
      toast.success(t('recurring.save'))
    },
  })
  const frequencyLabel = (frequency: string) => t(`common.${frequency}` as Parameters<typeof t>[0])
  return (
    <Page
      eyebrow={t('page.recurring')}
      title={t('recurring.title')}
      description={t('recurring.description')}
      action={
        <Button variant="primary" onClick={() => setOpen(true)}>
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
      <div className="surface-card recurring-table-card">
        <div className="table-meta">
          <span>
            {recurring.data?.length ?? 0} {t('recurring.templates')}
          </span>
          <span className="table-muted">{t('recurring.recurringNote')}</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th>{t('common.account')}</th>
                <th>{t('recurring.ritam')}</th>
                <th>{t('recurring.next')}</th>
                <th>{t('recurring.status')}</th>
                <th>{t('common.amount')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(recurring.data ?? []).map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="table-description">
                      <span className="recurring-icon">
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
                    <strong
                      className={item.type === 'expense' ? 'amount-negative' : 'amount-positive'}
                    >
                      {item.type === 'expense' ? '-' : '+'}
                      {formatCurrency(item.amount)}
                    </strong>
                  </td>
                  <td>
                    <Button variant="icon" aria-label={t('aria.edit', { name: item.description })}>
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
        title={t('recurring.newPayment')}
      >
        <form
          className="form-stack"
          onSubmit={form.handleSubmit((values) =>
            mutation.mutate({ ...values, currency: 'EUR', active: true }),
          )}
        >
          <label className="form-field">
            <span>{t('common.name')}</span>
            <input
              placeholder={t('recurring.descriptionPlaceholder')}
              {...form.register('description')}
            />
          </label>
          <div className="form-grid-2">
            <label className="form-field">
              <span>{t('common.type')}</span>
              <select {...form.register('type')}>
                <option value="expense">{t('common.expense')}</option>
                <option value="income">{t('common.incomeSingular')}</option>
              </select>
            </label>
            <label className="form-field">
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
                    currency="EUR"
                    placeholder={t('quickAdd.amountPlaceholder')}
                  />
                )}
              />
            </label>
          </div>
          <label className="form-field">
            <span>{t('common.account')}</span>
            <select {...form.register('accountId')}>
              <option value="">{t('common.noAccount')}</option>
              {accounts.data?.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid-2">
            <label className="form-field">
              <span>{t('recurring.frequency')}</span>
              <select {...form.register('frequency')}>
                <option value="weekly">{t('common.weekly')}</option>
                <option value="monthly">{t('common.monthly')}</option>
                <option value="yearly">{t('common.yearly')}</option>
                <option value="custom">{t('common.custom')}</option>
              </select>
            </label>
            <label className="form-field">
              <span>{t('common.category')}</span>
              <select {...form.register('categoryId')}>
                <option value="">{t('common.noCategory')}</option>
                {categories.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-grid-2">
            <label className="form-field">
              <span>{t('recurring.start')}</span>
              <input type="date" {...form.register('startDate')} />
            </label>
            <label className="form-field">
              <span>{t('recurring.nextCharge')}</span>
              <input type="date" {...form.register('nextRunAt')} />
            </label>
          </div>
          <div className="modal-actions">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary">
              {t('recurring.save')}
            </Button>
          </div>
        </form>
      </AppModal>
    </Page>
  )
}
