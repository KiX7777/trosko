import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'react-toastify'
import { Icon } from '../../components/ui/icon'
import { Page } from '../../components/ui/page'
import { Button } from '../../components/ui/button'
import { t } from '../../lib/i18n'
import { parseReceipt, type OcrResult } from '../../lib/ocr-api'

type ReviewItem = {
  id: string
  name: string
  size: string
  status: 'processing' | 'done' | 'failed'
  result?: OcrResult
}

export function ReceiptsPage() {
  const [items, setItems] = useState<ReviewItem[]>([])
  const onDrop = useCallback(async (files: File[]) => {
    if (!files.length) return
    const uploadedItems = files.map((file) => ({
      file,
      item: {
        id: `${file.name}-${file.lastModified}-${file.size}`,
        name: file.name,
        size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
        status: 'processing' as const,
      },
    }))
    setItems((current) => [...uploadedItems.map(({ item }) => item), ...current])
    toast.success(
      t('receipts.addedToQueue', {
        count: files.length,
        receiptWord:
          files.length === 1 ? t('receipts.receiptSingular') : t('receipts.receiptPlural'),
      }),
    )

    await Promise.all(
      uploadedItems.map(async ({ file, item }) => {
        try {
          const result = await parseReceipt(file)
          setItems((current) =>
            current.map((candidate) =>
              candidate.id === item.id ? { ...candidate, status: 'done', result } : candidate,
            ),
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : t('receipts.ocrFailed')
          setItems((current) =>
            current.map((candidate) =>
              candidate.id === item.id
                ? {
                    ...candidate,
                    status: 'failed',
                    result: { status: 'failed', message },
                  }
                : candidate,
            ),
          )
        }
      }),
    )
  }, [])
  const dropzone = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'], 'application/pdf': ['.pdf'] },
    maxFiles: 10,
  })
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
        </button>
        <div className="card receipts__review-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t('page.ocrQueue')}</span>
              <h2>{t('receipts.pendingReview')}</h2>
            </div>
            <span className="badge--count">{items.length}</span>
          </div>
          {items.length === 0 ? (
            <div className="table__empty">
              <Icon name="file-text" size={24} />
              <strong>{t('receipts.emptyTitle')}</strong>
              <span>{t('receipts.emptyDescription')}</span>
            </div>
          ) : (
            <div className="receipts__list">
              {items.map((item) => (
                <div className="receipts__row" key={item.id}>
                  <span className="receipts__file-icon">
                    <Icon name="file-text" size={17} />
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.size}</small>
                  </span>
                  <span className="receipts__status">
                    {item.status === 'processing'
                      ? t('receipts.ocrProcessing')
                      : item.status === 'failed' || item.result?.status === 'failed'
                        ? t('receipts.ocrFailed')
                        : item.result?.status === 'completed'
                          ? t('receipts.ocrCompleted')
                          : t('receipts.manualReview')}
                    {item.result?.total !== undefined && (
                      <small>
                        {item.result.total.toFixed(2)} {item.result.currency ?? ''}
                      </small>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    aria-label={t('common.close')}
                    onClick={() =>
                      setItems((current) => current.filter((candidate) => candidate.id !== item.id))
                    }
                  >
                    <Icon name="x" size={15} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Page>
  )
}
