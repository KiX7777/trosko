import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns'
import { hr } from 'date-fns/locale'
import { DayPicker, type DateRange } from 'react-day-picker'
import 'react-day-picker/style.css'
import { useAnalyticsQueries } from '../../hooks/use-dashboard-queries'
import { useDailyExpenseTransactionsQueries } from '../../hooks/use-transaction-queries'
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
  SpendingHeatmapChart,
  MonthlyExpenseComparisonChart,
  AccountExpenseDistributionChart,
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
  const [pickerMonth, setPickerMonth] = useState(defaultRange.from ?? new Date())
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[] | null>(null)
  const [draftCategoryIds, setDraftCategoryIds] = useState<string[]>([])
  const currentMonth = format(new Date(), 'yyyy-MM')
  const [expenseMonth, setExpenseMonth] = useState(currentMonth)
  const [comparisonMonths, setComparisonMonths] = useState(() =>
    Array.from({ length: 3 }, (_, index) => format(subMonths(new Date(), index), 'yyyy-MM')),
  )
  const [visibleComparisonSeries, setVisibleComparisonSeries] = useState([true, true, true])
  const expenseMonthDate = new Date(`${expenseMonth}-01T12:00:00`)
  const expenseMonthStart = format(startOfMonth(expenseMonthDate), 'yyyy-MM-dd')
  const expenseMonthEnd = format(endOfMonth(expenseMonthDate), 'yyyy-MM-dd')
  const isCompactDatePicker = useCompactDatePicker()
  const { summary, dailyExpenseTransactions } = useAnalyticsQueries(
    toDateValue(dateRange.from),
    toDateValue(dateRange.to),
    expenseMonth,
    expenseMonthStart,
    expenseMonthEnd,
  )
  const comparisonExpenseTransactions = useDailyExpenseTransactionsQueries(
    'analytics',
    comparisonMonths,
  )
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
  const comparisonSeries = useMemo(
    () =>
      comparisonMonths.map((month, index) => ({
        month,
        label: expenseMonthOptions.find((option) => option.value === month)?.label ?? month,
        color: ['var(--shell-primary)', 'var(--shell-income)', 'var(--shell-warning)'][index],
        transactions: comparisonExpenseTransactions[index]?.data ?? [],
      })),
    [comparisonExpenseTransactions, comparisonMonths, expenseMonthOptions],
  )
  const visibleComparisonChartSeries = useMemo(
    () => comparisonSeries.filter((_, index) => visibleComparisonSeries[index]),
    [comparisonSeries, visibleComparisonSeries],
  )

  const selectComparisonMonth = (index: number, month: string) => {
    setComparisonMonths((current) => {
      const matchingIndex = current.indexOf(month)
      if (matchingIndex === index) return current

      return current.map((currentMonth, currentIndex) => {
        if (currentIndex === index) return month
        return currentIndex === matchingIndex ? current[index] : currentMonth
      })
    })
  }

  const toggleComparisonSeries = (index: number) => {
    setVisibleComparisonSeries((current) =>
      current.map((isVisible, currentIndex) => (currentIndex === index ? !isVisible : isVisible)),
    )
  }
  const categoryBreakdown = data?.categoryBreakdown ?? []
  const visibleCategoryBreakdown = useMemo(() => {
    const selectedCategories = categoryBreakdown.filter(
      (category) =>
        selectedCategoryIds === null || selectedCategoryIds.includes(category.categoryId),
    )
    const total = selectedCategories.reduce((sum, category) => sum + category.amount, 0)

    return selectedCategories.map((category) => ({
      ...category,
      percentage: total > 0 ? (category.amount / total) * 100 : 0,
    }))
  }, [categoryBreakdown, selectedCategoryIds])
  const visibleCategoryTotal = visibleCategoryBreakdown.reduce(
    (sum, category) => sum + category.amount,
    0,
  )
  const selectedCategoryCount =
    selectedCategoryIds === null ? categoryBreakdown.length : visibleCategoryBreakdown.length

  const openCategoryFilter = () => {
    setDraftCategoryIds(
      selectedCategoryIds ?? categoryBreakdown.map((category) => category.categoryId),
    )
    setCategoryFilterOpen(true)
  }

  const toggleDraftCategory = (categoryId: string) => {
    setDraftCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    )
  }

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

  const monthlyExpenseComparisonCard = (
    <article className="card analytics__chart-card monthly-expense-comparison">
      <div className="section__title-row">
        <div>
          <h3>{t('analytics.expenseComparison')}</h3>
          <p>{t('analytics.expenseComparisonDescription')}</p>
        </div>
        <div className="monthly-expense-comparison__filters">
          {comparisonMonths.map((month, index) => (
            <div className="chart__filter" key={index}>
              <label
                className="route-loading__sr-only"
                htmlFor={`analytics-comparison-month-${index}`}
              >
                {t('analytics.expenseComparisonMonthFilter', { number: index + 1 })}
              </label>
              <AppSelect
                value={month}
                options={expenseMonthOptions}
                onChange={(value) => selectComparisonMonth(index, value)}
                placeholder={t('common.month')}
                inputId={`analytics-comparison-month-${index}`}
              />
            </div>
          ))}
        </div>
      </div>
      <div
        className="monthly-expense-comparison__legend"
        aria-label={t('analytics.expenseComparison')}
      >
        {comparisonSeries.map((series, index) => {
          const total = series.transactions.reduce(
            (sum, transaction) => sum + transaction.amountBase,
            0,
          )
          const isVisible = visibleComparisonSeries[index]

          return (
            <button
              className={!isVisible ? 'is-hidden' : undefined}
              type="button"
              key={series.month}
              aria-pressed={isVisible}
              aria-label={t('analytics.toggleExpenseComparisonMonth', { month: series.label })}
              onClick={() => toggleComparisonSeries(index)}
              disabled={isVisible && visibleComparisonSeries.filter(Boolean).length === 1}
            >
              <span>
                <i className="chart__legend-dot" style={{ backgroundColor: series.color }} />
                {series.label}
              </span>
              <strong>{formatCurrency(total)}</strong>
            </button>
          )
        })}
      </div>
      <MonthlyExpenseComparisonChart
        series={visibleComparisonChartSeries}
        ariaLabel={t('analytics.expenseComparison')}
      />
    </article>
  )

  const spendingHeatmapCard = (
    <article className="card widget--spending-heatmap analytics__chart-card">
      <div className="section__title-row">
        <div>
          <h3>{t('analytics.spendingHeatmap')}</h3>
          <p>{t('analytics.spendingHeatmapDescription')}</p>
        </div>
        <span className="chart__total">{expenseMonthLabel}</span>
      </div>
      <SpendingHeatmapChart
        transactions={dailyExpenseTransactions.data ?? []}
        month={expenseMonth}
        ariaLabel={t('analytics.spendingHeatmap')}
      />
      <div className="spending-heatmap__legend" aria-label={t('analytics.spendingHeatmapLegend')}>
        <span>{t('analytics.spendingHeatmapLess')}</span>
        <div aria-hidden="true">
          {[0, 1, 2, 3, 4].map((level) => (
            <i key={level} className={`spending-heatmap__legend-cell level-${level}`} />
          ))}
        </div>
        <span>{t('analytics.spendingHeatmapMore')}</span>
      </div>
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
        <div className="analytics__card-actions">
          <button
            className="analytics__category-filter"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={categoryFilterOpen}
            onClick={openCategoryFilter}
          >
            <Icon name="sliders" size={15} />
            {selectedCategoryIds === null
              ? t('common.all')
              : t('analytics.selectedCategories', { count: selectedCategoryCount })}
          </button>
          <Link className="link" to="/categories" viewTransition>
            {t('analytics.editCategories')} <Icon name="chevron-right" size={14} />
          </Link>
        </div>
      </div>
      <div className="donut__layout">
        <div className="donut__frame">
          <ExpenseDistributionChart
            data={visibleCategoryBreakdown}
            ariaLabel={t('analytics.expenseDistribution')}
          />
          <div className="donut__center">
            <strong>{formatCurrency(visibleCategoryTotal, 'EUR', true)}</strong>
            <small>{t('analytics.total')}</small>
          </div>
        </div>
        <div className="donut__legend">
          {visibleCategoryBreakdown.map((item) => (
            <div key={item.categoryId}>
              <CategoryBadge category={item} size="small" />
              <strong>{item.percentage.toFixed(2)}%</strong>
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

  const accountsCard = (
    <article className="card analytics__chart-card">
      <div className="section__title-row">
        <div>
          <h3>{t('analytics.expensesByAccount')}</h3>
          <p>{t('analytics.accountExpensesDescription')}</p>
        </div>
      </div>
      <div className="donut__layout">
        <div className="donut__frame">
          <AccountExpenseDistributionChart
            data={data?.accountBreakdown ?? []}
            ariaLabel={t('analytics.expensesByAccount')}
          />
          <div className="donut__center">
            <strong>{formatCurrency(data?.expenses ?? 0, 'EUR', true)}</strong>
            <small>{t('analytics.total')}</small>
          </div>
        </div>
        <div className="donut__legend">
          {(data?.accountBreakdown ?? []).map((account) => (
            <div key={account.accountId}>
              <span>
                <i style={{ backgroundColor: account.color }} />
                {account.name}
                <small>{t('analytics.transactionCount', { count: account.count })}</small>
              </span>
              <strong>{formatCurrency(account.amount)}</strong>
            </div>
          ))}
        </div>
      </div>
    </article>
  )

  const isOverview = activeTab === 'analytics.tabOverview'
  const isIncomeExpenses = activeTab === 'analytics.tabIncomeExpenses'
  const isCategories = activeTab === 'analytics.tabCategories'
  const isAccounts = activeTab === 'analytics.tabAccounts'
  const isCashFlow = activeTab === 'analytics.tabCashFlow'
  const selectDateRangeShortcut = (range: DateRange) => {
    setDraftRange(range)
    if (range.from) setPickerMonth(range.from)
  }
  const dateRangeShortcuts = [
    {
      label: t('analytics.thisMonth'),
      getRange: (): DateRange => {
        const today = new Date()
        return { from: startOfMonth(today), to: endOfMonth(today) }
      },
    },
    {
      label: t('analytics.lastMonth'),
      getRange: (): DateRange => {
        const lastMonth = subMonths(new Date(), 1)
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
      },
    },
    {
      label: t('analytics.thisWeek'),
      getRange: (): DateRange => {
        const today = new Date()
        return {
          from: startOfWeek(today, { weekStartsOn: 1 }),
          to: endOfWeek(today, { weekStartsOn: 1 }),
        }
      },
    },
    {
      label: t('analytics.lastWeek'),
      getRange: (): DateRange => {
        const lastWeek = subWeeks(new Date(), 1)
        return {
          from: startOfWeek(lastWeek, { weekStartsOn: 1 }),
          to: endOfWeek(lastWeek, { weekStartsOn: 1 }),
        }
      },
    },
    {
      label: t('analytics.thisYear'),
      getRange: (): DateRange => {
        const today = new Date()
        return { from: startOfYear(today), to: endOfYear(today) }
      },
    },
    {
      label: t('analytics.lastYear'),
      getRange: (): DateRange => {
        const lastYear = subYears(new Date(), 1)
        return { from: startOfYear(lastYear), to: endOfYear(lastYear) }
      },
    },
    {
      label: t('analytics.last7Days'),
      getRange: (): DateRange => {
        const today = new Date()
        return { from: subDays(today, 6), to: today }
      },
    },
    {
      label: t('analytics.last30Days'),
      getRange: (): DateRange => {
        const today = new Date()
        return { from: subDays(today, 29), to: today }
      },
    },
  ]

  return (
    <Page
      eyebrow={t('page.analytics')}
      title={t('analytics.title')}
      action={
        <button
          className="button--date-range"
          type="button"
          aria-label={`${t('analytics.dateRange')}: ${formatRangeLabel(dateRange)}`}
          aria-haspopup="dialog"
          aria-expanded={filterOpen}
          onClick={() => {
            setDraftRange(dateRange)
            setPickerMonth(dateRange.from ?? new Date())
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
                  navigate(route, { viewTransition: true })
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
              {spendingHeatmapCard}
              {monthlyExpenseComparisonCard}
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
        {isAccounts && (
          <section className="analytics__grid analytics__grid--single">{accountsCard}</section>
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
          <div className="date-range-filter__shortcuts">
            <span>{t('analytics.quickRanges')}</span>
            <div>
              {dateRangeShortcuts.map((shortcut) => (
                <button
                  type="button"
                  key={shortcut.label}
                  onClick={() => selectDateRangeShortcut(shortcut.getRange())}
                >
                  {shortcut.label}
                </button>
              ))}
            </div>
          </div>
          <div className="date-range-filter__selection" aria-live="polite">
            <span>{t('analytics.selectedRange')}</span>
            <strong>{formatRangeLabel(draftRange)}</strong>
          </div>
          <DayPicker
            mode="range"
            locale={hr}
            selected={draftRange}
            onSelect={setDraftRange}
            month={pickerMonth}
            onMonthChange={setPickerMonth}
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
      <AppModal
        isOpen={categoryFilterOpen}
        onRequestClose={() => setCategoryFilterOpen(false)}
        eyebrow={t('analytics.categoryFilterEyebrow')}
        title={t('analytics.categoryFilterTitle')}
        width={460}
      >
        <div className="category-filter">
          <p className="modal__description">{t('analytics.categoryFilterDescription')}</p>
          <div className="category-filter__heading">
            <span>{t('analytics.includeCategories')}</span>
            <button
              type="button"
              onClick={() =>
                setDraftCategoryIds(categoryBreakdown.map((category) => category.categoryId))
              }
              disabled={draftCategoryIds.length === categoryBreakdown.length}
            >
              {t('aria.selectAll')}
            </button>
          </div>
          <div className="category-filter__options">
            {categoryBreakdown.map((category) => (
              <label className="category-filter__option" key={category.categoryId}>
                <input
                  type="checkbox"
                  checked={draftCategoryIds.includes(category.categoryId)}
                  onChange={() => toggleDraftCategory(category.categoryId)}
                />
                <CategoryBadge category={category} size="small" />
                <strong>{formatCurrency(category.amount)}</strong>
              </label>
            ))}
          </div>
          <div className="modal__actions">
            <Button variant="ghost" type="button" onClick={() => setCategoryFilterOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={() => {
                setSelectedCategoryIds(
                  draftCategoryIds.length === categoryBreakdown.length ? null : draftCategoryIds,
                )
                setCategoryFilterOpen(false)
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
