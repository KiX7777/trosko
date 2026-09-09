import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { hr } from 'date-fns/locale'
import { DayPicker, type DateRange } from 'react-day-picker'
import 'react-day-picker/style.css'
import { getDashboardSummary, getTransactions } from '../../lib/repository'
import { formatCurrency } from '../../lib/format'
import { Page } from '../../components/ui/page'
import { MetricCard } from '../../components/ui/metric-card'
import { Icon } from '../../components/ui/icon'
import { CategoryBadge } from '../../components/ui/category-badge'
import { AppModal } from '../../components/ui/modal'
import { Button } from '../../components/ui/button'
import { AppSelect, type SelectOption } from '../../components/ui/select'
import {
  CashFlowChart,
  DailyExpenseChart,
  ExpenseDistributionChart,
  MerchantProgressChart,
} from '../../components/ui/tanstack-charts'
import { t } from '../../lib/i18n'

const tabs = [
  'analytics.tabOverview',
  'analytics.tabIncomeExpenses',
  'analytics.tabCategories',
  'analytics.tabAccounts',
  'analytics.tabCashFlow',
  'analytics.tabRecurring',
  'analytics.tabLabels',
] as const

type AnalyticsTab = (typeof tabs)[number]

const tabRoutes: Partial<Record<AnalyticsTab, string>> = {
  'analytics.tabAccounts': '/accounts',
  'analytics.tabRecurring': '/recurring',
  'analytics.tabLabels': '/labels',
}

function toDateValue(date: Date | undefined) {
  return date ? format(date, 'yyyy-MM-dd') : undefined
}

function formatRangeLabel(range: DateRange | undefined) {
  if (!range?.from) return t('analytics.chooseDateRange')
  const from = format(range.from, 'dd. MMM yyyy.', { locale: hr })
  const to = range.to ? format(range.to, 'dd. MMM yyyy.', { locale: hr }) : '…'
  return `${from} – ${to}`
}

