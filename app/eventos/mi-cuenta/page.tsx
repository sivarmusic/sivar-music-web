'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { supabaseBrowser } from '@/lib/supabase-browser'

const QRCode = dynamic(() => import('qrcode').then(mod => ({
  default: ({ value, size }: { value: string; size: number }) => {
    const [url, setUrl] = useState('')
    useEffect(() => {
      mod.toDataURL(value, { width: size, margin: 1 }).then(setUrl)
    }, [value, size])
    return url ? <img src={url} alt="QR" className="rounded-lg" width={size} height={size} /> : null
  }
})), { ssr: false })

interface Ticket {
  id: string; qr_token: string; ticket_number: number; checked_in_at: string | null
}
interface Order {
  id: string; order_code: string; cantidad: number; status: string; created_at: string
  events: { nombre: string; fecha: string; venue: string; slug: string } | null
  event_tickets: Ticket[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pendiente_comprobante: { label: 'Pendiente comprobante', color: 'text-white/40' },
  en_revision: { label: 'En revisión', color: 'text-yellow-400' },
  confirmado: { label: 'Confirmado', color: 'text-green-400' },
  rechazado: { label: 'Rechazado', color: 'text-red-400' },
}

export default function MiCuentaPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(async ({ data }) => {
      const session = data.session
      if (!session) { router.push('/eventos/mi-cuenta/login'); return }
      setEmail(session.user.email ?? '')
      const res = await fetch('/api/eventos/user/tickets', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      const d = await res.json()
      setOrders(d.orders ?? [])
      setLoading(false)
    })
  }, [router])

  async function handleLogout() {
    await supabaseBrowser.auth.signOut()
    router.push('/eventos/mi-cuenta/login')
  }

  if (loading) return <div className="min-h-screen bg-[#0a0008] flex items-center justify-center"><p className="text-white/30 text-sm">Cargando...</p></div>

  const upcoming = orders.filter(o => o.events && new Date(o.events.fecha) >= new Date() && o.status === 'confirmado')
  const past = orders.filter(o => o.events && new Date(o.events.fecha) < new Date())
  const pending = orders.filter(o => ['pendiente_comprobante', 'en_revision'].includes(o.status))

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      {/* Header */}
      <div className="border-b border-white/8 px-5 py-5 flex items-center justify-between">
        <div>
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.25em] uppercase">Sivar Music</p>
          <h1 className="text-white text-lg font-bold">Mi cuenta</h1>
          <p className="text-white/35 text-xs">{email}</p>
        </div>
        <button onClick={handleLogout} className="text-white/30 hover:text-white text-xs uppercase tracking-wider transition">
          Salir
        </button>
      </div>

      <div className="px-5 py-6 max-w-lg mx-auto space-y-8">
        {orders.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/30 text-sm">No tenés órdenes aún.</p>
            <Link href="/eventos" className="text-[#F472B6] text-sm mt-4 block">Ver eventos →</Link>
          </div>
        ) : (
          <>
            {pending.length > 0 && <Section title="Pendientes" orders={pending} expanded={expandedOrder} onExpand={setExpandedOrder} />}
            {upcoming.length > 0 && <Section title="Próximos eventos" orders={upcoming} expanded={expandedOrder} onExpand={setExpandedOrder} showQR />}
            {past.length > 0 && <Section title="Eventos pasados" orders={past} expanded={expandedOrder} onExpand={setExpandedOrder} dim />}
          </>
        )}
      </div>
    </div>
  )
}

function Section({ title, orders, expanded, onExpand, showQR, dim }: {
  title: string; orders: Order[]; expanded: string | null; onExpand: (id: string | null) => void; showQR?: boolean; dim?: boolean
}) {
  return (
    <div>
      <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-3">
        {orders.map(order => <OrderCard key={order.id} order={order} isExpanded={expanded === order.id} onExpand={() => onExpand(expanded === order.id ? null : order.id)} showQR={showQR} dim={dim} />)}
      </div>
    </div>
  )
}

function OrderCard({ order, isExpanded, onExpand, showQR, dim }: {
  order: Order; isExpanded: boolean; onExpand: () => void; showQR?: boolean; dim?: boolean
}) {
  const statusInfo = STATUS_LABELS[order.status] ?? { label: order.status, color: 'text-white/40' }
  const fecha = order.events ? new Date(order.events.fecha) : null

  return (
    <div className={`rounded-2xl border ${dim ? 'border-white/6 bg-white/2 opacity-70' : 'border-white/10 bg-white/4'}`}>
      <button onClick={onExpand} className="w-full px-4 py-4 text-left flex items-start justify-between gap-3">
        <div>
          <p className="text-white font-semibold text-sm">{order.events?.nombre ?? 'Evento'}</p>
          {fecha && (
            <p className="text-white/40 text-xs mt-0.5">
              {fecha.toLocaleDateString('es-SV', { weekday: 'short', day: 'numeric', month: 'short' })}
              {' · '}{order.events?.venue}
            </p>
          )}
          <p className={`text-xs mt-1 font-semibold ${statusInfo.color}`}>{statusInfo.label}</p>
        </div>
        <div className="text-right flex-none">
          <p className="text-[#F472B6] font-bold text-sm">{order.order_code}</p>
          <p className="text-white/30 text-xs mt-1">{order.cantidad} entrada{order.cantidad > 1 ? 's' : ''}</p>
          <p className="text-white/20 text-xs mt-1">{isExpanded ? '▲' : '▼'}</p>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-white/8 px-4 py-4 space-y-4">
          {order.event_tickets.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-2">
              {order.status === 'confirmado' ? 'Las entradas llegarán pronto.' : 'Pendiente de confirmación.'}
            </p>
          ) : showQR ? (
            <div className="space-y-4">
              {order.event_tickets.map(ticket => (
                <div key={ticket.id} className="flex flex-col items-center gap-3 bg-white/4 rounded-2xl p-4">
                  <p className="text-white/55 text-xs font-semibold uppercase tracking-wider">
                    Entrada {ticket.ticket_number} de {order.cantidad}
                  </p>
                  <div className="bg-white p-3 rounded-xl">
                    <QRCode value={ticket.qr_token} size={160} />
                  </div>
                  {ticket.checked_in_at ? (
                    <p className="text-green-400 text-xs font-semibold">Ingresó a las {new Date(ticket.checked_in_at).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}</p>
                  ) : (
                    <p className="text-white/30 text-xs">No ha ingresado</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {order.event_tickets.map(ticket => (
                <div key={ticket.id} className="flex items-center justify-between bg-white/3 rounded-xl px-3 py-2">
                  <span className="text-white/55 text-xs">Entrada {ticket.ticket_number}</span>
                  {ticket.checked_in_at
                    ? <span className="text-green-400 text-xs">Ingresó {new Date(ticket.checked_in_at).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}</span>
                    : <span className="text-white/25 text-xs">No ingresó</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
