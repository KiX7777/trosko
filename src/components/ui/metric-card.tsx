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
    <article className={`metric-panel ${tone}`}>
      <div className="metric-panel-top">
        <span className="metric-panel-label">
          <Icon name={icon} size={15} />
          {label}
        </span>
        {delta && <span className="metric-delta">{delta}</span>}
      </div>
      <strong>{formatCurrency(value)}</strong>
    </article>
  )
}
