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
      <TicketForm
        onSuccess={order => router.push(`/pinkfest/pago/${order.id}`)}
      />
    </PinkFestShell>
  )
}
