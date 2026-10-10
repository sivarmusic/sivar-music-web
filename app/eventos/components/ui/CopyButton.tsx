'use client'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../icons'

interface CopyButtonProps {
  /** Texto que se copia al portapapeles. */
  value: string
  /** Nombre accesible completo (p. ej. "Copiar concepto"). */
  ariaLabel: string
  /** Texto visible en reposo. */
  idleLabel: string
  /** Texto visible tras copiar. */
  doneLabel: string
  /** Anuncio por la región aria-live (p. ej. "Copiado: SMG-7K4Q2"). */
  announce: string
}

/** Botón "copiar" del sistema: reposo → copiado (.is-copied), con anuncio aria-live. */
export default function CopyButton({ value, ariaLabel, idleLabel, doneLabel, announce }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1800)
    } catch { /* sin permiso de portapapeles: el valor sigue visible para copiarlo a mano */ }
  }

  return (
    <>
      <button type="button" className={`ev-copy-btn${copied ? ' is-copied' : ''}`} onClick={copy} aria-label={ariaLabel}>
        <span className="ev-copy-btn__idle"><Icon name="copy" />{idleLabel}</span>
        <span className="ev-copy-btn__done"><Icon name="check" />{doneLabel}</span>
      </button>
      <span className="ev-visually-hidden" role="status" aria-live="polite">{copied ? announce : ''}</span>
    </>
  )
}
