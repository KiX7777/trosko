import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  createSavedView,
  deleteTransaction,
  getAccounts,
  getCategories,
  getLabels,
  getSavedViews,
  getTransactions,
} from '../../lib/repository'
import type { Transaction, TransactionFilters, TransactionType } from '../../types/domain'
import { formatCurrency, formatDate } from '../../lib/format'
import { Page } from '../../components/ui/page'
import { Button } from '../../components/ui/button'
import { Icon } from '../../components/ui/icon'
import { StatusPill } from '../../components/ui/status'
import { useUIStore } from '../../stores/ui-store'
import { t } from '../../lib/i18n'

export function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [sorting, setSorting] = useState<SortingState>([{ id: 'transactionDate', desc: true }])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const openQuickAdd = useUIStore((state) => state.openQuickAdd)
  const search = searchParams.get('search') ?? ''
  const type = (searchParams.get('type') as TransactionType | null) ?? 'all'
  const recurring = searchParams.get('recurring')
  const hasReceipt = searchParams.get('hasReceipt')
  const filters: TransactionFilters = {
    search: search || undefined,
    types: type === 'all' ? undefined : [type],
    recurring: recurring === null ? undefined : recurring === 'true',
    hasReceipt: hasReceipt === null ? undefined : hasReceipt === 'true',
  }
  const transactions = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => getTransactions(filters),
  })
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => getAccounts() })
  const categories = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const labels = useQuery({ queryKey: ['labels'], queryFn: getLabels })
  const savedViews = useQuery({
    queryKey: ['saved-views'],
    queryFn: () => getSavedViews('transactions'),
  })
  const queryClient = useQueryClient()
  const openEditTransaction = useUIStore((state) => state.openEditTransaction)
  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setSelected({})
      toast.success(t('transactions.deleted'))
    },
  })
  const saveViewMutation = useMutation({
    mutationFn: (name: string) => createSavedView(name, filters),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['saved-views'] })
      toast.success(t('transactions.saveViewDone'))
    },
  })
  const accountMap = useMemo(
    () => new Map((accounts.data ?? []).map((account) => [account.id, account.name])),
    [accounts.data],
  )
  const categoryMap = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category.name])),
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
            aria-label={t('aria.select', { name: row.original.description })}
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
            <span className={`transaction-glyph ${row.original.type}`}>
              <Icon
                name={
                  row.original.type === 'income'
                    ? 'arrow-down-right'
                    : row.original.type === 'transfer'
                      ? 'arrow-left-right'
                      : 'shopping-cart'
                }
                size={15}
              />
            </span>
            <span>
              <strong>{row.original.description}</strong>
              <small>{row.original.merchant ?? t('common.noMerchant')}</small>
            </span>
          </div>
        ),
      },
      {
        id: 'category',
        header: t('common.category'),
        cell: ({ row }) =>
          row.original.categoryId ? (categoryMap.get(row.original.categoryId) ?? '—') : '—',
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
              ? transactions.data?.find(
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
              aria-label={t('aria.edit', { name: row.original.description })}
              title={t('aria.edit', { name: row.original.description })}
              onClick={() => openEditTransaction(row.original, transferAccountId)}
            >
              <Icon name="pencil" size={15} />
            </Button>
          )
        },
      },
    ],
    [accountMap, categoryMap, labelMap, openEditTransaction, transactions.data],
  )
  const table = useReactTable({
    data: transactions.data ?? [],
    columns,
    state: { sorting, rowSelection: selected },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowSelectionChange: setSelected,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })
  const selectedIds = Object.keys(selected)
    .filter((key) => selected[key])
    .map((index) => (transactions.data ?? [])[Number(index)]?.id)
    .filter(Boolean) as string[]

  function setType(nextType: string) {
    const next = new URLSearchParams(searchParams)
    if (nextType === 'all') next.delete('type')
    else next.set('type', nextType)
    setSearchParams(next)
  }

  return (
    <Page
      eyebrow={t('page.ledger')}
      title={t('transactions.title')}
      description={t('transactions.description')}
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
        <Button variant="secondary">
          <Icon name="filter" size={16} /> {t('transactions.moreFilters')}
        </Button>
      </div>
      <div className="shortcuts">
        <button onClick={() => setSearchParams({ type: 'expense' })}>
          {t('transactions.thisMonth')}
        </button>
        <button onClick={() => setSearchParams({ recurring: 'true' })}>
          {t('transactions.recurring')}
        </button>
        <button onClick={() => setSearchParams({ hasReceipt: 'false' })}>
          {t('transactions.withoutReceipt')}
        </button>
        <button onClick={() => setSearchParams({})}>{t('transactions.reset')}</button>
        <button
          onClick={() => {
            const name = window.prompt(
              t('transactions.viewName'),
              t('transactions.viewDefault', {
                number: savedViews.data?.length ? savedViews.data.length + 1 : 1,
              }),
            )
            if (name?.trim()) saveViewMutation.mutate(name.trim())
          }}
        >
          {t('transactions.saveView')}
        </button>
      </div>
      {selectedIds.length > 0 && (
        <div className="bulk-actions">
          <span>{t('transactions.selected', { count: selectedIds.length })}</span>
          <Button
            variant="danger"
            onClick={() => selectedIds.forEach((id) => deleteMutation.mutate(id))}
          >
            <Icon name="trash" size={15} /> {t('transactions.delete')}
          </Button>
        </div>
      )}
      <div className="card card--table">
        <div className="table__meta">
          <span>{t('transactions.results', { count: transactions.data?.length ?? 0 })}</span>
          <span className="table__muted">{t('transactions.sortHint')}</span>
        </div>
        <div className="table__scroll">
          <table>
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
            <tbody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
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
    </Page>
  )
}