function useCompactDatePicker() {
  const [isCompact, setIsCompact] = useState(() => {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 736px)').matches
    )
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const mediaQuery = window.matchMedia('(max-width: 736px)')
    const update = () => setIsCompact(mediaQuery.matches)
    update()
    mediaQuery.addEventListener?.('change', update)

    return () => mediaQuery.removeEventListener?.('change', update)
  }, [])

  return isCompact
}

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(tabs[0])
  const navigate = useNavigate()
  const defaultRange = useMemo<DateRange>(
    () => ({ from: subMonths(new Date(), 1), to: new Date() }),
    [],
  )
  const [filterOpen, setFilterOpen] = useState(false)
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(defaultRange)
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange)
  const currentMonth = format(new Date(), 'yyyy-MM')
  const [expenseMonth, setExpenseMonth] = useState(currentMonth)
  const expenseMonthDate = new Date(`${expenseMonth}-01T12:00:00`)
  const expenseMonthStart = format(startOfMonth(expenseMonthDate), 'yyyy-MM-dd')
  const expenseMonthEnd = format(endOfMonth(expenseMonthDate), 'yyyy-MM-dd')
  const isCompactDatePicker = useCompactDatePicker()
  const summary = useQuery({
    queryKey: ['analytics', toDateValue(dateRange.from), toDateValue(dateRange.to)],
    queryFn: () =>
      getDashboardSummary({
        dateFrom: toDateValue(dateRange.from),
        dateTo: toDateValue(dateRange.to),
      }),
  })
  const dailyExpenseTransactions = useQuery({
    queryKey: ['analytics', 'daily-expenses', expenseMonth],
    queryFn: () =>
      getTransactions({
        types: ['expense'],
        dateFrom: expenseMonthStart,
        dateTo: expenseMonthEnd,
      }),
  })
  const data = summary.data
  const expenseMonthOptions = useMemo<SelectOption[]>(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const date = subMonths(new Date(), index)
        return {
          value: format(date, 'yyyy-MM'),
          label: format(date, 'LLLL yyyy', { locale: hr }).replace(/^./, (letter) =>
            letter.toUpperCase(),
          ),
        }
      }),
    [],
  )
  const expenseMonthLabel =
    expenseMonthOptions.find((option) => option.value === expenseMonth)?.label ?? expenseMonth

  const metrics = (
    <div className="analytics__metrics">
      <MetricCard
        label={t('common.income')}
        value={data?.income ?? 0}
        icon="arrow-down-right"
        tone="income"
      />
      <MetricCard
        label={t('common.expenses')}
        value={data?.expenses ?? 0}
        icon="arrow-up-right"
        tone="expense"
      />
      <MetricCard
        label={t('dashboard.netCashFlow')}
        value={data?.netCashFlow ?? 0}
        icon="trend"
        tone="income"
      />
      <MetricCard
        label={t('analytics.averageTransaction')}
        value={(data?.expenses ?? 0) / Math.max(data?.transactionCount ?? 1, 1)}
        icon="activity"
      />
    </div>
  )

  const dailyExpensesCard = (
    <article className="card widget--daily-expenses analytics__chart-card">
      <div className="section__title-row">
        <div>
          <h3>{t('dashboard.dailyExpenses')}</h3>
          <p>{t('dashboard.dailyExpensesDescription')}</p>
        </div>
        <div className="chart__filter">
          <label className="route-loading__sr-only" htmlFor="analytics-expense-month">
            {t('dashboard.expenseMonthFilter')}
          </label>
          <AppSelect
            value={expenseMonth}
            options={expenseMonthOptions}
            onChange={setExpenseMonth}
            placeholder={t('common.month')}
            inputId="analytics-expense-month"
          />
        </div>
      </div>
      <div className="daily-expenses__summary">
        <span>
          <i className="chart__legend-dot chart__legend-dot--daily-expenses" />
          {expenseMonthLabel}
        </span>
        <strong>
          {formatCurrency(
            dailyExpenseTransactions.data?.reduce(
              (sum, transaction) => sum + transaction.amountBase,
              0,
            ) ?? 0,
          )}
        </strong>
      </div>
      <DailyExpenseChart
        transactions={dailyExpenseTransactions.data ?? []}
        month={expenseMonth}
        ariaLabel={t('dashboard.dailyExpenses')}
      />
    </article>
  )

  const cashFlowCard = (
    <article className="card analytics__chart-card">
      <div className="section__title-row">
        <div>
          <h3>{t('analytics.incomeVsExpenses')}</h3>
          <p>{t('analytics.monthlyComparison')}</p>
        </div>
        <span className="chart__total">
          {formatCurrency(data?.netCashFlow ?? 0)} {t('common.net')}
        </span>
      </div>
      <CashFlowChart
        data={data?.cashFlow ?? []}
        height={240}
        ariaLabel={t('analytics.incomeVsExpenses')}
      />
    </article>
  )

  const categoriesCard = (
    <article className="card analytics__chart-card">
      <div className="section__title-row">
        <div>
          <h3>{t('analytics.expenseDistribution')}</h3>
          <p>{t('analytics.byCategories')}</p>
        </div>
        <Link className="link" to="/categories">
          {t('analytics.editCategories')} <Icon name="chevron-right" size={14} />
        </Link>
      </div>
      <div className="donut__layout">
        <div className="donut__frame">
          <ExpenseDistributionChart
            data={data?.categoryBreakdown ?? []}
            ariaLabel={t('analytics.expenseDistribution')}
          />
          <div className="donut__center">
            <strong>{formatCurrency(data?.expenses ?? 0, 'EUR', true)}</strong>
            <small>{t('analytics.total')}</small>
          </div>
        </div>
        <div className="donut__legend">
          {(data?.categoryBreakdown ?? []).map((item) => (
            <div key={item.categoryId}>
              <CategoryBadge category={item} size="small" />
              <strong>{item.percentage}%</strong>
            </div>
          ))}
        </div>
      </div>
    </article>
  )

  const merchantsCard = (
    <article className="card merchant-card">
      <div className="section__title-row">
        <div>
          <h3>{t('analytics.topMerchants')}</h3>
          <p>{t('analytics.topMerchantsDescription')}</p>
        </div>
        <Icon name="bar-chart" size={18} />
      </div>
      <div className="merchant__list">
        {(data?.topMerchants ?? []).map((merchant, index) => (
          <div className="merchant__row" key={merchant.merchant}>
            <span className="merchant__rank">0{index + 1}</span>
            <span className="merchant__copy">
              <strong>{merchant.merchant}</strong>
              <small>{t('analytics.transactionCount', { count: merchant.count })}</small>
            </span>
            <div className="merchant__value">
              <strong>{formatCurrency(merchant.amount)}</strong>
              <MerchantProgressChart
                merchant={merchant.merchant}
                count={merchant.count}
                amount={merchant.amount}
                maxAmount={data?.topMerchants[0]?.amount ?? merchant.amount}
                ariaLabel={`${merchant.merchant}: ${formatCurrency(merchant.amount)}`}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  )

  const isOverview = activeTab === 'analytics.tabOverview'
  const isIncomeExpenses = activeTab === 'analytics.tabIncomeExpenses'
  const isCategories = activeTab === 'analytics.tabCategories'
  const isCashFlow = activeTab === 'analytics.tabCashFlow'

  return (
    <Page
      eyebrow={t('page.analytics')}
      title={t('analytics.title')}
      description={t('analytics.description')}
      action={
        <button
          className="button--date-range"
          type="button"
          aria-label={`${t('analytics.dateRange')}: ${formatRangeLabel(dateRange)}`}
          aria-haspopup="dialog"
          aria-expanded={filterOpen}
          onClick={() => {
            setDraftRange(dateRange)
            setFilterOpen(true)
          }}
        >
          <Icon name="calendar-days" size={16} /> {formatRangeLabel(dateRange)}
          <Icon name="chevron-down" size={15} />
        </button>
      }
    >
      <div className="analytics__tabs" role="tablist" aria-label={t('analytics.title')}>
        {tabs.map((tab) => {
          const route = tabRoutes[tab]

          return (
            <button
              key={tab}
              type="button"
              role={route ? undefined : 'tab'}
              aria-selected={route ? undefined : activeTab === tab}
              aria-controls={route ? undefined : 'analytics-tab-panel'}
              className={activeTab === tab ? 'is-active' : ''}
              onClick={() => {
                if (route) {
                  navigate(route)
                  return
                }
                setActiveTab(tab)
              }}
            >
              {t(tab)}
            </button>
          )
        })}
      </div>
      <div id="analytics-tab-panel" role="tabpanel" aria-live="polite">
        {isOverview && (
          <>
            {metrics}
            <section className="analytics__grid">
              {dailyExpensesCard}
              {cashFlowCard}
              {categoriesCard}
              {merchantsCard}
            </section>
          </>
        )}
        {isIncomeExpenses && (
          <>
            {metrics}
            <section className="analytics__grid analytics__grid--single">{cashFlowCard}</section>
          </>
        )}
        {isCategories && (
          <section className="analytics__grid">
            {categoriesCard}
            {merchantsCard}
          </section>
        )}
        {isCashFlow && (
          <section className="analytics__grid analytics__grid--single">{cashFlowCard}</section>
        )}
      </div>
      <AppModal
        isOpen={filterOpen}
        onRequestClose={() => setFilterOpen(false)}
        eyebrow={t('analytics.filterEyebrow')}
        title={t('analytics.filterTitle')}
        width={760}
        className="modal__card--date-range"
      >
        <div className="date-range-filter">
          <p className="modal__description">{t('analytics.filterDescription')}</p>
          <div className="date-range-filter__selection" aria-live="polite">
            <span>{t('analytics.selectedRange')}</span>
            <strong>{formatRangeLabel(draftRange)}</strong>
          </div>
          <DayPicker
            mode="range"
            locale={hr}
            selected={draftRange}
            onSelect={setDraftRange}
            defaultMonth={draftRange?.from ?? new Date()}
            numberOfMonths={isCompactDatePicker ? 1 : 2}
            showOutsideDays
          />
          <div className="modal__actions">
            <Button variant="ghost" type="button" onClick={() => setFilterOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              type="button"
              disabled={!draftRange?.from || !draftRange.to}
              onClick={() => {
                if (!draftRange?.from || !draftRange.to) return
                setDateRange(draftRange)
                setFilterOpen(false)
              }}
            >
              <Icon name="filter" size={15} /> {t('analytics.applyFilter')}
            </Button>
          </div>
        </div>
      </AppModal>
    </Page>
  )
}
