import { useMemo } from 'react'
import { barX, barY, defineChart, group, stack } from '@tanstack/charts'
import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { Chart } from '@tanstack/charts/react'
import { tooltip } from '@tanstack/charts/tooltip'
import type { DashboardSummary } from '../../types/domain'
import { t } from '../../lib/i18n'

type CashFlowPoint = DashboardSummary['cashFlow'][number]
type CategoryBreakdown = DashboardSummary['categoryBreakdown'][number]

type CashFlowSeriesPoint = {
  label: string
  series: 'income' | 'expenses'
  amount: number
}

const chartColors = {
  income: 'var(--shell-income)',
  expenses: 'var(--shell-expense)',
} as const

export function CashFlowChart({
  data,
  height = 220,
  ariaLabel,
}: {
  data: readonly CashFlowPoint[]
  height?: number
  ariaLabel: string
}) {
  const rows = useMemo<CashFlowSeriesPoint[]>(
    () =>
      data.flatMap((point) => [
        { label: point.label, series: 'income', amount: point.income },
        { label: point.label, series: 'expenses', amount: point.expenses },
      ]),
    [data],
  )

  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          barY(rows, {
            id: 'cash-flow',
            x: 'label',
            y: 'amount',
            color: 'series',
            layout: group({ padding: 0.18 }),
            radius: 4,
            maxThickness: 18,
          }),
        ],
        scales: {
          x: { scale: () => scaleBand<string>().padding(0.2) },
          y: {
            scale: scaleLinear,
            nice: true,
            grid: true,
            axis: {
              ticks: {
                count: 4,
                format: (value) => `${Math.round(value)} €`,
              },
            },
          },
        },
        color: {
          domain: ['income', 'expenses'],
          range: [chartColors.income, chartColors.expenses],
        },
        tooltip,
      }),
    [rows],
  )

  return (
    <div className="chart__container chart--cashflow">
      <Chart
        definition={definition}
        height={height}
        ariaLabel={ariaLabel}
        ariaDescription={t('analytics.chartDescription')}
      />
    </div>
  )
}

export function ExpenseBreakdownRailChart({
  data,
  ariaLabel,
}: {
  data: readonly CategoryBreakdown[]
  ariaLabel: string
}) {
  const rows = useMemo(() => data.map((item) => ({ ...item, group: 'expenses' })), [data])
  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          barX(rows, {
            id: 'expense-breakdown-rail',
            x: 'percentage',
            y: 'group',
            color: 'categoryId',
            key: 'categoryId',
            layout: stack(),
          }),
        ],
        scales: {
          x: { scale: scaleLinear, nice: false },
          y: { scale: () => scaleBand<string>().padding(0.12) },
        },
        guides: false,
        color: {
          domain: rows.map((item) => item.categoryId),
          range: rows.map((item) => item.color),
        },
      }),
    [rows],
  )

  return (
    <div className="chart__container chart--category-rail">
      <Chart definition={definition} height={22} ariaLabel={ariaLabel} />
    </div>
  )
}

export function ExpenseDistributionChart({
  data,
  ariaLabel,
}: {
  data: readonly CategoryBreakdown[]
  ariaLabel: string
}) {
  const slices = useMemo(() => pie(data, { value: 'amount', gapAngle: 0.035 }), [data])
  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          polar({
            id: 'expense-distribution',
            inset: 4,
            radiusRatio: 0.9,
            marks: [
              radialArc(slices, {
                innerRadius: ({ radius }) => radius * 0.62,
                cornerRadius: 4,
                color: 'categoryId',
                key: 'categoryId',
              }),
            ],
            scales: {
              angle: null,
              radius: null,
            },
          }),
        ],
        scales: {
          x: null,
          y: null,
        },
        guides: false,
        color: {
          domain: data.map((item) => item.categoryId),
          range: data.map((item) => item.color),
        },
        tooltip,
      }),
    [data, slices],
  )

  return (
    <div className="chart__container donut__chart">
      <Chart definition={definition} height={176} ariaLabel={ariaLabel} />
    </div>
  )
}

export function MerchantProgressChart({
  amount,
  maxAmount,
  ariaLabel,
}: {
  amount: number
  maxAmount: number
  ariaLabel: string
}) {
  const rows = useMemo(() => [{ merchant: 'merchant', amount }], [amount])
  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          barX(rows, {
            id: 'merchant__progress',
            x: 'amount',
            y: 'merchant',
            fill: 'var(--shell-primary)',
          }),
        ],
        scales: {
          x: { scale: scaleLinear([0, Math.max(maxAmount, 1)]) },
          y: { scale: () => scaleBand<string>().padding(0) },
        },
        guides: false,
      }),
    [maxAmount, rows],
  )

  return (
    <div className="chart__container merchant__progress">
      <Chart definition={definition} height={6} ariaLabel={ariaLabel} />
    </div>
  )
}
