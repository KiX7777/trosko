import { Icon } from './icon'
import { formatCurrency } from '../../lib/format'

export function MetricCard({
  label,
  value,
  delta,
  icon,
  tone = 'neutral',
}: {
  label: string
  value: number
  delta?: string
  icon: string
  tone?: 'neutral' | 'income' | 'expense' | 'warning'
}) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__top">
        <span className="metric-card__label">
          <Icon name={icon} size={15} />
          {label}
        </span>
        {delta && <span className="metric-card__delta">{delta}</span>}
      </div>
      <strong>{formatCurrency(value)}</strong>
    </article>
  )
}
