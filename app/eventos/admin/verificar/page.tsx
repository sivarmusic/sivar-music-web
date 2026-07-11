'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import QrCameraScanner from '@/app/components/QrCameraScanner'
import { resolveTicketVerifyUrl } from '@/app/components/resolveTicketVerifyUrl'
import AdminHeader from '../components/AdminHeader'

export default function VerificarPage() {
  const router = useRouter()
  const [manualToken, setManualToken] = useState('')

  function handleDecode(decoded: string) {
    router.push(resolveTicketVerifyUrl(decoded, '/eventos/admin/verificar'))
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = manualToken.trim()
    if (!token) return
    router.push(resolveTicketVerifyUrl(token, '/eventos/admin/verificar'))
  }

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      <AdminHeader />
      <div className="flex flex-col items-center px-4 pt-8 pb-10">
        <div className="text-center mb-8">
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase mb-2">Sivar Music Eventos</p>
          <h1 className="text-white text-2xl font-bold">Verificar entrada</h1>
        </div>

        <QrCameraScanner onDecode={handleDecode} />

        {/* Verificación manual — siempre disponible como respaldo si el QR falla o tarda */}
        <div className="w-full max-w-sm mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-white/25 text-[10px] font-bold uppercase tracking-wider">o pegá el código de la entrada</span>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-2">
            <input
              type="text"
              value={manualToken}
              onChange={e => setManualToken(e.target.value)}
              placeholder="Código de la entrada (qr_token)"
              className="w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3.5 text-sm text-center tracking-wider focus:outline-none focus:border-[#F472B6]/50 transition"
            />
            <button
              type="submit"
              disabled={!manualToken.trim()}
              className="w-full bg-white/8 hover:bg-[#F472B6]/20 hover:text-[#F472B6] disabled:opacity-40 text-white/70 font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-3.5 transition-all"
            >
              Verificar código
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
