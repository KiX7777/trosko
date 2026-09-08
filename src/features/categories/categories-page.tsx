import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { z } from 'zod'
import { createCategory, getCategories } from '../../lib/repository'
import { Page } from '../../components/ui/page'
import { Button } from '../../components/ui/button'
import { Icon } from '../../components/ui/icon'
import { AppModal } from '../../components/ui/modal'
import { StatusPill } from '../../components/ui/status'
import { FieldError, fieldClassName } from '../../components/ui/form-field'
import { IconPicker } from '../../components/ui/icon-picker'
import { AppSelect } from '../../components/ui/select'
import { t } from '../../lib/i18n'

const schema = z.object({
  name: z.string().trim().min(1, t('validation.required')).min(2, t('validation.minTwoChars')),
  type: z.enum(['expense', 'income']),
  icon: z.string().min(1, t('validation.required')),
  color: z.string(),
  parentId: z
    .string()
    .optional()
    .transform((value) => value || undefined),
})
type CategoryFormInput = z.input<typeof schema>
type CategoryFormOutput = z.output<typeof schema>

export function CategoriesPage() {
  const [open, setOpen] = useState(false)
  const categories = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const client = useQueryClient()
  const form = useForm<CategoryFormInput, unknown, CategoryFormOutput>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { type: 'expense', icon: 'sparkles', color: '#6bd8cb', parentId: '' },
  })
  const mutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['categories'] })
      setOpen(false)
      form.reset({ type: 'expense', icon: 'sparkles', color: '#6bd8cb', parentId: '' })
      toast.success(t('categories.new'))
    },
    onError: () => {
      toast.error(t('categories.error'))
    },
  })
  const roots = categories.data?.filter((category) => !category.parentId) ?? []
  return (
    <Page
      eyebrow={t('page.taxonomy')}
      title={t('categories.title')}
      description={t('categories.description')}
      action={
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Icon name="plus" size={17} /> {t('categories.new')}
        </Button>
      }
    >
      <div className="category-management__grid">
        {roots.map((category) => (
          <article className="card category-management__card" key={category.id}>
            <div className="category-management__header">
              <span
                className="category-management__icon"
                style={{ background: `${category.color}25`, color: category.color }}
              >
                <Icon name={category.icon} size={19} />
              </span>
              <Button variant="icon" aria-label={t('aria.optionsFor', { name: category.name })}>
                <Icon name="more" size={17} />
              </Button>
            </div>
            <h3>{category.name}</h3>
            <StatusPill tone={category.type === 'income' ? 'positive' : 'neutral'}>
              {category.type === 'income' ? t('common.incomeType') : t('common.expenseType')}
            </StatusPill>
            <div className="category-management__subcategories">
              {categories.data
                ?.filter((child) => child.parentId === category.id)
                .map((child) => (
                  <div key={child.id}>
                    <Icon name="chevron-right" size={14} />
                    <span>{child.name}</span>
                  </div>
                ))}
              {!categories.data?.some((child) => child.parentId === category.id) && (
                <span className="table__muted">{t('categories.noSubcategories')}</span>
              )}
            </div>
          </article>
        ))}
      </div>
      <AppModal
        isOpen={open}
        onRequestClose={() => setOpen(false)}
        eyebrow={t('page.taxonomy')}
        title={t('categories.new')}
      >
        <form
          className="form__stack"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <label className="form__field">
            <span>{t('common.name')}</span>
            <input
              placeholder={t('categories.namePlaceholder')}
              className={fieldClassName(Boolean(form.formState.errors.name))}
              aria-invalid={Boolean(form.formState.errors.name)}
              aria-describedby="category-name-error"
              {...form.register('name')}
            />
            <FieldError id="category-name-error" message={form.formState.errors.name?.message} />
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
                      { value: 'expense', label: t('common.expenseType') },
                      { value: 'income', label: t('common.incomeType') },
                    ]}
                    invalid={Boolean(form.formState.errors.type)}
                    describedBy="category-type-error"
                  />
                )}
              />
              <FieldError id="category-type-error" message={form.formState.errors.type?.message} />
            </label>
            <label className="form__field">
              <span>{t('common.icon')}</span>
              <Controller
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <IconPicker
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    invalid={Boolean(form.formState.errors.icon)}
                    describedBy="category-icon-error"
                  />
                )}
              />
              <FieldError id="category-icon-error" message={form.formState.errors.icon?.message} />
            </label>
          </div>
          <label className="form__field">
            <span>{t('categories.subcategoryOf')}</span>
            <Controller
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <AppSelect
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={t('common.mainCategory')}
                  options={roots.map((root) => ({ value: root.id, label: root.name }))}
                  isClearable
                />
              )}
            />
          </label>
          <div className="modal__actions">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={mutation.isPending}>
              {mutation.isPending ? t('categories.saving') : t('categories.save')}
            </Button>
          </div>
        </form>
      </AppModal>
    </Page>
  )
}
