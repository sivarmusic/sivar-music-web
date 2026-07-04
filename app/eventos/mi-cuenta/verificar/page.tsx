'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function VerificarContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  return (
    <div className="min-h-screen bg-[#0a0008] text-white flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm text-center space-y-6">

        <div>
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase mb-3">Sivar Events</p>
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-white text-2xl font-bold mb-3">Revisá tu correo</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            Te enviamos un enlace de confirmación a{' '}
            {email && <strong className="text-white">{email}</strong>}.
            Hacé clic en el enlace para activar tu cuenta.
          </p>
        </div>

        <div className="bg-white/4 border border-white/10 rounded-2xl p-5 text-left space-y-3">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">¿No te llegó?</p>
          <p className="text-white/50 text-sm leading-relaxed">
            Revisá la carpeta de spam o correo no deseado. Puede tardar unos minutos en llegar.
          </p>
        </div>

        <Link
          href="/eventos/mi-cuenta/login"
          className="block w-full bg-[#F472B6] hover:bg-[#ec4899] text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all text-center"
        >
          Ya confirmé — Iniciar sesión
        </Link>

        <Link href="/eventos" className="block text-white/25 hover:text-white text-xs transition">
          ← Volver a eventos
        </Link>
      </div>
    </div>
  )
}

export default function VerificarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0008] flex items-center justify-center">
        <p className="text-white/30 text-sm">Cargando...</p>
      </div>
    }>
      <VerificarContent />
    </Suspense>
  )
}
