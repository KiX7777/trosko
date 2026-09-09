import { useMemo } from 'react'
import { eachDayOfInterval, endOfMonth, format, parseISO, startOfMonth } from 'date-fns'
import { hr } from 'date-fns/locale'
import { areaY, barX, barY, defineChart, group, lineY, stack } from '@tanstack/charts'
import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { Chart } from '@tanstack/charts/react/core'
import { motion, stagger } from '@tanstack/charts/motion'
import { tooltip } from '@tanstack/charts/tooltip'
import type { DashboardSummary, Transaction } from '../../types/domain'
import { t } from '../../lib/i18n'
import { formatCurrency } from '../../lib/format'

type CashFlowPoint = DashboardSummary['cashFlow'][number]
type CategoryBreakdown = DashboardSummary['categoryBreakdown'][number]

type CashFlowSeriesPoint = {
  date: string
  series: 'income' | 'expenses'
  amount: number
}

function formatChartDate(value: string) {
  return format(parseISO(value), 'd.M.')
}

function formatPercentage(value: number) {
  return `${new Intl.NumberFormat('hr-HR', { maximumFractionDigits: 1 }).format(value)}%`
}

const chartColors = {
  income: 'var(--shell-income)',
  expenses: 'var(--shell-expense)',
} as const

const chartMotion = motion({
  initial: true,
  respectReducedMotion: true,
  transition: { type: 'tween', duration: 700, easing: 'ease-out' },
})

type DailyExpensePoint = {
  date: string
  day: number
  daily: number
  cumulative: number
}

