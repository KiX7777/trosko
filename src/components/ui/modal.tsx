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
}: PropsWithChildren<{
  isOpen: boolean
  onRequestClose: () => void
  title: string
  eyebrow?: string
  width?: number
}>) {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      shouldCloseOnEsc
      shouldCloseOnOverlayClick
      closeTimeoutMS={220}
      className={{
        base: 'modal__card',
        afterOpen: 'modal__card--open',
        beforeClose: 'modal__card--closing',
      }}
      overlayClassName={{
        base: 'modal__overlay',
        afterOpen: 'modal__overlay--open',
        beforeClose: 'modal__overlay--closing',
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
