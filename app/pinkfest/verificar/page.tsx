'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import QrCameraScanner from '@/app/components/QrCameraScanner'

interface ManualTicket { ticket_number: number; qr_token: string; check_in_at: string | null }

export default function VerificarPage() {
  const router = useRouter()

  const [manualCode, setManualCode] = useState('')
  const [manualLoading, setManualLoading] = useState(false)
  const [manualError, setManualError] = useState('')
  const [manualOrder, setManualOrder] = useState<{ order_code: string; nombre: string; tickets: ManualTicket[] } | null>(null)

  function handleDecode(decoded: string) {
    try {
      const url = new URL(decoded)
      const token = url.pathname.split('/').filter(Boolean).pop()
      router.push(`/pinkfest/verificar/${token}`)
    } catch {
      router.push(`/pinkfest/verificar/${decoded}`)
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = manualCode.trim()
    if (!code) return
    setManualLoading(true); setManualError(''); setManualOrder(null)
    try {
      const res = await fetch(`/api/pinkfest/verify-code/${encodeURIComponent(code)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo verificar el código')
      if (data.tickets.length === 1) {
        router.push(`/pinkfest/verificar/${data.tickets[0].qr_token}`)
        return
      }
      setManualOrder(data)
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'No se pudo verificar el código')
    } finally {
      setManualLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0008] flex flex-col items-center px-4 pt-10 pb-10">
      <div className="text-center mb-8">
        <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase mb-2">
          Pink Fest
        </p>
        <h1 className="text-white text-2xl font-bold">Verificar entrada</h1>
      </div>

      <QrCameraScanner onDecode={handleDecode} />

      {/* Verificación manual — siempre disponible como respaldo si el QR falla o tarda */}
      <div className="w-full max-w-sm mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px bg-white/10 flex-1" />
          <span className="text-white/25 text-[10px] font-bold uppercase tracking-wider">o ingresá el código</span>
          <div className="h-px bg-white/10 flex-1" />
        </div>

        <form onSubmit={handleManualSubmit} className="space-y-2">
          <input
            type="text"
            value={manualCode}
            onChange={e => { setManualCode(e.target.value); setManualError(''); setManualOrder(null) }}
            placeholder="Código de orden (ej: PF-0024)"
            autoCapitalize="characters"
            className="w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3.5 text-sm text-center tracking-wider focus:outline-none focus:border-[#F472B6]/50 transition"
          />
          <button
            type="submit"
            disabled={manualLoading || !manualCode.trim()}
            className="w-full bg-white/8 hover:bg-[#F472B6]/20 hover:text-[#F472B6] disabled:opacity-40 text-white/70 font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-3.5 transition-all"
          >
            {manualLoading ? 'Buscando...' : 'Verificar código'}
          </button>
        </form>

        {manualError && (
          <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3 text-center mt-3">
            {manualError}
          </p>
        )}

        {manualOrder && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/4 p-4">
            <p className="text-white font-semibold text-sm">{manualOrder.nombre}</p>
            <p className="text-white/40 text-xs mb-3">{manualOrder.order_code} · elegí qué entrada verificar</p>
            <div className="space-y-2">
              {manualOrder.tickets.map(ticket => (
                <button
                  key={ticket.qr_token}
                  onClick={() => router.push(`/pinkfest/verificar/${ticket.qr_token}`)}
                  className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 text-sm transition"
                >
                  <span className="text-white/80">Entrada {ticket.ticket_number}</span>
                  {ticket.check_in_at
                    ? <span className="text-red-400 text-xs font-semibold">Ya ingresó</span>
                    : <span className="text-green-400 text-xs font-semibold">Pendiente →</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => router.push('/pinkfest/admin')}
        className="mt-10 text-white/30 hover:text-white text-sm transition"
      >
        ← Volver al admin
      </button>
    </div>
  )
}
