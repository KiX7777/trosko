import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { z } from 'zod'
import { createCategory, deleteCategory, getCategories, updateCategory } from '../../lib/repository'
import { Page } from '../../components/ui/page'
import { Button } from '../../components/ui/button'
import { Icon } from '../../components/ui/icon'
import { AppModal } from '../../components/ui/modal'
import { StatusPill } from '../../components/ui/status'
import { FieldError, fieldClassName } from '../../components/ui/form-field'
import { IconPicker } from '../../components/ui/icon-picker'
import { AppSelect } from '../../components/ui/select'
import { t } from '../../lib/i18n'
import { CATEGORY_COLORS } from '../../lib/constants'
import { CategoryBadge } from '../../components/ui/category-badge'
import { formatCategoryOption } from '../../components/ui/category-options'
import type { Category } from '../../types/domain'

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
  const [categoryModal, setCategoryModal] = useState<'create' | 'edit' | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<Category | null>(null)
  const [menuCategoryId, setMenuCategoryId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const categories = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const client = useQueryClient()
  const form = useForm<CategoryFormInput, unknown, CategoryFormOutput>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { type: 'expense', icon: 'sparkles', color: '#6bd8cb', parentId: '' },
  })
  useEffect(() => {
    if (!menuCategoryId) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuCategoryId(null)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [menuCategoryId])

  const refreshCategories = () => {
    void client.invalidateQueries({ queryKey: ['categories'] })
    void client.invalidateQueries({ queryKey: ['dashboard'] })
    void client.invalidateQueries({ queryKey: ['transactions'] })
    void client.invalidateQueries({ queryKey: ['recurring'] })
  }
  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      refreshCategories()
      setCategoryModal(null)
      form.reset({ type: 'expense', icon: 'sparkles', color: '#6bd8cb', parentId: '' })
      toast.success(t('categories.new'))
    },
    onError: () => {
      toast.error(t('categories.error'))
    },
  })
  const editMutation = useMutation({
    mutationFn: updateCategory,
    onSuccess: () => {
      refreshCategories()
      setCategoryModal(null)
      setSelectedCategory(null)
      toast.success(t('categories.updated'))
    },
    onError: () => toast.error(t('categories.error')),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      refreshCategories()
      setDeleteCategoryTarget(null)
      toast.success(t('categories.deleted'))
    },
    onError: () => toast.error(t('categories.error')),
  })

  const openCreate = () => {
    setSelectedCategory(null)
    form.reset({ type: 'expense', icon: 'sparkles', color: '#6bd8cb', parentId: '' })
    setCategoryModal('create')
  }
  const openEdit = (category: Category) => {
    setSelectedCategory(category)
    form.reset({
      name: category.name,
      type: category.type,
      icon: category.icon,
      color: category.color,
      parentId: category.parentId ?? '',
    })
    setMenuCategoryId(null)
    setCategoryModal('edit')
  }
  const closeCategoryModal = () => {
    setCategoryModal(null)
    setSelectedCategory(null)
  }
  const roots = categories.data?.filter((category) => !category.parentId) ?? []
  const parentOptions = roots.filter((root) => root.id !== selectedCategory?.id)
  const renderCategoryMenu = (category: Category) => (
    <div className="account-card__menu" ref={menuCategoryId === category.id ? menuRef : undefined}>
      <button
        type="button"
        aria-label={t('aria.optionsFor', { name: category.name })}
        aria-expanded={menuCategoryId === category.id}
        aria-haspopup="menu"
        onClick={() =>
          setMenuCategoryId((current) => (current === category.id ? null : category.id))
        }
      >
        <Icon name="more" size={18} />
      </button>
      {menuCategoryId === category.id && (
        <div className="account-card__menu-popover" role="menu">
          <button
            type="button"
            className="account-card__menu-action"
            role="menuitem"
            onClick={() => openEdit(category)}
          >
            <Icon name="pencil" size={16} /> {t('categories.edit')}
          </button>
          <button
            type="button"
            className="account-card__menu-action account-card__menu-action--danger"
            role="menuitem"
            onClick={() => {
              setMenuCategoryId(null)
              setDeleteCategoryTarget(category)
            }}
          >
            <Icon name="trash" size={16} /> {t('categories.delete')}
          </button>
        </div>
      )}
    </div>
  )
  return (
    <Page
      eyebrow={t('page.taxonomy')}
      title={t('categories.title')}
      description={t('categories.description')}
      action={
        <Button variant="primary" onClick={openCreate}>
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
              {renderCategoryMenu(category)}
            </div>
            <h3>
              <CategoryBadge category={category} />
            </h3>
            <StatusPill tone={category.type === 'income' ? 'positive' : 'neutral'}>
              {category.type === 'income' ? t('common.incomeType') : t('common.expenseType')}
            </StatusPill>
            <div className="category-management__subcategories">
              {categories.data
                ?.filter((child) => child.parentId === category.id)
                .map((child) => (
                  <div className="category-management__subcategory" key={child.id}>
                    <Icon name="chevron-right" size={14} />
                    <span className="category-management__subcategory-name">
                      <CategoryBadge category={child} size="small" />
                    </span>
                    {renderCategoryMenu(child)}
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
        isOpen={categoryModal !== null}
        onRequestClose={closeCategoryModal}
        eyebrow={t('page.taxonomy')}
        title={categoryModal === 'edit' ? t('categories.editTitle') : t('categories.new')}
      >
        <form
          className="form__stack"
          onSubmit={form.handleSubmit((values) => {
            if (categoryModal === 'edit' && selectedCategory) {
              editMutation.mutate({ ...values, id: selectedCategory.id })
            } else {
              createMutation.mutate(values)
            }
          })}
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
          <Controller
            control={form.control}
            name="color"
            render={({ field }) => (
              <div className="form__field category-color-field">
                <span>{t('categories.color')}</span>
                <div className="category-color-options">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      type="button"
                      key={color}
                      className={`category-color-option${field.value === color ? ' is-selected' : ''}`}
                      style={{ backgroundColor: color }}
                      aria-label={color}
                      aria-pressed={field.value === color}
                      onClick={() => field.onChange(color)}
                    />
                  ))}
                  <label className="category-color-custom" title={t('categories.customColor')}>
                    <input
                      type="color"
                      value={field.value}
                      aria-label={t('categories.customColor')}
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                    <Icon name="pencil" size={14} />
                  </label>
                </div>
              </div>
            )}
          />
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
                  options={parentOptions.map((root) => ({ value: root.id, label: root.name }))}
                  formatOptionLabel={formatCategoryOption(parentOptions)}
                  isClearable
                />
              )}
            />
          </label>
          <div className="modal__actions">
            <Button type="button" variant="ghost" onClick={closeCategoryModal}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createMutation.isPending || editMutation.isPending}
            >
              {createMutation.isPending || editMutation.isPending
                ? t('categories.saving')
                : categoryModal === 'edit'
                  ? t('categories.saveChanges')
                  : t('categories.save')}
            </Button>
          </div>
        </form>
      </AppModal>
      <AppModal
        isOpen={deleteCategoryTarget !== null}
        onRequestClose={() => setDeleteCategoryTarget(null)}
        eyebrow={t('categories.delete')}
        title={t('categories.deleteTitle')}
        width={440}
      >
        <div className="confirm-modal">
          <p>
            {deleteCategoryTarget
              ? t('categories.deleteDescription', { name: deleteCategoryTarget.name })
              : ''}
          </p>
          <div className="modal__actions">
            <Button type="button" variant="ghost" onClick={() => setDeleteCategoryTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={() => deleteCategoryTarget && deleteMutation.mutate(deleteCategoryTarget.id)}
            >
              {t('categories.delete')}
            </Button>
          </div>
        </div>
      </AppModal>
    </Page>
  )
}
