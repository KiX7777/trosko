import { useEffect, useMemo, useRef, useState } from 'react'
import {
  endOfMonth,
  endOfWeek,
  format,
  isToday,
  isYesterday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns'
import { hr } from 'date-fns/locale'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAccountsQuery } from '../../hooks/use-account-queries'
import { useCategoriesQuery } from '../../hooks/use-category-queries'
import { useLabelsQuery } from '../../hooks/use-label-queries'
import {
  useCreateSavedViewMutation,
  useDeleteTransactionMutation,
  useSavedViewsQuery,
  useInfiniteTransactionsQuery,
  TRANSACTION_PAGE_SIZE,
} from '../../hooks/use-transaction-queries'
import type {
  Transaction,
  TransactionFilters,
  TransactionSort,
  TransactionType,
} from '../../types/domain'
import { formatCurrency, formatDate } from '../../lib/format'
import { Page } from '../../components/ui/page'
import { Button } from '../../components/ui/button'
import { Icon } from '../../components/ui/icon'
import { AppModal } from '../../components/ui/modal'
import { StatusPill } from '../../components/ui/status'
import { AppSelect } from '../../components/ui/select'
import { useUIStore } from '../../stores/ui-store'
import { t } from '../../lib/i18n'
import { CategoryBadge } from '../../components/ui/category-badge'
import { formatCategoryOption } from '../../components/ui/category-options'
import { useTransactionsPageUIStore } from './transactions-page-ui-store'

function formatMobileDate(date: string) {
  const parsed = parseISO(`${date}T12:00:00`)
  const formatted = format(parsed, 'dd. MMMM yyyy.', { locale: hr })
  const dateWithCapitalizedMonth = formatted.replace(/\. (\p{L})/u, (_, letter: string) => {
    return `. ${letter.toLocaleUpperCase('hr-HR')}`
  })

  if (isToday(parsed)) return `Danas, ${dateWithCapitalizedMonth}`
  if (isYesterday(parsed)) return `Jučer, ${dateWithCapitalizedMonth}`
  return dateWithCapitalizedMonth
}

function formatMobileTime(value: string) {
  return format(parseISO(value), 'HH:mm')
}

function displayDescription(description: string) {
  return description.trim() || '-'
}

type DateQuickFilter = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth'

type MobileVirtualItem =
  | { kind: 'day'; key: string; date: string; total: number }
  | { kind: 'transaction'; key: string; transaction: Transaction }

function useMobileTransactionsLayout() {
  const [isMobile, setIsMobile] = useState(() => {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 720px)').matches
    )
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const mediaQuery = window.matchMedia('(max-width: 720px)')
    const update = () => setIsMobile(mediaQuery.matches)
    update()
    mediaQuery.addEventListener?.('change', update)

    return () => mediaQuery.removeEventListener?.('change', update)
  }, [])

  return isMobile
}

function getDateQuickFilterRange(filter: DateQuickFilter, referenceDate = new Date()) {
  const weekOptions = { weekStartsOn: 1 as const }

  switch (filter) {
    case 'thisWeek':
      return {
        dateFrom: format(startOfWeek(referenceDate, weekOptions), 'yyyy-MM-dd'),
        dateTo: format(endOfWeek(referenceDate, weekOptions), 'yyyy-MM-dd'),
      }
    case 'lastWeek': {
      const lastWeek = subWeeks(referenceDate, 1)
      return {
        dateFrom: format(startOfWeek(lastWeek, weekOptions), 'yyyy-MM-dd'),
        dateTo: format(endOfWeek(lastWeek, weekOptions), 'yyyy-MM-dd'),
      }
    }
    case 'thisMonth':
      return {
        dateFrom: format(startOfMonth(referenceDate), 'yyyy-MM-dd'),
        dateTo: format(endOfMonth(referenceDate), 'yyyy-MM-dd'),
      }
    case 'lastMonth': {
      const lastMonth = subMonths(referenceDate, 1)
      return {
        dateFrom: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        dateTo: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
      }
    }
  }
}

