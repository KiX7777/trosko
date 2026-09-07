import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'react-toastify'
import { Icon } from '../../components/ui/icon'
import { Page } from '../../components/ui/page'
import { Button } from '../../components/ui/button'
import { t } from '../../lib/i18n'

type ReviewItem = { id: string; name: string; size: string }

export function ReceiptsPage() {
  const [items, setItems] = useState<ReviewItem[]>([])
  const onDrop = useCallback((files: File[]) => {
    if (!files.length) return
    setItems((current) => [
      ...files.map((file) => ({
        id: `${file.name}-${file.lastModified}`,
        name: file.name,
        size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      })),
      ...current,
    ])
    toast.success(
      t('receipts.addedToQueue', {
        count: files.length,
        receiptWord:
          files.length === 1 ? t('receipts.receiptSingular') : t('receipts.receiptPlural'),
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
      <section className="receipts-layout">
        <button
          type="button"
          className={`receipt-dropzone ${dropzone.isDragActive ? 'active' : ''}`}
          {...dropzone.getRootProps()}
        >
          <input {...dropzone.getInputProps()} />
          <span className="upload-orb">
            <Icon name="upload" size={24} />
          </span>
          <strong>
            {dropzone.isDragActive ? t('receipts.dropActive') : t('receipts.dropHere')}
          </strong>
          <span>{t('receipts.chooseFile')}</span>
        </button>
        <div className="surface-card receipt-review-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t('page.ocrQueue')}</span>
              <h2>{t('receipts.pendingReview')}</h2>
            </div>
            <span className="count-badge">{items.length}</span>
          </div>
          {items.length === 0 ? (
            <div className="table-empty">
              <Icon name="file-text" size={24} />
              <strong>{t('receipts.emptyTitle')}</strong>
              <span>{t('receipts.emptyDescription')}</span>
            </div>
          ) : (
            <div className="receipt-list">
              {items.map((item) => (
                <div className="receipt-row" key={item.id}>
                  <span className="receipt-file-icon">
                    <Icon name="file-text" size={17} />
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.size}</small>
                  </span>
                  <span className="receipt-status">{t('receipts.manualReview')}</span>
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
