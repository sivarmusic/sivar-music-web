'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'

interface Order {
  id: string; order_code: string; nombre: string; cantidad: number; status: string
  events: { slug: string; nombre: string; fecha: string; venue: string } | null
}

export default function EventoGraciasPage() {
  const { t, dateLocale } = useLanguage()
  const STATUS_LABELS: Record<string, { label: string; color: string; icon: string; desc: string }> = {
    en_revision: { label: t('gracias.statusEnRevision'), color: 'text-yellow-400', icon: '⏳', desc: t('gracias.descEnRevision') },
    confirmado: { label: t('gracias.statusConfirmado'), color: 'text-green-400', icon: '✓', desc: t('gracias.descConfirmado') },
    rechazado: { label: t('gracias.statusRechazado'), color: 'text-red-400', icon: '✕', desc: t('gracias.descRechazado') },
  }
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>()
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    try { localStorage.removeItem('sm_pending') } catch {}
    fetch(`/api/eventos/order/${orderId}`)
      .then(r => r.json())
      .then(d => { if (d.order) setOrder(d.order) })
  }, [orderId])

  if (!order) return <div className="min-h-screen bg-[#0a0008] flex items-center justify-center"><p className="text-white/30 text-sm">{t('gracias.loading')}</p></div>

  const statusInfo = STATUS_LABELS[order.status] ?? STATUS_LABELS.en_revision
  const fecha = order.events ? new Date(order.events.fecha) : null

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      <div className="px-5 py-12 max-w-sm mx-auto space-y-6 flex flex-col items-center text-center">
        <div>
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase mb-3">Sivar Music</p>
          <div className="text-5xl mb-4">{statusInfo.icon}</div>
          <h1 className="text-white text-2xl font-bold mb-2">
            {order.status === 'confirmado' ? t('gracias.confirmedTitle') : t('gracias.pendingTitle')}
          </h1>
          <p className={`text-sm font-semibold ${statusInfo.color} mb-3`}>{statusInfo.label}</p>
          <p className="text-white/50 text-sm leading-relaxed">{statusInfo.desc}</p>
        </div>

        {/* Orden */}
        <div className="w-full rounded-2xl border border-white/10 bg-white/4 divide-y divide-white/8">
          {[
            { label: t('gracias.orderCode'), value: order.order_code, pink: true },
            { label: t('gracias.event'), value: order.events?.nombre ?? '—' },
            { label: t('gracias.tickets'), value: `${order.cantidad}` },
            { label: t('gracias.venue'), value: order.events?.venue ?? '—' },
            fecha ? { label: t('gracias.date'), value: fecha.toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'long' }) } : null,
          ].filter(Boolean).map(item => item && (
            <div key={item.label} className="flex items-center justify-between px-4 py-3">
              <span className="text-white/40 text-sm">{item.label}</span>
              <span className={`text-sm font-semibold ${item.pink ? 'text-[#F472B6]' : 'text-white'}`}>{item.value}</span>
            </div>
          ))}
        </div>

        <Link href="/eventos/mi-cuenta"
          className="w-full bg-[#F472B6] hover:bg-[#ec4899] text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 text-center block transition">
          {order.status === 'confirmado' ? t('gracias.seeMyTickets') : t('gracias.seeMyAccount')}
        </Link>

        <Link href="/eventos" className="text-white/30 hover:text-white text-xs transition">
          {t('gracias.seeAll')}
        </Link>

        <p className="text-white/15 text-[10px] pt-4">Sivar Music Group · 2025</p>
      </div>
    </div>
  )
}
