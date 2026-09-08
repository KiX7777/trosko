import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format, subMonths } from 'date-fns'
import { hr } from 'date-fns/locale'
import { DayPicker, type DateRange } from 'react-day-picker'
import 'react-day-picker/style.css'
import { getDashboardSummary } from '../../lib/repository'
import { formatCurrency } from '../../lib/format'
import { Page } from '../../components/ui/page'
import { MetricCard } from '../../components/ui/metric-card'
import { Icon } from '../../components/ui/icon'
import { AppModal } from '../../components/ui/modal'
import { Button } from '../../components/ui/button'
import {
  CashFlowChart,
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

function toDateValue(date: Date | undefined) {
  return date ? format(date, 'yyyy-MM-dd') : undefined
}

function formatRangeLabel(range: DateRange | undefined) {
  if (!range?.from) return t('analytics.chooseDateRange')
  const from = format(range.from, 'dd. MMM yyyy.', { locale: hr })
  const to = range.to ? format(range.to, 'dd. MMM yyyy.', { locale: hr }) : '…'
  return `${from} – ${to}`
}

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>(tabs[0])
  const defaultRange = useMemo<DateRange>(
    () => ({ from: subMonths(new Date(), 1), to: new Date() }),
    [],
  )
  const [filterOpen, setFilterOpen] = useState(false)
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(defaultRange)
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange)
  const summary = useQuery({
    queryKey: ['analytics', toDateValue(dateRange.from), toDateValue(dateRange.to)],
    queryFn: () =>
      getDashboardSummary({
        dateFrom: toDateValue(dateRange.from),
        dateTo: toDateValue(dateRange.to),
      }),
  })
  const data = summary.data
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
      <div className="analytics__tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? 'is-active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {t(tab)}
          </button>
        ))}
      </div>
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
      <section className="analytics__grid">
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
                  <span>
                    <i style={{ background: item.color }} />
                    {item.name}
                  </span>
                  <strong>{item.percentage}%</strong>
                </div>
              ))}
            </div>
          </div>
        </article>
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
                <span>
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
      </section>
      <AppModal
        isOpen={filterOpen}
        onRequestClose={() => setFilterOpen(false)}
        eyebrow={t('analytics.filterEyebrow')}
        title={t('analytics.filterTitle')}
        width={760}
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
            numberOfMonths={2}
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
