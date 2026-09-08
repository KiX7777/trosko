import type { CSSProperties } from 'react'
import type { Category } from '../../types/domain'
import { Icon } from './icon'

type CategoryBadgeProps = {
  category: Pick<Category, 'name' | 'color'> & { icon?: string }
  showIcon?: boolean
  size?: 'small' | 'default' | 'large'
  className?: string
}

export function CategoryBadge({
  category,
  showIcon = false,
  size = 'default',
  className = '',
}: CategoryBadgeProps) {
  return (
    <span
      className={`category-badge category-badge--${size} ${className}`.trim()}
      style={{ '--category-color': category.color } as CSSProperties}
    >
      {showIcon && category.icon ? (
        <span className="category-badge__icon">
          <Icon name={category.icon} size={size === 'large' ? 17 : 14} />
        </span>
      ) : (
        <span className="category-badge__dot" aria-hidden="true" />
      )}
      <span className="category-badge__label">{category.name}</span>
    </span>
  )
}
