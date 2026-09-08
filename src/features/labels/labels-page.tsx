import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { z } from 'zod'
import { createLabel, getLabels, getTransactions } from '../../lib/repository'
import { Page } from '../../components/ui/page'
import { Button } from '../../components/ui/button'
import { Icon } from '../../components/ui/icon'
import { AppModal } from '../../components/ui/modal'
import { FieldError, fieldClassName } from '../../components/ui/form-field'
import { t } from '../../lib/i18n'

const schema = z.object({
  name: z.string().trim().min(1, t('validation.required')).min(2, t('validation.minTwoChars')),
  color: z.string().min(1, t('validation.required')),
})

export function LabelsPage() {
  const [open, setOpen] = useState(false)
  const labels = useQuery({ queryKey: ['labels'], queryFn: getLabels })
  const transactions = useQuery({ queryKey: ['transactions'], queryFn: () => getTransactions() })
  const client = useQueryClient()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { color: '#6bd8cb' },
  })
  const mutation = useMutation({
    mutationFn: createLabel,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['labels'] })
      setOpen(false)
      form.reset({ color: '#6bd8cb' })
      toast.success(t('labels.new'))
    },
  })
  return (
    <Page
      eyebrow={t('page.taxonomy')}
      title={t('labels.title')}
      description={t('labels.description')}
      action={
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Icon name="plus" size={17} /> {t('labels.new')}
        </Button>
      }
    >
      <div className="labels__grid">
        {(labels.data ?? []).map((label) => (
          <article className="card labels__card" key={label.id}>
            <div className="labels__card-top">
              <span className="labels__swatch" style={{ background: label.color }} />
              <Button variant="icon" aria-label={t('aria.optionsFor', { name: label.name })}>
                <Icon name="more" size={17} />
              </Button>
            </div>
            <h3>{label.name}</h3>
            <p>
              {transactions.data?.filter((transaction) => transaction.labelIds.includes(label.id))
                .length ?? 0}{' '}
              {t('common.transactions')}
            </p>
            <div className="labels__bar">
              <span
                style={{
                  background: label.color,
                  width: `${Math.min(100, (transactions.data?.filter((transaction) => transaction.labelIds.includes(label.id)).length ?? 0) * 18 + 12)}%`,
                }}
              />
            </div>
          </article>
        ))}
      </div>
      <AppModal
        isOpen={open}
        onRequestClose={() => setOpen(false)}
        eyebrow={t('page.taxonomy')}
        title={t('labels.new')}
      >
        <form
          className="form__stack"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <label className="form__field">
            <span>{t('common.name')}</span>
            <input
              placeholder={t('labels.namePlaceholder')}
              className={fieldClassName(Boolean(form.formState.errors.name))}
              aria-invalid={Boolean(form.formState.errors.name)}
              aria-describedby="label-name-error"
              {...form.register('name')}
            />
            <FieldError id="label-name-error" message={form.formState.errors.name?.message} />
          </label>
          <label className="form__field">
            <span>{t('common.color')}</span>
            <input
              type="color"
              className={fieldClassName(Boolean(form.formState.errors.color))}
              aria-invalid={Boolean(form.formState.errors.color)}
              aria-describedby="label-color-error"
              {...form.register('color')}
            />
            <FieldError id="label-color-error" message={form.formState.errors.color?.message} />
          </label>
          <div className="modal__actions">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary">
              {t('labels.save')}
            </Button>
          </div>
        </form>
      </AppModal>
    </Page>
  )
}
