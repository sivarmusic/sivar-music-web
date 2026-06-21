'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PinkFestShell from '../../components/PinkFestShell'
import ConfirmationStep from '../../components/ConfirmationStep'

interface Order {
  id: string
  order_code: string
  nombre: string
  cantidad: number
  status: string
}

export default function GraciasPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/pinkfest/order/${orderId}`)
      .then(r => r.json())
      .then(d => {
        if (d.order) setOrder(d.order)
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))
  }, [orderId])

  if (notFound) {
    return (
      <PinkFestShell>
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
          <p className="text-white/50 text-sm">Orden no encontrada.</p>
          <button
            onClick={() => router.push('/pinkfest')}
            className="text-[#F472B6] text-sm hover:underline"
          >
            ← Volver al inicio
          </button>
        </div>
      </PinkFestShell>
    )
  }

  if (!order) {
    return (
      <PinkFestShell>
        <div className="flex flex-col items-center justify-center flex-1">
          <p className="text-white/30 text-sm">Cargando...</p>
        </div>
      </PinkFestShell>
    )
  }

  return (
    <PinkFestShell>
      <div className="mb-8 text-center">
        <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase mb-1">
          Pink Fest
        </p>
        <p className="text-white/60 text-sm">Beerhaus · Dom 12 Jul · 4:00 PM</p>
      </div>
      <ConfirmationStep order={order} />
    </PinkFestShell>
  )
}
