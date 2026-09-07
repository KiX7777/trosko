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
import { t } from '../../lib/i18n'

const schema = z.object({
  type: z.enum(['expense', 'income', 'transfer']),
  description: z.string().min(2, t('quickAdd.invalidDescription')),
  amount: z.coerce.number().positive(t('quickAdd.invalidAmount')),
  accountId: z.string().min(1, t('quickAdd.invalidAccount')),
  categoryId: z.string().optional(),
  transferAccountId: z.string().optional(),
  transactionDate: z.string().min(1),
  merchant: z.string().optional(),
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
        className="form-stack"
        onSubmit={form.handleSubmit((values) =>
          mutation.mutate({ ...values, currency: 'EUR', labelIds: [] }),
        )}
      >
        <div className="segmented-control">
          {(['expense', 'income', 'transfer'] as const).map((value) => (
            <button
              type="button"
              key={value}
              className={type === value ? 'selected' : ''}
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
        <label className="form-field">
          <span>{t('common.description')}</span>
          <input
            placeholder={t('quickAdd.descriptionPlaceholder')}
            {...form.register('description')}
          />
          {form.formState.errors.description && (
            <small>{form.formState.errors.description.message}</small>
          )}
        </label>
        <div className="form-grid-2">
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
            {form.formState.errors.amount && <small>{form.formState.errors.amount.message}</small>}
          </label>
          <label className="form-field">
            <span>{t('common.date')}</span>
            <input type="date" {...form.register('transactionDate')} />
          </label>
        </div>
        <label className="form-field">
          <span>{t('common.account')}</span>
          <select {...form.register('accountId')}>
            <option value="">{t('common.noAccount')}</option>
            {accountsQuery.data?.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          {form.formState.errors.accountId && (
            <small>{form.formState.errors.accountId.message}</small>
          )}
        </label>
        {type === 'transfer' ? (
          <label className="form-field">
            <span>{t('quickAdd.destinationAccount')}</span>
            <select {...form.register('transferAccountId')}>
              <option value="">{t('common.noAccount')}</option>
              {accountsQuery.data?.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="form-field">
            <span>{t('common.category')}</span>
            <select {...form.register('categoryId')}>
              <option value="">{t('common.noCategory')}</option>
              {categoriesQuery.data
                ?.filter((category) => category.type === type)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label className="form-field">
          <span>{t('quickAdd.source')}</span>
          <input placeholder={t('common.optional')} {...form.register('merchant')} />
        </label>
        <div className="modal-actions">
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
