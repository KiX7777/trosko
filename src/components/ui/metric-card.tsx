import NumberFlow from '@number-flow/react'
import { Icon } from './icon'

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
      <strong>
        <NumberFlow
          value={value}
          locales="hr-HR"
          format={{
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 2,
          }}
        />
      </strong>
    </article>
  )
}
