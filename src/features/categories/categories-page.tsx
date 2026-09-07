import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { z } from 'zod'
import { createCategory, getCategories } from '../../lib/repository'
import { Page } from '../../components/ui/page'
import { Button } from '../../components/ui/button'
import { Icon } from '../../components/ui/icon'
import { AppModal } from '../../components/ui/modal'
import { StatusPill } from '../../components/ui/status-pill'
import { t } from '../../lib/i18n'

const schema = z.object({
  name: z.string().min(2),
  type: z.enum(['expense', 'income']),
  icon: z.string().min(1),
  color: z.string(),
  parentId: z.string().optional(),
})

export function CategoriesPage() {
  const [open, setOpen] = useState(false)
  const categories = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const client = useQueryClient()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'expense', icon: 'sparkles', color: '#6bd8cb' },
  })
  const mutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['categories'] })
      setOpen(false)
      form.reset({ type: 'expense', icon: 'sparkles', color: '#6bd8cb' })
      toast.success(t('categories.new'))
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
      <div className="category-management-grid">
        {roots.map((category) => (
          <article className="surface-card category-management-card" key={category.id}>
            <div className="category-management-header">
              <span
                className="category-color-icon"
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
            <div className="subcategory-list">
              {categories.data
                ?.filter((child) => child.parentId === category.id)
                .map((child) => (
                  <div key={child.id}>
                    <Icon name="chevron-right" size={14} />
                    <span>{child.name}</span>
                  </div>
                ))}
              {!categories.data?.some((child) => child.parentId === category.id) && (
                <span className="table-muted">{t('categories.noSubcategories')}</span>
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
          className="form-stack"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <label className="form-field">
            <span>{t('common.name')}</span>
            <input placeholder={t('categories.namePlaceholder')} {...form.register('name')} />
          </label>
          <div className="form-grid-2">
            <label className="form-field">
              <span>{t('common.type')}</span>
              <select {...form.register('type')}>
                <option value="expense">{t('common.expenseType')}</option>
                <option value="income">{t('common.incomeType')}</option>
              </select>
            </label>
            <label className="form-field">
              <span>{t('common.icon')}</span>
              <select {...form.register('icon')}>
                <option value="sparkles">{t('common.sparkles')}</option>
                <option value="shopping-cart">{t('common.shoppingCart')}</option>
                <option value="house">{t('common.house')}</option>
                <option value="fuel">{t('common.fuel')}</option>
                <option value="briefcase-business">{t('common.briefcase')}</option>
              </select>
            </label>
          </div>
          <label className="form-field">
            <span>{t('categories.subcategoryOf')}</span>
            <select {...form.register('parentId')}>
              <option value="">{t('common.mainCategory')}</option>
              {roots.map((root) => (
                <option key={root.id} value={root.id}>
                  {root.name}
                </option>
              ))}
            </select>
          </label>
          <div className="modal-actions">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary">
              {t('categories.save')}
            </Button>
          </div>
        </form>
      </AppModal>
    </Page>
  )
}
