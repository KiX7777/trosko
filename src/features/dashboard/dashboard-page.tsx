import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  getAccounts,
  getDashboardSummary,
  getProfile,
  getRecurring,
  getTransactions,
} from '../../lib/repository'
import { formatCurrency, formatRelativeDate } from '../../lib/format'
import { Icon } from '../../components/ui/icon'
import { MetricCard } from '../../components/ui/metric-card'
import { StatusPill } from '../../components/ui/status'
import { Page } from '../../components/ui/page'
import { CashFlowChart, ExpenseBreakdownRailChart } from '../../components/ui/tanstack-charts'
import { t } from '../../lib/i18n'

export function DashboardPage() {
  const summary = useQuery({ queryKey: ['dashboard', '1M'], queryFn: getDashboardSummary })
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => getAccounts() })
  const transactions = useQuery({
    queryKey: ['transactions', { limit: 5 }],
    queryFn: () => getTransactions(),
  })
  const recurring = useQuery({ queryKey: ['recurring'], queryFn: getRecurring })
  const profile = useQuery({ queryKey: ['profile'], queryFn: getProfile })
  const data = summary.data
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
  return (
    <Page
      eyebrow={monthLabel}
      title={t('dashboard.welcome', {
        name: profile.data?.displayName || profile.data?.email || t('dashboard.fallbackName'),
      })}
      description={t('dashboard.description')}
      action={
        <div className="period-switcher">
          {['7D', '1M', '3M', '6M', '1Y'].map((period) => (
            <button key={period} className={period === '1M' ? 'is-selected' : ''}>
              {period}
            </button>
          ))}
        </div>
      }
    >
      <section className="summary">
        <article className="balance">
          <div className="balance__top">
            <span>{t('dashboard.availableBalance')}</span>
            <StatusPill tone="positive">{t('dashboard.monthlyChange')}</StatusPill>
          </div>
          <strong>{formatCurrency(data?.balance ?? 0)}</strong>
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
        <article className="card widget--cashflow">
          <div className="section__title-row">
            <div>
              <h3>{t('dashboard.cashFlow')}</h3>
              <p>{t('dashboard.cashFlowDescription')}</p>
            </div>
            <Link className="link" to="/analytics">
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
            <Link className="link" to="/analytics">
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
                <span className="breakdown__dot" style={{ background: item.color }} />
                <span>{item.name}</span>
                <strong>{formatCurrency(item.amount)}</strong>
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
            <Link className="link" to="/accounts">
              {t('dashboard.manage')} <Icon name="chevron-right" size={14} />
            </Link>
          </div>
          <div className="accounts__list">
            {(accounts.data ?? []).map((account) => (
              <Link className="accounts__row" to="/accounts" key={account.id}>
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
            <Link className="link" to="/recurring">
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
          <Link className="link" to="/transactions">
            {t('dashboard.viewAll')} <Icon name="chevron-right" size={14} />
          </Link>
        </div>
        <div className="recent__list">
          {(transactions.data ?? []).slice(0, 5).map((transaction) => (
            <Link
              className="recent__row"
              to={`/transactions?search=${encodeURIComponent(transaction.description)}`}
              key={transaction.id}
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