export function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [sorting, setSorting] = useState<SortingState>([{ id: 'transactionDate', desc: true }])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; name: string } | null>(null)
  const desktopTableScrollRef = useRef<HTMLDivElement>(null)
  const mobileListScrollRef = useRef<HTMLDivElement>(null)
  const isMobileLayout = useMobileTransactionsLayout()
  const {
    filtersOpen,
    filterDraft,
    saveViewOpen,
    saveViewName,
    savedViewsOpen,
    openFilters: showFilters,
    closeFilters,
    updateFilterDraft,
    openSaveView: showSaveView,
    closeSaveView,
    setSaveViewName,
    toggleSavedViews,
    closeSavedViews,
    reset: resetUIState,
  } = useTransactionsPageUIStore()
  const openQuickAdd = useUIStore((state) => state.openQuickAdd)
  const search = searchParams.get('search') ?? ''
  const type = (searchParams.get('type') as TransactionType | null) ?? 'all'
  const recurring = searchParams.get('recurring')
  const hasReceipt = searchParams.get('hasReceipt')
  const accountId = searchParams.get('account') ?? ''
  const categoryId = searchParams.get('category') ?? ''
  const labelId = searchParams.get('label') ?? ''
  const dateFrom = searchParams.get('dateFrom') ?? ''
  const dateTo = searchParams.get('dateTo') ?? ''
  const amountMin = searchParams.get('amountMin') ?? ''
  const amountMax = searchParams.get('amountMax') ?? ''
  const filterSignature = searchParams.toString()
  const filters: TransactionFilters = {
    search: search || undefined,
    types: type === 'all' ? undefined : [type],
    accounts: accountId ? [accountId] : undefined,
    categories: categoryId ? [categoryId] : undefined,
    labels: labelId ? [labelId] : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    amountMin: amountMin ? Number(amountMin) : undefined,
    amountMax: amountMax ? Number(amountMax) : undefined,
    recurring: recurring === null ? undefined : recurring === 'true',
    hasReceipt: hasReceipt === null ? undefined : hasReceipt === 'true',
  }
  const transactionSort = useMemo<TransactionSort>(() => {
    const current = sorting[0]
    if (current?.id === 'description' || current?.id === 'amount') {
      return { id: current.id, desc: current.desc }
    }
    return { id: 'transactionDate', desc: current?.desc ?? true }
  }, [sorting])
  const transactions = useInfiniteTransactionsQuery(filters, transactionSort)
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = transactions
  const transactionItems = useMemo(
    () => transactions.data?.pages.flatMap((page) => page.items) ?? [],
    [transactions.data],
  )
  const transactionTotal = transactions.data?.pages[0]?.total ?? transactionItems.length
  const accounts = useAccountsQuery()
  const categories = useCategoriesQuery()
  const labels = useLabelsQuery()
  const savedViews = useSavedViewsQuery('transactions')
  const openEditTransaction = useUIStore((state) => state.openEditTransaction)
  const deleteMutation = useDeleteTransactionMutation({
    onSuccess: () => {
      setSelected({})
      setActiveTransactionId(null)
      setDeleteTarget(null)
      toast.success(t('transactions.deleted'))
    },
  })
  const saveViewMutation = useCreateSavedViewMutation(filters, {
    onSuccess: () => {
      closeSaveView()
      toast.success(t('transactions.saveViewDone'))
    },
  })
  const accountMap = useMemo(
    () => new Map((accounts.data ?? []).map((account) => [account.id, account.name])),
    [accounts.data],
  )
  const categoryMap = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category])),
    [categories.data],
  )
  const labelMap = useMemo(
    () => new Map((labels.data ?? []).map((label) => [label.id, label])),
    [labels.data],
  )
  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            aria-label={t('aria.selectAll')}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            aria-label={t('aria.select', { name: displayDescription(row.original.description) })}
          />
        ),
      },
      {
        accessorKey: 'transactionDate',
        header: t('common.date'),
        cell: ({ getValue }) => (
          <span className="table__muted">{formatDate(`${getValue<string>()}T12:00:00.000Z`)}</span>
        ),
      },
      {
        accessorKey: 'description',
        header: t('common.description'),
        cell: ({ row }) => (
          <div className="table__description">
            <span>
              {row.original.description ? (
                <strong>{displayDescription(row.original.description)}</strong>
              ) : (
                <span className="table__muted">—</span>
              )}
            </span>
          </div>
        ),
      },
      {
        id: 'category',
        header: t('common.category'),
        cell: ({ row }) =>
          row.original.categoryId && categoryMap.get(row.original.categoryId) ? (
            <CategoryBadge category={categoryMap.get(row.original.categoryId)!} size="small" />
          ) : (
            <span className="table__muted">—</span>
          ),
      },
      {
        id: 'account',
        header: t('common.account'),
        cell: ({ row }) => accountMap.get(row.original.accountId) ?? '—',
      },
      {
        id: 'labels',
        header: t('nav.labels'),
        cell: ({ row }) => (
          <div className="table__labels">
            {row.original.labelIds.length ? (
              row.original.labelIds.map((labelId) => (
                <StatusPill key={labelId} tone="indigo">
                  {labelMap.get(labelId)?.name ?? t('transactions.labelFallback')}
                </StatusPill>
              ))
            ) : (
              <span className="table__muted">—</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'amountBase',
        id: 'amount',
        header: t('common.amount'),
        cell: ({ row }) => (
          <strong
            className={`table__amount ${row.original.type === 'income' ? 'amount--positive' : row.original.type === 'expense' ? 'amount--negative' : ''}`}
          >
            {row.original.type === 'income' ? '+' : row.original.type === 'expense' ? '-' : ''}
            {formatCurrency(row.original.amountBase, row.original.currency)}
          </strong>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const transferAccountId =
            row.original.type === 'transfer'
              ? transactionItems.find(
                  (candidate) =>
                    candidate.id !== row.original.id &&
                    ((row.original.transferGroupId &&
                      candidate.transferGroupId === row.original.transferGroupId) ||
                      candidate.transferGroupId === row.original.id ||
                      row.original.transferGroupId === candidate.id),
                )?.accountId
              : undefined
          return (
            <Button
              variant="icon"
              aria-label={t('aria.edit', { name: displayDescription(row.original.description) })}
              title={t('aria.edit', { name: displayDescription(row.original.description) })}
              onClick={() => openEditTransaction(row.original, transferAccountId)}
            >
              <Icon name="pencil" size={15} />
            </Button>
          )
        },
      },
    ],
    [accountMap, categoryMap, labelMap, openEditTransaction, transactionItems],
  )
  const table = useReactTable({
    data: transactionItems,
    columns,
    state: { sorting, rowSelection: selected },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowSelectionChange: setSelected,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })
  const tableRows = table.getRowModel().rows
  const mobileVirtualItems = useMemo<MobileVirtualItem[]>(() => {
    const groups = new Map<string, typeof tableRows>()
    for (const row of tableRows) {
      const date = row.original.transactionDate
      const rows = groups.get(date)
      if (rows) rows.push(row)
      else groups.set(date, [row])
    }

    return Array.from(groups).flatMap(([date, rows]) => {
      const total = rows.reduce((sum, row) => {
        if (row.original.type === 'income') return sum + row.original.amountBase
        if (row.original.type === 'expense') return sum - row.original.amountBase
        return sum
      }, 0)

      return [
        { kind: 'day' as const, key: `day-${date}`, date, total },
        ...rows.map((row) => ({
          kind: 'transaction' as const,
          key: row.original.id,
          transaction: row.original,
        })),
      ]
    })
  }, [tableRows])
  const tableRowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => desktopTableScrollRef.current,
    estimateSize: () => 54,
    measureElement: (element) => element.getBoundingClientRect().height,
    overscan: 10,
    enabled: !isMobileLayout,
  })
  const mobileItemVirtualizer = useVirtualizer({
    count: mobileVirtualItems.length,
    getScrollElement: () => mobileListScrollRef.current,
    estimateSize: (index) => (mobileVirtualItems[index]?.kind === 'day' ? 61 : 96),
    measureElement: (element) => element.getBoundingClientRect().height,
    overscan: 8,
    enabled: isMobileLayout,
  })
  const virtualTableRows = tableRowVirtualizer.getVirtualItems()
  const virtualMobileItems = mobileItemVirtualizer.getVirtualItems()
  const lastVisibleVirtualItemIndex = isMobileLayout
    ? (virtualMobileItems.at(-1)?.index ?? -1)
    : (virtualTableRows.at(-1)?.index ?? -1)
  const activeVirtualItemCount = isMobileLayout ? mobileVirtualItems.length : tableRows.length
  const mobileSummary = useMemo(() => {
    const items = transactionItems
    const expenses = items
      .filter((transaction) => transaction.type === 'expense')
      .reduce((total, transaction) => total + transaction.amountBase, 0)
    const income = items
      .filter((transaction) => transaction.type === 'income')
      .reduce((total, transaction) => total + transaction.amountBase, 0)

    return {
      count: items.length,
      expenses,
      income,
      net: income - expenses,
      currency: items[0]?.currency ?? 'EUR',
    }
  }, [transactionItems])
  const selectedIds = Object.keys(selected)
    .filter((key) => selected[key])
    .map((index) => transactionItems[Number(index)]?.id)
    .filter(Boolean) as string[]
  const activeTransaction = activeTransactionId
    ? (transactionItems.find((transaction) => transaction.id === activeTransactionId) ?? null)
    : null

  useEffect(() => {
    setSelected({})
    setActiveTransactionId(null)
    setDeleteTarget(null)
  }, [filterSignature])

  useEffect(() => () => resetUIState(), [resetUIState])

  useEffect(() => {
    if (
      !hasNextPage ||
      isFetchingNextPage ||
      activeVirtualItemCount === 0 ||
      lastVisibleVirtualItemIndex < activeVirtualItemCount - 8
    ) {
      return
    }

    void fetchNextPage()
  }, [
    activeVirtualItemCount,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    lastVisibleVirtualItemIndex,
  ])

  useEffect(() => {
    desktopTableScrollRef.current?.scrollTo({ top: 0 })
    mobileListScrollRef.current?.scrollTo({ top: 0 })
  }, [filterSignature, sorting])

  function requestDelete(ids: string[], name: string) {
    setActiveTransactionId(null)
    setDeleteTarget({ ids, name })
  }

  function setType(nextType: string) {
    const next = new URLSearchParams(searchParams)
    if (nextType === 'all') next.delete('type')
    else next.set('type', nextType)
    setSearchParams(next)
  }

  function openFilters() {
    showFilters({
      dateFrom,
      dateTo,
      accountId,
      categoryId,
      labelId,
      amountMin,
      amountMax,
      recurring: recurring ?? '',
      hasReceipt: hasReceipt ?? '',
    })
  }

  function applyFilters() {
    const next = new URLSearchParams(searchParams)
    ;[
      'dateFrom',
      'dateTo',
      'account',
      'category',
      'label',
      'amountMin',
      'amountMax',
      'recurring',
      'hasReceipt',
    ].forEach((param) => next.delete(param))
    const values: Record<string, string> = {
      dateFrom: filterDraft.dateFrom,
      dateTo: filterDraft.dateTo,
      account: filterDraft.accountId,
      category: filterDraft.categoryId,
      label: filterDraft.labelId,
      amountMin: filterDraft.amountMin,
      amountMax: filterDraft.amountMax,
      recurring: filterDraft.recurring,
      hasReceipt: filterDraft.hasReceipt,
    }
    Object.entries(values).forEach(([param, value]) => {
      if (value) next.set(param, value)
    })
    setSearchParams(next)
    closeFilters()
  }

  function openSaveView() {
    showSaveView(
      t('transactions.viewDefault', {
        number: savedViews.data?.length ? savedViews.data.length + 1 : 1,
      }),
    )
  }

  function applySavedView(viewFilters: TransactionFilters) {
    const next = new URLSearchParams()
    const setFirstValue = (param: string, values?: string[]) => {
      if (values?.[0]) next.set(param, values[0])
    }

    if (viewFilters.search) next.set('search', viewFilters.search)
    setFirstValue('type', viewFilters.types)
    setFirstValue('account', viewFilters.accounts)
    setFirstValue('category', viewFilters.categories)
    setFirstValue('label', viewFilters.labels)
    if (viewFilters.dateFrom) next.set('dateFrom', viewFilters.dateFrom)
    if (viewFilters.dateTo) next.set('dateTo', viewFilters.dateTo)
    if (viewFilters.amountMin !== undefined) next.set('amountMin', String(viewFilters.amountMin))
    if (viewFilters.amountMax !== undefined) next.set('amountMax', String(viewFilters.amountMax))
    if (viewFilters.recurring !== undefined) next.set('recurring', String(viewFilters.recurring))
    if (viewFilters.hasReceipt !== undefined) next.set('hasReceipt', String(viewFilters.hasReceipt))

    setSearchParams(next)
    closeSavedViews()
  }

  function setDateQuickFilter(filter: DateQuickFilter) {
    const range = getDateQuickFilterRange(filter)
    const next = new URLSearchParams(searchParams)
    next.set('dateFrom', range.dateFrom)
    next.set('dateTo', range.dateTo)
    setSearchParams(next)
  }

  function isDateQuickFilterActive(filter: DateQuickFilter) {
    const range = getDateQuickFilterRange(filter)
    return dateFrom === range.dateFrom && dateTo === range.dateTo
  }

  return (
    <Page
      className="transactions-page"
      eyebrow={t('page.ledger')}
      title={t('transactions.title')}
      action={
        <Button variant="primary" onClick={() => openQuickAdd('expense')}>
          <Icon name="plus" size={17} /> {t('transactions.new')}
        </Button>
      }
    >
      <div className="filters">
        <div className="filters__tabs">
          {[
            ['all', t('common.all')],
            ['expense', t('common.expenses')],
            ['income', t('common.income')],
            ['transfer', t('common.transfer')],
          ].map(([value, label]) => (
            <button
              key={value}
              className={type === value ? 'is-active' : ''}
              onClick={() => setType(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search">
          <Icon name="search" size={16} />
          <input
            value={search}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams)
              if (event.target.value) next.set('search', event.target.value)
              else next.delete('search')
              setSearchParams(next)
            }}
            placeholder={t('transactions.searchPlaceholder')}
          />
        </label>
        <Button variant="secondary" onClick={openFilters} aria-expanded={filtersOpen}>
          <Icon name="filter" size={16} /> {t('transactions.moreFilters')}
        </Button>
      </div>
      <div className="shortcuts">
        <div
          className="shortcuts__date-presets"
          role="group"
          aria-label={t('transactions.quickFilters')}
        >
          {(
            [
              ['thisWeek', t('transactions.thisWeek')],
              ['lastWeek', t('transactions.lastWeek')],
              ['thisMonth', t('transactions.thisMonth')],
              ['lastMonth', t('transactions.lastMonth')],
            ] as const
          ).map(([filter, label]) => (
            <button
              key={filter}
              type="button"
              className={isDateQuickFilterActive(filter) ? 'is-active' : ''}
              onClick={() => setDateQuickFilter(filter)}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setSearchParams({ recurring: 'true' })}>
          {t('transactions.recurring')}
        </button>
        <button onClick={() => setSearchParams({})}>{t('transactions.reset')}</button>
        <button onClick={openSaveView}>{t('transactions.saveView')}</button>
        {(savedViews.data?.length ?? 0) > 0 && (
          <div className="saved-view-dropdown">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={savedViewsOpen}
              onClick={toggleSavedViews}
            >
              <Icon name="filter" size={14} /> {t('transactions.applySavedView')}
              <Icon name="chevron-down" size={14} />
            </button>
            {savedViewsOpen && (
              <div className="saved-view-dropdown__menu" role="menu">
                {(savedViews.data ?? []).map((view) => (
                  <button
                    key={view.id}
                    type="button"
                    role="menuitem"
                    onClick={() => applySavedView(view.filters)}
                  >
                    {view.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <AppModal
        isOpen={saveViewOpen}
        onRequestClose={closeSaveView}
        eyebrow={t('transactions.saveViewEyebrow')}
        title={t('transactions.saveViewTitle')}
        width={440}
      >
        <form
          className="form__stack"
          onSubmit={(event) => {
            event.preventDefault()
            const name = saveViewName.trim()
            if (name) saveViewMutation.mutate(name)
          }}
        >
          <label className="form__field" htmlFor="saved-view-name">
            <span>{t('transactions.viewName')}</span>
            <input
              id="saved-view-name"
              autoFocus
              required
              value={saveViewName}
              onChange={(event) => setSaveViewName(event.target.value)}
            />
          </label>
          <div className="modal__actions">
            <Button type="button" variant="ghost" onClick={closeSaveView}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={saveViewMutation.isPending}>
              {saveViewMutation.isPending ? t('transactions.savingView') : t('common.save')}
            </Button>
          </div>
        </form>
      </AppModal>
      <AppModal
        isOpen={filtersOpen}
        onRequestClose={closeFilters}
        eyebrow={t('transactions.filterEyebrow')}
        title={t('transactions.filterTitle')}
        width={640}
      >
        <div className="form__stack">
          <div className="form__grid--two">
            <label className="form__field">
              <span>{t('transactions.dateFrom')}</span>
              <input
                type="date"
                value={filterDraft.dateFrom}
                onChange={(event) => updateFilterDraft({ dateFrom: event.target.value })}
              />
            </label>
            <label className="form__field">
              <span>{t('transactions.dateTo')}</span>
              <input
                type="date"
                value={filterDraft.dateTo}
                onChange={(event) => updateFilterDraft({ dateTo: event.target.value })}
              />
            </label>
          </div>
          <div className="form__grid--two">
            <label className="form__field">
              <span>{t('common.account')}</span>
              <select
                value={filterDraft.accountId}
                onChange={(event) => updateFilterDraft({ accountId: event.target.value })}
              >
                <option value="">{t('common.all')}</option>
                {(accounts.data ?? []).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form__field">
              <span>{t('common.category')}</span>
              <AppSelect
                value={filterDraft.categoryId}
                onChange={(value) => updateFilterDraft({ categoryId: value })}
                placeholder={t('common.all')}
                options={(categories.data ?? []).map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
                formatOptionLabel={formatCategoryOption(categories.data ?? [])}
                isClearable
              />
            </label>
          </div>
          <div className="form__grid--two">
            <label className="form__field">
              <span>{t('nav.labels')}</span>
              <select
                value={filterDraft.labelId}
                onChange={(event) => updateFilterDraft({ labelId: event.target.value })}
              >
                <option value="">{t('common.all')}</option>
                {(labels.data ?? []).map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form__field">
              <span>{t('transactions.receiptStatus')}</span>
              <select
                value={filterDraft.hasReceipt}
                onChange={(event) => updateFilterDraft({ hasReceipt: event.target.value })}
              >
                <option value="">{t('common.all')}</option>
                <option value="true">{t('transactions.withReceipt')}</option>
                <option value="false">{t('transactions.withoutReceipt')}</option>
              </select>
            </label>
          </div>
          <div className="form__grid--two">
            <label className="form__field">
              <span>{t('transactions.amountMin')}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={filterDraft.amountMin}
                onChange={(event) => updateFilterDraft({ amountMin: event.target.value })}
              />
            </label>
            <label className="form__field">
              <span>{t('transactions.amountMax')}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={filterDraft.amountMax}
                onChange={(event) => updateFilterDraft({ amountMax: event.target.value })}
              />
            </label>
          </div>
          <label className="form__field">
            <span>{t('transactions.recurringStatus')}</span>
            <select
              value={filterDraft.recurring}
              onChange={(event) => updateFilterDraft({ recurring: event.target.value })}
            >
              <option value="">{t('common.all')}</option>
              <option value="true">{t('transactions.recurring')}</option>
              <option value="false">{t('transactions.notRecurring')}</option>
            </select>
          </label>
          <div className="modal__actions">
            <Button variant="ghost" onClick={closeFilters}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={applyFilters}>
              <Icon name="filter" size={15} /> {t('transactions.applyFilters')}
            </Button>
          </div>
        </div>
      </AppModal>
      {selectedIds.length > 0 && (
        <div className="bulk-actions">
          <span>{t('transactions.selected', { count: selectedIds.length })}</span>
          <Button
            variant="danger"
            onClick={() =>
              requestDelete(
                selectedIds,
                selectedIds.length === 1
                  ? displayDescription(
                      transactionItems.find((transaction) => transaction.id === selectedIds[0])
                        ?.description ?? t('transactions.title'),
                    )
                  : t('transactions.selected', { count: selectedIds.length }),
              )
            }
          >
            <Icon name="trash" size={15} /> {t('transactions.delete')}
          </Button>
        </div>
      )}
      <AppModal
        isOpen={deleteTarget !== null}
        onRequestClose={() => setDeleteTarget(null)}
        eyebrow={t('transactions.delete')}
        title={t('transactions.deleteTitle')}
        width={440}
      >
        <div className="confirm-modal">
          <p>
            {deleteTarget
              ? deleteTarget.ids.length > 1
                ? t('transactions.deleteMultipleDescription', {
                    count: deleteTarget.ids.length,
                  })
                : t('transactions.deleteDescription', { name: deleteTarget.name })
              : ''}
          </p>
          <div className="modal__actions">
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget?.ids.forEach((id) => deleteMutation.mutate(id))}
            >
              {t('transactions.delete')}
            </Button>
          </div>
        </div>
      </AppModal>
      <section className="transactions-mobile-summary" aria-label={t('transactions.mobileSummary')}>
        <div className="transactions-mobile-summary__header">
          <span>
            <i aria-hidden="true" />
            {t('transactions.mobileSummary')}
          </span>
          <strong>{t('transactions.mobileCount', { count: mobileSummary.count })}</strong>
        </div>
        <div className="transactions-mobile-summary__metrics">
          <div>
            <span>{t('common.expenses')}</span>
            <strong className="is-negative">
              -{formatCurrency(mobileSummary.expenses, mobileSummary.currency)}
            </strong>
          </div>
          <div>
            <span>{t('common.income')}</span>
            <strong className="is-positive">
              +{formatCurrency(mobileSummary.income, mobileSummary.currency)}
            </strong>
          </div>
          <div>
            <span>{t('common.net')}</span>
            <strong className={mobileSummary.net >= 0 ? 'is-positive' : 'is-negative'}>
              {mobileSummary.net >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(mobileSummary.net), mobileSummary.currency)}
            </strong>
          </div>
        </div>
      </section>
      <div ref={mobileListScrollRef} className="transactions-mobile-list">
        {isMobileLayout && mobileVirtualItems.length ? (
          <div
            className="transactions-mobile-virtual-list"
            style={{ height: mobileItemVirtualizer.getTotalSize() }}
          >
            {virtualMobileItems.map((virtualItem) => {
              const item = mobileVirtualItems[virtualItem.index]
              if (!item) return null

              const style = { transform: `translateY(${virtualItem.start}px)` }

              if (item.kind === 'day') {
                return (
                  <div
                    ref={mobileItemVirtualizer.measureElement}
                    data-index={virtualItem.index}
                    className={`transactions-mobile-virtual-item transactions-mobile-virtual-item--day ${virtualItem.index === 0 ? 'is-first' : ''}`}
                    key={item.key}
                    style={style}
                  >
                    <div className="transactions-mobile-day__header">
                      <strong>{formatMobileDate(item.date)}</strong>
                      <span className={item.total >= 0 ? 'is-positive' : 'is-negative'}>
                        {item.total >= 0 ? '+' : '-'}
                        {formatCurrency(Math.abs(item.total), mobileSummary.currency)}
                      </span>
                    </div>
                  </div>
                )
              }

              const { transaction } = item
              const category = transaction.categoryId
                ? categoryMap.get(transaction.categoryId)
                : undefined
              const account = accountMap.get(transaction.accountId) ?? t('common.noAccount')
              const amountPrefix =
                transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''

              return (
                <div
                  ref={mobileItemVirtualizer.measureElement}
                  data-index={virtualItem.index}
                  className="transactions-mobile-virtual-item transactions-mobile-virtual-item--transaction"
                  key={item.key}
                  style={style}
                >
                  <article
                    className={`transactions-mobile-card ${activeTransactionId === transaction.id ? 'is-active' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={activeTransactionId === transaction.id}
                    onClick={() =>
                      setActiveTransactionId((currentId) =>
                        currentId === transaction.id ? null : transaction.id,
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setActiveTransactionId((currentId) =>
                          currentId === transaction.id ? null : transaction.id,
                        )
                      }
                    }}
                  >
                    <span
                      className={`transactions-mobile-card__icon transaction-glyph--${transaction.type}`}
                    >
                      <Icon
                        name={
                          transaction.type === 'income'
                            ? 'arrow-down-right'
                            : transaction.type === 'transfer'
                              ? 'arrow-left-right'
                              : 'shopping-cart'
                        }
                        size={19}
                      />
                    </span>
                    <div className="transactions-mobile-card__body">
                      <div className="transactions-mobile-card__heading">
                        <strong>{displayDescription(transaction.description)}</strong>
                        {transaction.receiptId && <Icon name="receipt" size={16} />}
                      </div>
                      <div className="transactions-mobile-card__meta">
                        <span>{category?.name ?? t('common.noCategory')}</span>
                        <span aria-hidden="true">•</span>
                        <span>{account}</span>
                      </div>
                      {transaction.labelIds.length > 0 && (
                        <div className="transactions-mobile-card__labels">
                          {transaction.labelIds.map((labelId) => (
                            <StatusPill key={labelId} tone="indigo">
                              {`#${labelMap.get(labelId)?.name ?? t('transactions.labelFallback')}`}
                            </StatusPill>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="transactions-mobile-card__amount">
                      <strong
                        className={
                          transaction.type === 'income'
                            ? 'is-positive'
                            : transaction.type === 'expense'
                              ? 'is-negative'
                              : ''
                        }
                      >
                        {amountPrefix}
                        {formatCurrency(transaction.amountBase, transaction.currency)}
                      </strong>
                      <span>{formatMobileTime(transaction.createdAt)}</span>
                    </div>
                  </article>
                </div>
              )
            })}
          </div>
        ) : !transactions.isLoading ? (
          <div className="transactions-mobile-empty">
            <Icon name="receipt" size={24} />
            <strong>{t('transactions.emptyTitle')}</strong>
            <span>{t('transactions.emptyDescription')}</span>
          </div>
        ) : null}
      </div>
      {activeTransaction && (
        <div
          className="transactions-mobile-actions"
          aria-label={t('transactions.mobileActions', {
            name: displayDescription(activeTransaction.description),
          })}
        >
          <span className="transactions-mobile-actions__name">
            {displayDescription(activeTransaction.description)}
          </span>
          <Button
            variant="secondary"
            onClick={() => {
              const transferAccountId =
                activeTransaction.type === 'transfer'
                  ? transactionItems.find(
                      (candidate) =>
                        candidate.id !== activeTransaction.id &&
                        ((activeTransaction.transferGroupId &&
                          candidate.transferGroupId === activeTransaction.transferGroupId) ||
                          candidate.transferGroupId === activeTransaction.id ||
                          activeTransaction.transferGroupId === candidate.id),
                    )?.accountId
                  : undefined
              openEditTransaction(activeTransaction, transferAccountId)
              setActiveTransactionId(null)
            }}
          >
            <Icon name="pencil" size={15} /> {t('transactions.mobileEdit')}
          </Button>
          <Button
            variant="danger"
            disabled={deleteMutation.isPending}
            onClick={() =>
              requestDelete(
                [activeTransaction.id],
                displayDescription(activeTransaction.description),
              )
            }
          >
            <Icon name="trash" size={15} /> {t('transactions.delete')}
          </Button>
          <button
            className="transactions-mobile-actions__close"
            type="button"
            aria-label={t('transactions.mobileCloseActions')}
            onClick={() => setActiveTransactionId(null)}
          >
            <Icon name="x" size={17} />
          </button>
        </div>
      )}
      {transactions.hasNextPage && (
        <Button
          className="transactions-mobile-load-more"
          variant="secondary"
          disabled={transactions.isFetchingNextPage}
          onClick={() => void transactions.fetchNextPage()}
        >
          {t('transactions.mobileLoadMore', {
            count: Math.min(
              TRANSACTION_PAGE_SIZE,
              Math.max(0, transactionTotal - transactionItems.length),
            ),
          })}
          <Icon name="chevron-down" size={16} />
        </Button>
      )}
      {transactions.isFetchingNextPage && (
        <div className="transactions-mobile-load-more-status" role="status">
          {t('transactions.loadingMore')}
        </div>
      )}
      <div className="card card--table">
        <div className="table__meta">
          <span>{t('transactions.results', { count: transactionTotal })}</span>
          <span className="table__muted">{t('transactions.sortHint')}</span>
        </div>
        <div ref={desktopTableScrollRef} className="table__scroll table__scroll--virtual">
          <table className="transactions-table">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={
                        header.column.getCanSort()
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                    >
                      {header.isPlaceholder ? null : (
                        <span>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted()
                            ? header.column.getIsSorted() === 'desc'
                              ? ' ↓'
                              : ' ↑'
                            : ''}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody
              style={
                !transactions.isLoading && tableRows.length
                  ? { height: tableRowVirtualizer.getTotalSize() }
                  : undefined
              }
            >
              {transactions.isLoading ? (
                <tr>
                  <td colSpan={columns.length}>
                    <div className="table__loading" role="status">
                      <span className="table__loading-spinner" aria-hidden="true" />
                      <span>{t('transactions.loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : tableRows.length ? (
                !isMobileLayout &&
                virtualTableRows.map((virtualRow) => {
                  const row = tableRows[virtualRow.index]
                  if (!row) return null

                  return (
                    <tr
                      ref={tableRowVirtualizer.measureElement}
                      data-index={virtualRow.index}
                      className="transactions-table__virtual-row"
                      key={row.id}
                      style={{ transform: `translateY(${virtualRow.start}px)` }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={columns.length}>
                    <div className="table__empty">
                      <Icon name="receipt" size={24} />
                      <strong>{t('transactions.emptyTitle')}</strong>
                      <span>{t('transactions.emptyDescription')}</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {transactions.isFetchingNextPage && (
        <div className="transactions-load-more-status" role="status">
          {t('transactions.loadingMore')}
        </div>
      )}
    </Page>
  )
}
