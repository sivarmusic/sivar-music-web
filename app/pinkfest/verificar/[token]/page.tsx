'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface TicketInfo {
  order_code: string
  nombre: string
  cantidad: number
  ticket_number: number
  check_in_at: string | null
}

type PageState = 'loading' | 'valid' | 'already_used' | 'invalid' | 'not_confirmed' | 'error'

export default function VerificarTokenPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [ticket, setTicket] = useState<TicketInfo | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [checkingIn, setCheckingIn] = useState(false)
  const [justCheckedIn, setJustCheckedIn] = useState(false)

  useEffect(() => {
    fetch(`/api/pinkfest/verify/${token}`)
      .then(async r => {
        const data = await r.json()
        if (r.ok) {
          setTicket(data.ticket)
          setPageState(data.ticket.check_in_at ? 'already_used' : 'valid')
        } else if (r.status === 400) {
          setPageState('not_confirmed')
        } else if (r.status === 404) {
          setPageState('invalid')
        } else {
          setPageState('error')
        }
      })
      .catch(() => setPageState('error'))
  }, [token])

  async function handleCheckIn() {
    setCheckingIn(true)
    try {
      const res = await fetch(`/api/pinkfest/verify/${token}`, { method: 'PATCH' })
      if (res.ok) {
        if (navigator.vibrate) navigator.vibrate([60, 40, 60])
        setJustCheckedIn(true)
        setPageState('already_used')
      } else if (res.status === 401) {
        router.push(`/pinkfest/admin/login?redirect=/pinkfest/verificar/${token}`)
      } else {
        const data = await res.json()
        if (data.alreadyUsed) setPageState('already_used')
      }
    } finally {
      setCheckingIn(false)
    }
  }

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0008] flex items-center justify-center">
        <p className="text-white/40 text-sm">Verificando...</p>
      </div>
    )
  }

  if (pageState === 'invalid') {
    return <ResultScreen color="red" icon="✕" title="QR inválido" subtitle="Esta entrada no existe en el sistema." onScan={() => router.push('/pinkfest/verificar')} />
  }

  if (pageState === 'not_confirmed') {
    return <ResultScreen color="yellow" icon="⚠" title="No confirmada" subtitle="Esta entrada aún no fue confirmada por el admin." onScan={() => router.push('/pinkfest/verificar')} />
  }

  if (pageState === 'error') {
    return <ResultScreen color="red" icon="!" title="Error" subtitle="No se pudo verificar la entrada." onScan={() => router.push('/pinkfest/verificar')} />
  }

  return (
    <div className="min-h-screen bg-[#0a0008] flex flex-col items-center px-4 pt-12 pb-10">
      <div className="text-center mb-6">
        <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase mb-2">Pink Fest</p>
        <h1 className="text-white text-xl font-bold">Verificación de entrada</h1>
      </div>

      {/* Estado */}
      {pageState === 'already_used' ? (
        <div className={`w-full max-w-sm rounded-3xl p-6 text-center mb-5 ${
          justCheckedIn
            ? 'bg-green-500/15 border border-green-500/35'
            : 'bg-red-500/12 border border-red-500/25'
        }`}>
          <div className={`text-5xl mb-3 ${justCheckedIn ? 'text-green-400' : 'text-red-400'}`}>
            {justCheckedIn ? '✓' : '✕'}
          </div>
          <p className={`text-xl font-bold mb-1 ${justCheckedIn ? 'text-green-400' : 'text-red-400'}`}>
            {justCheckedIn ? '¡Ingresó!' : 'Ya ingresó'}
          </p>
          <p className="text-white/50 text-sm">
            {justCheckedIn
              ? 'Entrada registrada correctamente'
              : `Ingresó a las ${new Date(ticket?.check_in_at ?? '').toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}`
            }
          </p>
        </div>
      ) : (
        <div className="w-full max-w-sm rounded-3xl bg-green-500/10 border border-green-500/25 p-6 text-center mb-5">
          <div className="text-5xl text-green-400 mb-3">✓</div>
          <p className="text-green-400 text-xl font-bold mb-1">Entrada válida</p>
          <p className="text-white/50 text-sm">Confirmar ingreso al evento</p>
        </div>
      )}

      {/* Info del ticket */}
      {ticket && (
        <div className="w-full max-w-sm rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/8 mb-6">
          {[
            { label: 'Código', value: ticket.order_code, pink: true },
            { label: 'Nombre', value: ticket.nombre, bold: true },
            { label: 'Entrada', value: `${ticket.ticket_number} de ${ticket.cantidad}` },
          ].map(({ label, value, pink, bold }) => (
            <div key={label} className="flex justify-between items-center px-4 py-3">
              <span className="text-white/45 text-sm">{label}</span>
              <span className={`text-sm font-semibold ${pink ? 'text-[#F472B6]' : bold ? 'text-white' : 'text-white/80'}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Botón check-in */}
      {pageState === 'valid' && (
        <div className="w-full max-w-sm">
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="w-full bg-green-500 hover:bg-green-400 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-base uppercase tracking-wider rounded-2xl py-4 transition-all"
          >
            {checkingIn ? 'Registrando...' : '✓ Confirmar ingreso'}
          </button>
        </div>
      )}

      <button
        onClick={() => router.push('/pinkfest/verificar')}
        className="mt-6 text-white/35 hover:text-white text-sm transition"
      >
        ← Verificar otra entrada
      </button>
    </div>
  )
}

function ResultScreen({
  color, icon, title, subtitle, onScan,
}: {
  color: 'red' | 'yellow'
  icon: string
  title: string
  subtitle: string
  onScan: () => void
}) {
  const colors = {
    red: { bg: 'bg-red-500/12 border-red-500/25', text: 'text-red-400' },
    yellow: { bg: 'bg-yellow-500/12 border-yellow-500/25', text: 'text-yellow-400' },
  }
  const c = colors[color]
  return (
    <div className="min-h-screen bg-[#0a0008] flex flex-col items-center justify-center px-4 gap-6">
      <div className={`w-full max-w-sm rounded-3xl border p-8 text-center ${c.bg}`}>
        <div className={`text-5xl mb-3 ${c.text}`}>{icon}</div>
        <p className={`text-xl font-bold mb-1 ${c.text}`}>{title}</p>
        <p className="text-white/50 text-sm">{subtitle}</p>
      </div>
      <button
        onClick={onScan}
        className="border border-white/15 text-white/60 hover:text-white rounded-2xl px-6 py-3 text-sm transition"
      >
        ← Verificar otra entrada
      </button>
    </div>
  )
}
