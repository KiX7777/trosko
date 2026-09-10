import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { hr } from 'date-fns/locale'
import { useDashboardQueries } from '../../hooks/use-dashboard-queries'
import { formatCurrency, formatRelativeDate } from '../../lib/format'
import { Icon } from '../../components/ui/icon'
import { CategoryBadge } from '../../components/ui/category-badge'
import { MetricCard } from '../../components/ui/metric-card'
import { Page } from '../../components/ui/page'
import {
  CashFlowChart,
  DailyExpenseChart,
  ExpenseBreakdownRailChart,
} from '../../components/ui/tanstack-charts'
import { AppSelect, type SelectOption } from '../../components/ui/select'
import { t } from '../../lib/i18n'
import type { Period } from '../../types/domain'

export function DashboardPage() {
  const [period, setPeriod] = useState<Period>('1M')
  const [isBalanceFilterOpen, setIsBalanceFilterOpen] = useState(false)
  const [selectedBalanceAccountIds, setSelectedBalanceAccountIds] = useState<string[] | null>(null)
  const balanceFilterRef = useRef<HTMLDivElement>(null)
  const currentMonth = format(new Date(), 'yyyy-MM')
  const [expenseMonth, setExpenseMonth] = useState(currentMonth)
  const expenseMonthDate = new Date(`${expenseMonth}-01T12:00:00`)
  const expenseMonthStart = format(startOfMonth(expenseMonthDate), 'yyyy-MM-dd')
  const expenseMonthEnd = format(endOfMonth(expenseMonthDate), 'yyyy-MM-dd')
  const { summary, accounts, transactions, dailyExpenseTransactions, recurring, profile } =
    useDashboardQueries(expenseMonth, expenseMonthStart, expenseMonthEnd, period)
  const data = summary.data
  const activeAccounts = useMemo(
    () => (accounts.data ?? []).filter((account) => !account.archivedAt),
    [accounts.data],
  )
  const selectedBalance = activeAccounts.filter(
    (account) =>
      selectedBalanceAccountIds === null || selectedBalanceAccountIds.includes(account.id),
  )
  const availableBalance = selectedBalance.reduce((sum, account) => sum + account.balance, 0)

  useEffect(() => {
    if (!isBalanceFilterOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!balanceFilterRef.current?.contains(event.target as Node)) setIsBalanceFilterOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsBalanceFilterOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isBalanceFilterOpen])

  const toggleBalanceAccount = (accountId: string) => {
    setSelectedBalanceAccountIds((current) => {
      const selectedIds = current ?? activeAccounts.map((account) => account.id)
      return selectedIds.includes(accountId)
        ? selectedIds.filter((id) => id !== accountId)
        : [...selectedIds, accountId]
    })
  }
  const monthLabel = new Intl.DateTimeFormat('hr-HR', { month: 'long', year: 'numeric' })
    .format(new Date())
    .toUpperCase()
  const accountTypeLabel = (type: string) =>
    t(
      `common.${type === 'credit_card' ? 'creditCard' : type === 'current' ? 'currentAccount' : type}` as Parameters<
        typeof t
      >[0],
    )
  const frequencyLabel = (frequency: string) => t(`common.${frequency}` as Parameters<typeof t>[0])
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
  return (
    <Page
      eyebrow={monthLabel}
      title={t('dashboard.welcome', {
        name: profile.data?.displayName || profile.data?.email || t('dashboard.fallbackName'),
      })}
      action={
        <div className="period-switcher">
          {(['7D', '1M', '3M', '6M', '1Y'] as Period[]).map((option) => (
            <button
              key={option}
              className={option === period ? 'is-selected' : ''}
              aria-pressed={option === period}
              onClick={() => setPeriod(option)}
            >
              {option}
            </button>
          ))}
        </div>
      }
    >
      <section className="summary">
        <article className="balance">
          <div className="balance__top">
            <span>{t('dashboard.availableBalance')}</span>
            <div className="balance-filter" ref={balanceFilterRef}>
              <button
                className="balance-filter__trigger"
                type="button"
                aria-expanded={isBalanceFilterOpen}
                aria-haspopup="dialog"
                aria-controls="balance-account-filter"
                onClick={() => setIsBalanceFilterOpen((open) => !open)}
              >
                <Icon name="sliders" size={15} />
                {selectedBalance.length === activeAccounts.length
                  ? t('common.all')
                  : t('dashboard.selectedAccounts', { count: selectedBalance.length })}
              </button>
              {isBalanceFilterOpen && (
                <div
                  className="balance-filter__popover"
                  id="balance-account-filter"
                  role="dialog"
                  aria-label={t('dashboard.balanceAccounts')}
                >
                  <div className="balance-filter__heading">
                    <strong>{t('dashboard.balanceAccounts')}</strong>
                    <button
                      type="button"
                      onClick={() => setSelectedBalanceAccountIds(null)}
                      disabled={selectedBalance.length === activeAccounts.length}
                    >
                      {t('aria.selectAll')}
                    </button>
                  </div>
                  <div className="balance-filter__options">
                    {activeAccounts.map((account) => {
                      const isChecked =
                        selectedBalanceAccountIds === null ||
                        selectedBalanceAccountIds.includes(account.id)
                      return (
                        <label className="balance-filter__option" key={account.id}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleBalanceAccount(account.id)}
                          />
                          <span>
                            <strong>{account.name}</strong>
                            <small>{formatCurrency(account.balance, account.currency)}</small>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <strong>{formatCurrency(availableBalance)}</strong>
          <span className="balance__caption">{t('dashboard.updatedNow')}</span>
          <div className="balance__rail">
            <span style={{ width: '68%' }} />
          </div>
        </article>
        <MetricCard
          label={t('common.income')}
          value={data?.income ?? 0}
          icon="arrow-down-right"
          tone="income"
          delta="+8.4%"
        />
        <MetricCard
          label={t('common.expenses')}
          value={data?.expenses ?? 0}
          icon="arrow-up-right"
          tone="expense"
          delta="-3.1%"
        />
        <MetricCard
          label={t('dashboard.netCashFlow')}
          value={data?.netCashFlow ?? 0}
          icon="trend"
          tone="income"
          delta={t('dashboard.thisMonth')}
        />
      </section>

      <section className="dashboard__grid">
        <article className="card widget--daily-expenses">
          <div className="section__title-row">
            <div>
              <h3>{t('dashboard.dailyExpenses')}</h3>
              <p>{t('dashboard.dailyExpensesDescription')}</p>
            </div>
            <div className="chart__filter">
              <label className="route-loading__sr-only" htmlFor="dashboard-expense-month">
                {t('dashboard.expenseMonthFilter')}
              </label>
              <AppSelect
                value={expenseMonth}
                options={expenseMonthOptions}
                onChange={setExpenseMonth}
                placeholder={t('common.month')}
                inputId="dashboard-expense-month"
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
        <article className="card widget--cashflow">
          <div className="section__title-row">
            <div>
              <h3>{t('dashboard.cashFlow')}</h3>
              <p>{t('dashboard.cashFlowDescription')}</p>
            </div>
            <Link className="link" to="/analytics" viewTransition>
              {t('dashboard.details')} <Icon name="chevron-right" size={14} />
            </Link>
          </div>
          <div className="chart__legend">
            <span>
              <i className="chart__legend-dot chart__legend-dot--income" /> {t('common.income')}
            </span>
            <span>
              <i className="chart__legend-dot chart__legend-dot--expense" /> {t('common.expenses')}
            </span>
          </div>
          <CashFlowChart
            data={data?.cashFlow ?? []}
            height={190}
            ariaLabel={t('dashboard.cashFlow')}
          />
        </article>
        <article className="card widget--category">
          <div className="section__title-row">
            <div>
              <h3>{t('dashboard.expensesByCategory')}</h3>
              <p>
                {t('common.total')} {formatCurrency(data?.expenses ?? 0)}
              </p>
            </div>
            <Link className="link" to="/analytics" viewTransition>
              {t('dashboard.analytics')} <Icon name="chevron-right" size={14} />
            </Link>
          </div>
          <ExpenseBreakdownRailChart
            data={data?.categoryBreakdown ?? []}
            ariaLabel={t('dashboard.expensesByCategory')}
          />
          <div className="breakdown__list">
            {(data?.categoryBreakdown ?? []).slice(0, 4).map((item) => (
              <div className="breakdown__line" key={item.categoryId}>
                <CategoryBadge category={item} size="small" />
                <strong>{formatCurrency(item.amount)}</strong>
                <strong>{item.name}</strong>
              </div>
            ))}
          </div>
        </article>
        <article className="card widget--accounts">
          <div className="section__title-row">
            <div>
              <h3>{t('dashboard.myAccounts')}</h3>
              <p>{t('dashboard.activeAccounts', { count: accounts.data?.length ?? 0 })}</p>
            </div>
            <Link className="link" to="/accounts" viewTransition>
              {t('dashboard.manage')} <Icon name="chevron-right" size={14} />
            </Link>
          </div>
          <div className="accounts__list">
            {(accounts.data ?? []).map((account) => (
              <Link className="accounts__row" to="/accounts" key={account.id} viewTransition>
                <span className="accounts__row-icon" style={{ color: account.color }}>
                  <Icon
                    name={
                      account.type === 'credit_card'
                        ? 'card'
                        : account.type === 'savings'
                          ? 'sparkles'
                          : account.type === 'wallet'
                            ? 'wallet'
                            : 'landmark'
                    }
                    size={17}
                  />
                </span>
                <span>
                  <strong>{account.name}</strong>
                  <small>
                    {account.currency} • {accountTypeLabel(account.type)}
                  </small>
                </span>
                <b>{formatCurrency(account.balance)}</b>
              </Link>
            ))}
          </div>
        </article>
        <article className="card widget--upcoming">
          <div className="section__title-row">
            <div>
              <h3>{t('dashboard.upcomingExpenses')}</h3>
              <p>{t('dashboard.upcomingDescription')}</p>
            </div>
            <Link className="link" to="/recurring" viewTransition>
              {t('dashboard.all')} <Icon name="chevron-right" size={14} />
            </Link>
          </div>
          <div className="upcoming__list">
            {(recurring.data ?? [])
              .filter((item) => item.type === 'expense')
              .slice(0, 3)
              .map((item) => (
                <div className="upcoming__row" key={item.id}>
                  <span className="upcoming__icon">
                    <Icon name="calendar-days" size={17} />
                  </span>
                  <span>
                    <strong>{item.description}</strong>
                    <small>
                      {frequencyLabel(item.frequency)} • {item.nextRunAt}
                    </small>
                  </span>
                  <span className="upcoming__amount">
                    <b>{formatCurrency(item.amount)}</b>
                    <small>{t('common.soon')}</small>
                  </span>
                </div>
              ))}
          </div>
        </article>
      </section>

      <section className="card widget--recent">
        <div className="section__title-row">
          <div>
            <h3>{t('dashboard.recentTransactions')}</h3>
            <p>{t('dashboard.recentDescription')}</p>
          </div>
          <Link className="link" to="/transactions" viewTransition>
            {t('dashboard.viewAll')} <Icon name="chevron-right" size={14} />
          </Link>
        </div>
        <div className="recent__list">
          {(transactions.data ?? []).slice(0, 5).map((transaction) => (
            <Link
              className="recent__row"
              to={`/transactions?search=${encodeURIComponent(transaction.description)}`}
              key={transaction.id}
              viewTransition
            >
              <span className={`transaction-glyph transaction-glyph--${transaction.type}`}>
                <Icon
                  name={
                    transaction.type === 'income'
                      ? 'arrow-down-right'
                      : transaction.type === 'transfer'
                        ? 'arrow-left-right'
                        : 'shopping-cart'
                  }
                  size={17}
                />
              </span>
              <span className="recent__copy">
                <strong>{transaction.description}</strong>
                <small>
                  {transaction.merchant ?? t('dashboard.internalRecord')} •{' '}
                  {formatRelativeDate(`${transaction.transactionDate}T12:00:00.000Z`)}
                </small>
              </span>
              <b
                className={
                  transaction.type === 'income'
                    ? 'amount--positive'
                    : transaction.type === 'expense'
                      ? 'amount--negative'
                      : ''
                }
              >
                {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                {formatCurrency(transaction.amount)}
              </b>
            </Link>
          ))}
        </div>
      </section>
    </Page>
  )
}
