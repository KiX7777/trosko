import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'react-toastify'
import { useAccountsQuery } from '../../hooks/use-account-queries'
import { useCategoriesQuery } from '../../hooks/use-category-queries'
import {
  useDeleteReceiptMutation,
  useProcessReceiptMutation,
  useReceiptsQuery,
} from '../../hooks/use-receipt-queries'
import { useSaveTransactionMutation } from '../../hooks/use-transaction-queries'
import { Icon } from '../../components/ui/icon'
import { Page } from '../../components/ui/page'
import { Button } from '../../components/ui/button'
import { AppModal } from '../../components/ui/modal'
import { AppSelect } from '../../components/ui/select'
import { CurrencyInput } from '../../components/ui/currency-input'
import { formatCategoryOption } from '../../components/ui/category-options'
import { formatCurrency, todayIso } from '../../lib/format'
import { t } from '../../lib/i18n'
import type { Category, Receipt } from '../../types/domain'

type ReviewDraft = {
  type: 'expense' | 'income'
  description: string
  merchant: string
  amount?: number
  currency: string
  transactionDate: string
  accountId: string
  categoryId: string
}

type ProcessingFile = { id: string; name: string }

function fileName(filePath: string) {
  return filePath.split('/').filter(Boolean).at(-1) ?? filePath
}

function suggestedCategoryId(categories: Category[], suggestion?: string) {
  if (!suggestion) return ''
  const normalizedSuggestion = suggestion.toLocaleLowerCase('hr')
  return (
    categories.find((category) => {
      const normalizedName = category.name.toLocaleLowerCase('hr')
      return (
        normalizedName.includes(normalizedSuggestion) ||
        normalizedSuggestion.includes(normalizedName.split(' ')[0])
      )
    })?.id ?? ''
  )
}

function draftFromReceipt(receipt: Receipt, categories: Category[]): ReviewDraft {
  const data = receipt.ocrData
  return {
    type: 'expense',
    description: data?.merchant || fileName(receipt.filePath).replace(/\.[^.]+$/, '') || 'Račun',
    merchant: data?.merchant ?? '',
    amount: data?.total,
    currency: data?.currency ?? 'EUR',
    transactionDate: data?.date ?? todayIso(),
    accountId: '',
    categoryId: suggestedCategoryId(categories, data?.suggestedCategory),
  }
}

function receiptStatus(receipt: Receipt) {
  if (receipt.transactionId) return t('receipts.booked')
  if (receipt.ocrStatus === 'processing' || receipt.ocrStatus === 'pending') {
    return t('receipts.ocrProcessing')
  }
  if (receipt.ocrStatus === 'failed') return t('receipts.ocrFailed')
  if (receipt.ocrStatus === 'completed') return t('receipts.ocrCompleted')
  return t('receipts.manualReview')
}

