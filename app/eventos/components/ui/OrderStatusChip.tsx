'use client'
import { useLanguage } from '@/lib/i18n'
import { copyFor, type CopyKey } from '../../copy'
import { Icon, type IconName } from '../icons'

export type OrderStatus = 'pendiente_comprobante' | 'en_revision' | 'confirmado' | 'rechazado'

const MAP: Record<OrderStatus, { cls: string; icon: IconName; label: CopyKey; short: CopyKey }> = {
  pendiente_comprobante: { cls: 'pending', icon: 'hourglass', label: 'evs.status.pending', short: 'evs.status.missing' },
  en_revision: { cls: 'review', icon: 'eye', label: 'evs.status.review', short: 'evs.status.review' },
  confirmado: { cls: 'confirmed', icon: 'check-circle', label: 'evs.status.confirmed', short: 'evs.status.confirmed' },
  rechazado: { cls: 'rejected', icon: 'x-circle', label: 'evs.status.rejected', short: 'evs.status.rejected' },
}

/** Chip de estado de orden: icono + palabra + color (nunca color solo). */
export default function OrderStatusChip({ status, variant = 'long' }: { status: string; variant?: 'long' | 'short' }) {
  const { lang } = useLanguage()
  const m = MAP[status as OrderStatus] ?? MAP.pendiente_comprobante
  // En "Mi cuenta" la orden sin comprobante se rotula "Falta comprobante" y lleva el icono de subir.
  const icon: IconName = variant === 'short' && status === 'pendiente_comprobante' ? 'upload' : m.icon
  return (
    <span className={`ev-chip ev-chip--${m.cls}`}>
      <Icon name={icon} />
      {copyFor(lang, variant === 'short' ? m.short : m.label)}
    </span>
  )
}
