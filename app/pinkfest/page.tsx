'use client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import PinkFestShell from './components/PinkFestShell'
import TicketForm from './components/TicketForm'

export default function PinkFestPage() {
  const router = useRouter()

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
