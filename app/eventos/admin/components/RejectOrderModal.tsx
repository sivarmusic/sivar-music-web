'use client'
import { useEffect, useRef } from 'react'
import { Icon } from '../../components/icons'

interface Props {
  code: string
  detail: string
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
}

/** Confirmación antes de rechazar una orden (hoja inferior en mobile, centrada en desktop). */
export default function RejectOrderModal({ code, detail, busy, onCancel, onConfirm }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="ev-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="ev-modal" role="dialog" aria-modal="true" aria-labelledby="reject-title" aria-describedby="reject-desc">
        <div className="ev-modal__head">
          <h2 className="ev-modal__title" id="reject-title">¿Rechazar {code}?</h2>
          <button type="button" className="ev-icon-btn" aria-label="Cerrar" onClick={onCancel}>
            <Icon name="x" />
          </button>
        </div>
        <p className="ev-muted" id="reject-desc">
          {detail ? `${detail}. ` : ''}La orden queda como <strong style={{ color: 'var(--ev-color-error)' }}>rechazada</strong> y no se envían entradas.
        </p>
        <div className="ev-modal__actions">
          <button ref={cancelRef} type="button" className="ev-btn ev-btn--ghost" onClick={onCancel}>Cancelar</button>
          <button type="button" className="ev-btn ev-btn--danger" onClick={onConfirm} disabled={busy}>
            <Icon name="x" />Sí, rechazar
          </button>
        </div>
      </div>
    </div>
  )
}
