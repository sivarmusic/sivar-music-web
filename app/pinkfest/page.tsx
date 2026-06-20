'use client'
import { useState } from 'react'
import Image from 'next/image'
import TicketForm from './components/TicketForm'
import PaymentStep from './components/PaymentStep'
import ConfirmationStep from './components/ConfirmationStep'

type Step = 'form' | 'payment' | 'confirmed'

interface Order {
  id: string
  order_code: string
  nombre: string
  cantidad: number
  status: string
}

export default function PinkFestPage() {
  const [step, setStep] = useState<Step>('form')
  const [order, setOrder] = useState<Order | null>(null)

  return (
    <div className="relative min-h-screen bg-[#0a0008] overflow-x-hidden">
      {/* Fondo con textura */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src="/pinkfest/bg-texture.jpg"
          alt=""
          fill
          className="object-cover opacity-[0.18]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0008]/70 via-[#0a0008]/30 to-[#0a0008]/85" />
      </div>

      <div className="relative z-10 flex flex-col items-center min-h-screen px-5 py-10">

        {/* Hero / Afiche — solo en el paso 1 */}
        {step === 'form' && (
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
        )}

        {/* Mini-header en pasos 2 y 3 */}
        {step !== 'form' && (
          <div className="mb-8 text-center">
            <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase mb-1">
              Pink Fest
            </p>
            <p className="text-white/60 text-sm">Beerhaus · Dom 12 Jul · 4:00 PM</p>
          </div>
        )}

        {/* Pasos */}
        {step === 'form' && (
          <TicketForm
            onSuccess={o => {
              setOrder(o)
              setStep('payment')
            }}
          />
        )}

        {step === 'payment' && order && (
          <PaymentStep
            order={order}
            onSuccess={() => setStep('confirmed')}
          />
        )}

        {step === 'confirmed' && order && (
          <ConfirmationStep order={order} />
        )}

        {/* Footer */}
        <p className="mt-auto pt-12 text-white/20 text-[10px] text-center">
          Sivar Music Group · 2025
        </p>
      </div>
    </div>
  )
}
