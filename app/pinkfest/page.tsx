'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import PinkFestShell from './components/PinkFestShell'
import TicketForm from './components/TicketForm'

interface PendingOrder {
  orderId: string
  orderCode: string
  nombre: string
  expiresAt: number
}

export default function PinkFestPage() {
  const router = useRouter()
  const [pending, setPending] = useState<PendingOrder | null>(null)

  useEffect(() => {
    fetch('/api/pinkfest/track', { method: 'POST' }).catch(() => {})

    try {
      const raw = localStorage.getItem('pf_pending')
      if (raw) {
        const data: PendingOrder = JSON.parse(raw)
        if (data.expiresAt > Date.now()) {
          setPending(data)
        } else {
          localStorage.removeItem('pf_pending')
        }
      }
    } catch {}
  }, [])

  return (
    <PinkFestShell>
      <div className="w-full max-w-sm mb-8">
        <Image
          src="/pinkfest/poster.jpg"
          alt="Pink Fest — A beneficio de Fundación Hogar Felino"
          width={480}
          height={600}
          className="w-full rounded-3xl shadow-[0_24px_64px_rgba(244,114,182,0.25)]"
          priority
        />
      </div>

      {/* Banner de compra pendiente — aparece si volvieron desde el banco */}
      {pending && (
        <div className="w-full max-w-sm mb-5 rounded-2xl border border-yellow-400/30 bg-yellow-400/8 px-5 py-4">
          <p className="text-yellow-300 text-[10px] font-bold tracking-[0.2em] uppercase mb-1">
            Tenés una compra pendiente
          </p>
          <p className="text-white/70 text-sm mb-3">
            Hola <span className="text-white font-semibold">{pending.nombre?.split(' ')[0]}</span>,
            tu orden <span className="text-yellow-300 font-mono font-semibold">{pending.orderCode}</span> está
            esperando el comprobante de pago.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/pinkfest/pago/${pending.orderId}`)}
              className="flex-1 bg-yellow-400/20 hover:bg-yellow-400/30 border border-yellow-400/40 text-yellow-300 text-sm font-semibold rounded-xl py-2.5 transition"
            >
              Continuar →
            </button>
            <button
              onClick={() => {
                try { localStorage.removeItem('pf_pending') } catch {}
                setPending(null)
              }}
              className="text-white/30 hover:text-white/60 text-xs px-3 transition"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* Banner refugio */}
      <div className="w-full max-w-sm mb-6 rounded-2xl border border-[#F472B6]/25 bg-[#F472B6]/8 px-5 py-4 text-center">
        <p className="text-[#F472B6] text-[11px] font-bold tracking-[0.2em] uppercase mb-1">
          100% de las ganancias
        </p>
        <p className="text-white/70 text-sm leading-relaxed">
          Todas las ganancias del evento se donan al{' '}
          <span className="text-white font-semibold">Refugio Hogar Felino</span>,
          un espacio dedicado al rescate y cuidado de gatos en situación de calle.
        </p>
      </div>

      <TicketForm
        onSuccess={order => router.push(`/pinkfest/pago/${order.id}`)}
      />
    </PinkFestShell>
  )
}
