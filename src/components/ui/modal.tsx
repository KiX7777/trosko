import Modal from 'react-modal'
import type { PropsWithChildren } from 'react'
import { Button } from './button'
import { Icon } from './icon'
import { t } from '../../lib/i18n'

Modal.setAppElement('#root')

export function AppModal({
  isOpen,
  onRequestClose,
  title,
  eyebrow,
  children,
  width = 520,
  className = '',
}: PropsWithChildren<{
  isOpen: boolean
  onRequestClose: () => void
  title: string
  eyebrow?: string
  width?: number
  className?: string
}>) {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      shouldCloseOnEsc
      shouldCloseOnOverlayClick
      closeTimeoutMS={220}
      className={{
        base: `modal__card ${className}`.trim(),
        afterOpen: `modal__card--open ${className}`.trim(),
        beforeClose: `modal__card--closing ${className}`.trim(),
      }}
      overlayClassName={{
        base: `modal__overlay ${className ? `${className}--overlay` : ''}`.trim(),
        afterOpen: `modal__overlay--open ${className ? `${className}--overlay` : ''}`.trim(),
        beforeClose: `modal__overlay--closing ${className ? `${className}--overlay` : ''}`.trim(),
      }}
      style={{ content: { maxWidth: width } }}
    >
      <div className="modal__header">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
        </div>
        <Button variant="icon" aria-label={t('aria.close')} onClick={onRequestClose}>
          <Icon name="x" />
        </Button>
      </div>
      {children}
    </Modal>
  )
}