export function ReceiptsPage() {
  const receiptsQuery = useReceiptsQuery()
  const accountsQuery = useAccountsQuery()
  const categoriesQuery = useCategoriesQuery()
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([])
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [draft, setDraft] = useState<ReviewDraft | null>(null)
  const categories = categoriesQuery.data ?? []
  const processReceipt = useProcessReceiptMutation({
    onError: () => toast.error(t('receipts.uploadError')),
  })
  const deleteReceipt = useDeleteReceiptMutation({
    onError: () => toast.error(t('receipts.deleteError')),
  })
  const saveTransaction = useSaveTransactionMutation(undefined, {
    onSuccess: () => {
      setSelectedReceipt(null)
      setDraft(null)
      toast.success(t('receipts.bookedSuccess'))
    },
    onError: () => toast.error(t('receipts.bookedError')),
  })

  const openReview = useCallback(
    (receipt: Receipt) => {
      setSelectedReceipt(receipt)
      setDraft(draftFromReceipt(receipt, categories))
    },
    [categories],
  )

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files.length) return
      const pending = files.map((file) => ({ id: crypto.randomUUID(), name: file.name }))
      setProcessingFiles((current) => [...pending, ...current])
      toast.success(
        t('receipts.addedToQueue', {
          count: files.length,
          receiptWord:
            files.length === 1 ? t('receipts.receiptSingular') : t('receipts.receiptPlural'),
        }),
      )
      await Promise.all(
        files.map(async (file, index) => {
          try {
            const receipt = await processReceipt.mutateAsync(file)
            if (receipt.ocrStatus === 'failed') {
              toast.error(receipt.ocrData?.message ?? t('receipts.ocrFailed'))
            }
          } catch (error) {
            void error
          } finally {
            setProcessingFiles((current) => current.filter((item) => item.id !== pending[index].id))
          }
        }),
      )
    },
    [processReceipt],
  )
  const dropzone = useDropzone({
    onDrop,
    onDropRejected: () => toast.error(t('receipts.invalidFile')),
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'], 'application/pdf': ['.pdf'] },
    maxFiles: 10,
    maxSize: 10 * 1024 * 1024,
  })

  const reviewCategories = useMemo(
    () => categories.filter((category) => category.type === draft?.type),
    [categories, draft?.type],
  )
  const receipts = receiptsQuery.data ?? []

  function closeReview() {
    setSelectedReceipt(null)
    setDraft(null)
  }

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedReceipt || !draft) return
    const amount = draft.amount
    if (!draft.description.trim() || !draft.accountId || amount === undefined || amount <= 0) {
      toast.error(t('receipts.reviewRequired'))
      return
    }
    saveTransaction.mutate({
      ...draft,
      amount,
      description: draft.description.trim(),
      merchant: draft.merchant.trim() || undefined,
      categoryId: draft.categoryId || undefined,
      receiptId: selectedReceipt.id,
    })
  }

  return (
    <Page
      eyebrow={t('page.receipts')}
      title={t('receipts.title')}
      description={t('receipts.description')}
      action={
        <Button variant="primary" onClick={() => dropzone.open()}>
          <Icon name="upload" size={16} /> {t('receipts.add')}
        </Button>
      }
    >
      <section className="receipts__layout">
        <button
          type="button"
          className={`receipts__dropzone ${dropzone.isDragActive ? 'is-active' : ''}`}
          {...dropzone.getRootProps()}
        >
          <input {...dropzone.getInputProps()} />
          <span className="receipts__upload-orb">
            <Icon name="upload" size={24} />
          </span>
          <strong>
            {dropzone.isDragActive ? t('receipts.dropActive') : t('receipts.dropHere')}
          </strong>
          <span>{t('receipts.chooseFile')}</span>
          <small>{t('receipts.fileLimit')}</small>
        </button>
        <div className="card receipts__review-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t('page.ocrQueue')}</span>
              <h2>{t('receipts.pendingReview')}</h2>
            </div>
            <span className="badge--count">{receipts.length + processingFiles.length}</span>
          </div>
          {!processingFiles.length && !receipts.length ? (
            <div className="table__empty">
              <Icon name="file-text" size={24} />
              <strong>{t('receipts.emptyTitle')}</strong>
              <span>{t('receipts.emptyDescription')}</span>
            </div>
          ) : (
            <div className="receipts__list">
              {processingFiles.map((file) => (
                <div className="receipts__row" key={file.id}>
                  <span className="receipts__file-icon">
                    <Icon name="file-text" size={17} />
                  </span>
                  <span>
                    <strong>{file.name}</strong>
                  </span>
                  <span className="receipts__status">{t('receipts.ocrProcessing')}</span>
                </div>
              ))}
              {receipts.map((receipt) => (
                <div className="receipts__row" key={receipt.id}>
                  <span className="receipts__file-icon">
                    <Icon name="file-text" size={17} />
                  </span>
                  <span>
                    <strong>{fileName(receipt.filePath)}</strong>
                    <small>
                      {receipt.ocrData?.merchant ?? receipt.ocrData?.message ?? receipt.mimeType}
                    </small>
                  </span>
                  <span className="receipts__status">
                    {receiptStatus(receipt)}
                    {receipt.ocrData?.total !== undefined && (
                      <small>
                        {formatCurrency(receipt.ocrData.total, receipt.ocrData.currency ?? 'EUR')}
                      </small>
                    )}
                  </span>
                  <div className="receipts__actions">
                    {!receipt.transactionId &&
                      receipt.ocrStatus !== 'processing' &&
                      receipt.ocrStatus !== 'pending' && (
                        <Button variant="ghost" onClick={() => openReview(receipt)}>
                          {t('receipts.review')}
                        </Button>
                      )}
                    <Button
                      variant="icon"
                      aria-label={t('receipts.delete')}
                      title={t('receipts.delete')}
                      disabled={deleteReceipt.isPending}
                      onClick={() => deleteReceipt.mutate(receipt)}
                    >
                      <Icon name="trash" size={15} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <AppModal
        isOpen={Boolean(selectedReceipt && draft)}
        onRequestClose={closeReview}
        eyebrow={t('receipts.reviewEyebrow')}
        title={t('receipts.reviewTitle')}
        width={680}
      >
        {selectedReceipt && draft && (
          <form className="form__stack" onSubmit={submitReview}>
            <p className="receipts__review-note">{t('receipts.reviewDescription')}</p>
            <div className="segmented-control">
              {(['expense', 'income'] as const).map((type) => (
                <button
                  type="button"
                  key={type}
                  className={draft.type === type ? 'is-selected' : ''}
                  onClick={() =>
                    setDraft((current) => current && { ...current, type, categoryId: '' })
                  }
                >
                  {type === 'expense' ? t('common.expense') : t('common.incomeSingular')}
                </button>
              ))}
            </div>
            <label className="form__field">
              <span>{t('common.description')}</span>
              <input
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </label>
            <label className="form__field">
              <span>{t('quickAdd.source')}</span>
              <input
                value={draft.merchant}
                onChange={(event) => setDraft({ ...draft, merchant: event.target.value })}
              />
            </label>
            <div className="form__grid--two">
              <label className="form__field">
                <span>{t('common.amount')}</span>
                <CurrencyInput
                  value={draft.amount}
                  onValueChange={(amount) => setDraft({ ...draft, amount })}
                  currency={draft.currency}
                />
              </label>
              <label className="form__field">
                <span>{t('common.date')}</span>
                <input
                  type="date"
                  value={draft.transactionDate}
                  onChange={(event) => setDraft({ ...draft, transactionDate: event.target.value })}
                />
              </label>
            </div>
            <div className="form__grid--two">
              <label className="form__field">
                <span>{t('common.currency')}</span>
                <select
                  value={draft.currency}
                  onChange={(event) => setDraft({ ...draft, currency: event.target.value })}
                >
                  {['EUR', 'HRK', 'USD', 'GBP'].map((currency) => (
                    <option key={currency}>{currency}</option>
                  ))}
                </select>
              </label>
              <label className="form__field">
                <span>{t('common.account')}</span>
                <AppSelect
                  value={draft.accountId}
                  onChange={(accountId) => setDraft({ ...draft, accountId })}
                  placeholder={t('common.noAccount')}
                  options={(accountsQuery.data ?? []).map((account) => ({
                    value: account.id,
                    label: account.name,
                  }))}
                  isSearchable
                  isClearable
                />
              </label>
            </div>
            <label className="form__field">
              <span>{t('common.category')}</span>
              <AppSelect
                value={draft.categoryId}
                onChange={(categoryId) => setDraft({ ...draft, categoryId })}
                placeholder={t('common.noCategory')}
                options={reviewCategories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
                formatOptionLabel={formatCategoryOption(reviewCategories)}
                isSearchable
                isClearable
              />
            </label>
            {selectedReceipt.ocrData?.extractedText && (
              <details className="receipts__source-text">
                <summary>{t('receipts.extractedText')}</summary>
                <pre>{selectedReceipt.ocrData.extractedText}</pre>
              </details>
            )}
            <div className="modal__actions">
              <Button type="button" variant="ghost" onClick={closeReview}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="primary" disabled={saveTransaction.isPending}>
                {saveTransaction.isPending ? t('quickAdd.saving') : t('receipts.bookTransaction')}
              </Button>
            </div>
          </form>
        )}
      </AppModal>
    </Page>
  )
}
