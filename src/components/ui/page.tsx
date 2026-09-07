import type { PropsWithChildren, ReactNode } from 'react'
import { Button } from './button'
import { Icon } from './icon'
import { t } from '../../lib/i18n'

export function Page({
  eyebrow,
  title,
  description,
  action,
  children,
}: PropsWithChildren<{
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}>) {
  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

export function EmptyState({
  icon = 'sparkles',
  title,
  text,
  action,
}: {
  icon?: string
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={22} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action ?? (
        <Button variant="secondary">
          <Icon name="plus" size={16} /> {t('common.addFirstRecord')}
        </Button>
      )}
    </div>
  )
}
