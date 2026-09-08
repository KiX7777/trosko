import type { ReactNode } from 'react'
import type { Category } from '../../types/domain'
import type { SelectOption } from './select'
import { CategoryBadge } from './category-badge'

export function formatCategoryOption(
  categories: readonly Category[],
): (option: SelectOption) => ReactNode {
  const categoryMap = new Map(categories.map((category) => [category.id, category]))
  return (option) => {
    const category = categoryMap.get(option.value)
    return category ? <CategoryBadge category={category} size="small" /> : option.label
  }
}