export function DailyExpenseChart({
  transactions,
  month,
  height = 250,
  ariaLabel,
}: {
  transactions: readonly Transaction[]
  month: string
  height?: number
  ariaLabel: string
}) {
  const rows = useMemo<DailyExpensePoint[]>(() => {
    const monthStart = startOfMonth(parseISO(`${month}-01`))
    const monthEnd = endOfMonth(monthStart)
    const totalsByDate = new Map<string, number>()

    transactions.forEach((transaction) => {
      totalsByDate.set(
        transaction.transactionDate,
        (totalsByDate.get(transaction.transactionDate) ?? 0) + transaction.amountBase,
      )
    })

    return eachDayOfInterval({ start: monthStart, end: monthEnd }).reduce<DailyExpensePoint[]>(
      (points, date) => {
        const dateValue = format(date, 'yyyy-MM-dd')
        const daily = totalsByDate.get(dateValue) ?? 0
        const cumulative = (points.at(-1)?.cumulative ?? 0) + daily
        return [...points, { date: dateValue, day: date.getDate(), daily, cumulative }]
      },
      [],
    )
  }, [month, transactions])

  const definition = useMemo(
    () =>
      defineChart({
        motion: {
          transition: { type: 'tween', duration: 780, easing: 'ease-out' },
        },
        marks: [
          areaY(rows, {
            id: 'daily-expenses-area',
            x: 'day',
            y: 'cumulative',
            y1: 0,
            fill: 'var(--shell-primary)',
            fillOpacity: 0.16,
            motion: { transition: { type: 'tween', duration: 780, easing: 'ease-out' } },
          }),
          lineY(rows, {
            id: 'daily-expenses-line',
            x: 'day',
            y: 'cumulative',
            points: true,
            stroke: 'var(--shell-primary)',
            strokeWidth: 2.5,
            motion: { transition: { type: 'tween', duration: 780, easing: 'ease-out' } },
          }),
        ],
        scales: {
          x: {
            scale: scaleLinear,
            nice: false,
            domain: [1, rows.at(-1)?.day ?? 31],
            axis: {
              ticks: {
                count: Math.min(7, rows.length),
                format: (value) => `${Math.round(value)}.`,
              },
            },
          },
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
        tooltip: {
          use: tooltip,
          items: [
            {
              field: 'date',
              label: t('common.date'),
              text: (point) => format(parseISO(point.datum.date), 'd. MMMM', { locale: hr }),
            },
            {
              field: 'daily',
              label: t('dashboard.dailyExpense'),
              text: (point) => formatCurrency(point.datum.daily),
            },
            {
              field: 'cumulative',
              label: t('dashboard.cumulativeExpense'),
              text: (point) => formatCurrency(point.datum.cumulative),
            },
          ],
        },
      }),
    [rows],
  )

  return (
    <div className="chart__container chart--daily-expenses">
      <Chart
        renderer={chartMotion}
        definition={definition}
        height={height}
        ariaLabel={ariaLabel}
        ariaDescription={t('dashboard.dailyExpenseChartDescription')}
      />
    </div>
  )
}

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
        { date: point.date, series: 'income', amount: point.income },
        { date: point.date, series: 'expenses', amount: point.expenses },
      ]),
    [data],
  )

  const definition = useMemo(
    () =>
      defineChart({
        motion: {
          transition: { type: 'tween', duration: 700, easing: 'ease-out' },
          ...stagger({ each: 45, by: 'series', roles: ['bar'] }),
        },
        marks: [
          barY(rows, {
            id: 'cash-flow',
            x: 'date',
            y: 'amount',
            color: 'series',
            layout: group({ padding: 0.18 }),
            radius: 4,
            maxThickness: 18,
            motion: { transition: { type: 'tween', duration: 620, easing: 'ease-out' } },
          }),
        ],
        scales: {
          x: {
            scale: () => scaleBand<string>().padding(0.2),
            axis: {
              ticks: {
                format: (value) => formatChartDate(value),
              },
            },
          },
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
        tooltip: {
          use: tooltip,
          items: [
            {
              field: 'date',
              label: t('common.date'),
              text: (point) => formatChartDate(point.datum.date),
            },
            {
              field: 'series',
              label: t('common.type'),
              text: (point) =>
                point.datum.series === 'income'
                  ? t('common.income')
                  : t('common.expenses'),
            },
            {
              field: 'amount',
              label: t('common.amount'),
              text: (point) => formatCurrency(point.datum.amount),
            },
          ],
        },
      }),
    [rows],
  )

  return (
    <div className="chart__container chart--cashflow">
      <Chart
        renderer={chartMotion}
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
        motion: {
          transition: { type: 'tween', duration: 650, easing: 'ease-out' },
        },
        marks: [
          barX(rows, {
            id: 'expense-breakdown-rail',
            x: 'percentage',
            y: 'group',
            color: 'name',
            key: 'categoryId',
            layout: stack(),
            motion: { transition: { type: 'tween', duration: 650, easing: 'ease-out' } },
          }),
        ],
        scales: {
          x: { scale: scaleLinear, nice: false },
          y: { scale: () => scaleBand<string>().padding(0.12) },
        },
        guides: false,
        color: {
          domain: rows.map((item) => item.name),
          range: rows.map((item) => item.color),
        },
        tooltip: {
          use: tooltip,
          items: [
            { field: 'name', label: t('common.category') },
            {
              field: 'amount',
              label: t('common.amount'),
              text: (point) => formatCurrency(point.datum.amount),
            },
            {
              field: 'percentage',
              label: t('analytics.tooltipShare'),
              text: (point) => formatPercentage(point.datum.percentage),
            },
          ],
        },
      }),
    [rows],
  )

  return (
    <div className="chart__container chart--category-rail">
      <Chart renderer={chartMotion} definition={definition} height={22} ariaLabel={ariaLabel} />
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
        motion: {
          transition: { type: 'tween', duration: 850, easing: 'ease-out' },
        },
        marks: [
          polar({
            id: 'expense-distribution',
            inset: 4,
            radiusRatio: 0.9,
            marks: [
              radialArc(slices, {
                innerRadius: ({ radius }) => radius * 0.62,
                cornerRadius: 4,
                color: 'name',
                key: 'categoryId',
                motion: { transition: { type: 'tween', duration: 850, easing: 'ease-out' } },
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
          domain: data.map((item) => item.name),
          range: data.map((item) => item.color),
        },
        tooltip: {
          use: tooltip,
          items: [
            { field: 'name', label: t('common.category') },
            {
              field: 'amount',
              label: t('common.amount'),
              text: (point) => formatCurrency(point.datum.amount),
            },
            {
              field: 'percentage',
              label: t('analytics.tooltipShare'),
              text: (point) => formatPercentage(point.datum.percentage),
            },
          ],
        },
      }),
    [data, slices],
  )

  return (
    <div className="chart__container donut__chart">
      <Chart renderer={chartMotion} definition={definition} height={176} ariaLabel={ariaLabel} />
    </div>
  )
}

export function MerchantProgressChart({
  merchant,
  count,
  amount,
  maxAmount,
  ariaLabel,
}: {
  merchant: string
  count: number
  amount: number
  maxAmount: number
  ariaLabel: string
}) {
  const rows = useMemo(
    () => [
      {
        merchant,
        amount,
        count,
        share: maxAmount > 0 ? (amount / maxAmount) * 100 : 0,
      },
    ],
    [amount, count, maxAmount, merchant],
  )
  const definition = useMemo(
    () =>
      defineChart({
        motion: {
          transition: { type: 'tween', duration: 560, easing: 'ease-out' },
        },
        marks: [
          barX(rows, {
            id: 'merchant__progress',
            x: 'amount',
            y: 'merchant',
            fill: 'var(--shell-primary)',
            motion: { transition: { type: 'tween', duration: 560, easing: 'ease-out' } },
          }),
        ],
        scales: {
          x: { scale: scaleLinear().domain([0, Math.max(maxAmount, 1)]) },
          y: { scale: () => scaleBand<string>().padding(0) },
        },
        guides: false,
        tooltip: {
          use: tooltip,
          items: [
            { field: 'merchant', label: t('analytics.tooltipMerchant') },
            {
              field: 'amount',
              label: t('common.amount'),
              text: (point) => formatCurrency(point.datum.amount),
            },
            { field: 'count', label: t('analytics.tooltipTransactions') },
            {
              field: 'share',
              label: t('analytics.tooltipShare'),
              text: (point) => formatPercentage(point.datum.share),
            },
          ],
        },
      }),
    [maxAmount, rows],
  )

  return (
    <div className="chart__container merchant__progress">
      <Chart renderer={chartMotion} definition={definition} height={6} ariaLabel={ariaLabel} />
    </div>
  )
}
