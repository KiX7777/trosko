import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { z } from 'zod'
import { createTransaction, getAccounts, getCategories } from '../../lib/repository'
import { todayIso } from '../../lib/format'
import { useUIStore } from '../../stores/ui-store'
import { AppModal } from '../../components/ui/modal'
import { Button } from '../../components/ui/button'
import { CurrencyInput } from '../../components/ui/currency-input'
import { FieldError, fieldClassName } from '../../components/ui/form-field'
import { AppSelect } from '../../components/ui/select'
import { t } from '../../lib/i18n'

const schema = z
  .object({
    type: z.enum(['expense', 'income', 'transfer']),
    description: z
      .string()
      .trim()
      .min(1, t('validation.required'))
      .min(2, t('quickAdd.invalidDescription')),
    amount: z.coerce.number().positive(t('quickAdd.invalidAmount')),
    accountId: z.string().min(1, t('quickAdd.invalidAccount')),
    categoryId: z.string().optional(),
    transferAccountId: z.string().optional(),
    transactionDate: z.string().min(1, t('validation.invalidDate')),
    merchant: z.string().optional(),
  })
  .superRefine((values, context) => {
    if (values.type === 'transfer' && !values.transferAccountId) {
      context.addIssue({
        code: 'custom',
        path: ['transferAccountId'],
        message: t('quickAdd.invalidDestination'),
      })
    }
  })

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

export function QuickAddModal() {
  const { quickAddOpen, quickAddType, closeQuickAdd } = useUIStore()
  const queryClient = useQueryClient()
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: () => getAccounts() })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      type:
        quickAddType === 'income' ? 'income' : quickAddType === 'transfer' ? 'transfer' : 'expense',
      transactionDate: todayIso(),
      amount: 0,
      accountId: '',
    },
  })
  const type = form.watch('type')
  const mutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      closeQuickAdd()
      form.reset({ type: 'expense', transactionDate: todayIso(), amount: 0, accountId: '' })
      toast.success(t('quickAdd.saved'))
    },
    onError: () => toast.error(t('quickAdd.error')),
  })

  return (
    <AppModal
      isOpen={quickAddOpen}
      onRequestClose={closeQuickAdd}
      eyebrow={t('quickAdd.eyebrow')}
      title={t('quickAdd.title')}
    >
      <form
        className="form__stack"
        onSubmit={form.handleSubmit((values) =>
          mutation.mutate({ ...values, currency: 'EUR', labelIds: [] }),
        )}
      >
        <div className="segmented-control">
          {(['expense', 'income', 'transfer'] as const).map((value) => (
            <button
              type="button"
              key={value}
              className={type === value ? 'is-selected' : ''}
              onClick={() => form.setValue('type', value)}
            >
              {value === 'expense'
                ? t('common.expense')
                : value === 'income'
                  ? t('common.incomeSingular')
                  : t('common.transfer')}
            </button>
          ))}
        </div>
        <label className="form__field">
          <span>{t('common.description')}</span>
          <input
            placeholder={t('quickAdd.descriptionPlaceholder')}
            className={fieldClassName(Boolean(form.formState.errors.description))}
            aria-invalid={Boolean(form.formState.errors.description)}
            aria-describedby="quick-add-description-error"
            {...form.register('description')}
          />
          <FieldError
            id="quick-add-description-error"
            message={form.formState.errors.description?.message}
          />
        </label>
        <div className="form__grid--two">
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
                  aria-describedby="quick-add-amount-error"
                  currency="EUR"
                  placeholder={t('quickAdd.amountPlaceholder')}
                />
              )}
            />
            <FieldError
              id="quick-add-amount-error"
              message={form.formState.errors.amount?.message}
            />
          </label>
          <label className="form__field">
            <span>{t('common.date')}</span>
            <input
              type="date"
              className={fieldClassName(Boolean(form.formState.errors.transactionDate))}
              aria-invalid={Boolean(form.formState.errors.transactionDate)}
              aria-describedby="quick-add-date-error"
              {...form.register('transactionDate')}
            />
            <FieldError
              id="quick-add-date-error"
              message={form.formState.errors.transactionDate?.message}
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
                options={(accountsQuery.data ?? []).map((account) => ({
                  value: account.id,
                  label: account.name,
                }))}
                invalid={Boolean(form.formState.errors.accountId)}
                describedBy="quick-add-account-error"
                isSearchable
                isClearable
              />
            )}
          />
          <FieldError
            id="quick-add-account-error"
            message={form.formState.errors.accountId?.message}
          />
        </label>
        {type === 'transfer' ? (
          <label className="form__field">
            <span>{t('quickAdd.destinationAccount')}</span>
            <Controller
              control={form.control}
              name="transferAccountId"
              render={({ field }) => (
                <AppSelect
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={t('common.noAccount')}
                  options={(accountsQuery.data ?? []).map((account) => ({
                    value: account.id,
                    label: account.name,
                  }))}
                  invalid={Boolean(form.formState.errors.transferAccountId)}
                  describedBy="quick-add-destination-error"
                  isSearchable
                  isClearable
                />
              )}
            />
            <FieldError
              id="quick-add-destination-error"
              message={form.formState.errors.transferAccountId?.message}
            />
          </label>
        ) : (
          <label className="form__field">
            <span>{t('common.category')}</span>
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <AppSelect
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={t('common.noCategory')}
                  options={(categoriesQuery.data ?? [])
                    .filter((category) => category.type === type)
                    .map((category) => ({ value: category.id, label: category.name }))}
                  isSearchable
                  isClearable
                />
              )}
            />
          </label>
        )}
        <label className="form__field">
          <span>{t('quickAdd.source')}</span>
          <input placeholder={t('common.optional')} {...form.register('merchant')} />
        </label>
        <div className="modal__actions">
          <Button type="button" variant="ghost" onClick={closeQuickAdd}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={mutation.isPending}>
            {mutation.isPending ? t('quickAdd.saving') : t('quickAdd.save')}
          </Button>
        </div>
      </form>
    </AppModal>
  )
}
