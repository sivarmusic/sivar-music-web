'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import AdminHeader from '../components/AdminHeader'

const QRCode = dynamic(() => import('qrcode').then(mod => ({
  default: ({ value, size }: { value: string; size: number }) => {
    const [url, setUrl] = useState('')
    useEffect(() => { mod.toDataURL(value, { width: size, margin: 1 }).then(setUrl) }, [value, size])
    return url ? <img src={url} alt="QR" className="rounded-lg" width={size} height={size} /> : null
  }
})), { ssr: false })

interface EventOption { id: string; nombre: string }
interface Ticket { id: string; ticket_number: number; qr_token: string; check_in_at: string | null }
interface CortesiaOrder {
  id: string; order_code: string; nombre: string; cantidad: number; cortesia_categoria: string
  order_type: string; created_at: string
  events: { id: string; nombre: string } | null
  event_tickets: Ticket[]
}

const CATEGORIAS = [
  { value: 'staff', label: 'Staff' },
  { value: 'organizacion', label: 'Organización' },
  { value: 'vip', label: 'VIP' },
  { value: 'musicos', label: 'Músicos (banda)' },
]

const INPUT = 'w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 transition'
const LABEL = 'block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-2'

export default function CortesiasPage() {
  const router = useRouter()
  const [events, setEvents] = useState<EventOption[]>([])
  const [orders, setOrders] = useState<CortesiaOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filterEvent, setFilterEvent] = useState('all')

  const [eventId, setEventId] = useState('')
  const [categoria, setCategoria] = useState('staff')
  const [nombre, setNombre] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [lastIssued, setLastIssued] = useState<CortesiaOrder | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const [evRes, ordRes] = await Promise.all([
      fetch('/api/eventos/events?admin=1'),
      fetch('/api/eventos/orders'),
    ])
    if (evRes.status === 401 || ordRes.status === 401) { router.push('/eventos/admin/login'); return }
    const [evData, ordData] = await Promise.all([evRes.json(), ordRes.json()])
    setEvents(evData.events ?? [])
    setOrders((ordData.orders ?? []).filter((o: CortesiaOrder) => o.order_type === 'cortesia'))
    setLoading(false)
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { if (!eventId && events.length > 0) setEventId(events[0].id) }, [events, eventId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSubmitting(true); setLastIssued(null)
    try {
      const res = await fetch('/api/eventos/orders/cortesia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId, categoria, nombre: nombre.trim(),
          cantidad: Number(cantidad) || 1,
          telefono: telefono.trim() || undefined, email: email.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo generar la cortesía')
      setNombre(''); setTelefono(''); setEmail(''); setCantidad('1')
      await fetchData()
      const event = events.find(e => e.id === eventId)
      setLastIssued({ ...data.order, events: event ?? null, event_tickets: data.tickets })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar la cortesía')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteOrder(orderId: string) {
    if (!window.confirm('¿Eliminar esta cortesía? Esta acción no se puede deshacer.')) return
    setDeletingId(orderId)
    await fetch(`/api/eventos/orders/${orderId}`, { method: 'DELETE' })
    await fetchData()
    setDeletingId(null)
  }

  const filteredOrders = filterEvent === 'all' ? orders : orders.filter(o => o.events?.id === filterEvent)

  if (loading) return <div className="min-h-screen bg-[#0a0008] flex items-center justify-center"><p className="text-white/30 text-sm">Cargando...</p></div>

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      <AdminHeader />

      <div className="px-5 py-6 max-w-lg mx-auto space-y-8">
        <div>
          <h1 className="text-white text-lg font-bold">Entradas de cortesía</h1>
          <p className="text-white/35 text-xs mt-1">Generá entradas sin cobro para staff, organización, VIP o músicos. No se cuentan como vendidas en el reporte.</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={LABEL}>Evento</label>
            {events.length === 0 ? (
              <p className="text-white/30 text-xs">No hay eventos creados todavía.</p>
            ) : (
              <select value={eventId} onChange={e => setEventId(e.target.value)} className={INPUT}>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
              </select>
            )}
          </div>

          <div>
            <label className={LABEL}>Categoría</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIAS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategoria(c.value)}
                  className={`text-xs font-semibold rounded-2xl py-3 transition ${categoria === c.value ? 'bg-[#F472B6] text-white' : 'bg-white/6 text-white/50 hover:text-white'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL}>Nombre (persona o grupo)</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Ej: Juan Pérez o Banda Los Sivar" className={INPUT} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Cantidad</label>
              <input type="number" min={1} max={20} value={cantidad} onChange={e => setCantidad(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Teléfono (opcional)</label>
              <input value={telefono} onChange={e => setTelefono(e.target.value)} className={INPUT} />
            </div>
          </div>

          <div>
            <label className={LABEL}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Para enviarle el mail de la entrada" className={INPUT} />
          </div>

          {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3">{error}</p>}

          <button
            type="submit"
            disabled={submitting || events.length === 0 || !nombre.trim() || !email.trim()}
            className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-40 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-3.5 transition"
          >
            {submitting ? 'Generando...' : 'Generar cortesía'}
          </button>
        </form>

        {/* QR recién generados */}
        {lastIssued && (
          <div className="rounded-2xl border border-green-400/25 bg-green-400/5 p-4 space-y-3">
            <p className="text-green-400 text-sm font-semibold">
              {lastIssued.order_code} · {lastIssued.nombre} — {lastIssued.event_tickets.length} entrada{lastIssued.event_tickets.length > 1 ? 's' : ''} generada{lastIssued.event_tickets.length > 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-4">
              {lastIssued.event_tickets.map(t => (
                <div key={t.id} className="flex flex-col items-center gap-1.5">
                  <div className="bg-white p-2 rounded-xl">
                    <QRCode value={t.qr_token} size={120} />
                  </div>
                  <p className="text-white/40 text-[10px]">Entrada {t.ticket_number}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Listado de cortesías emitidas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Cortesías emitidas</p>
            {events.length > 1 && (
              <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)}
                className="bg-white/6 border border-white/10 text-white/60 text-xs rounded-xl px-2 py-1 focus:outline-none">
                <option value="all">Todos los eventos</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
              </select>
            )}
          </div>

          {filteredOrders.length === 0 ? (
            <p className="text-white/25 text-sm text-center py-8">No hay cortesías generadas todavía.</p>
          ) : (
            <div className="space-y-2">
              {filteredOrders.map(order => {
                const cat = CATEGORIAS.find(c => c.value === order.cortesia_categoria)
                const checkedIn = order.event_tickets.filter(t => t.check_in_at).length
                return (
                  <div key={order.id} className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold text-sm truncate">{order.nombre}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-300">{cat?.label ?? order.cortesia_categoria}</span>
                      </div>
                      <p className="text-white/35 text-xs mt-0.5">
                        {order.events?.nombre ?? ''} · {order.order_code} · {order.cantidad} entrada{order.cantidad > 1 ? 's' : ''} · {checkedIn} ingresó{checkedIn === 1 ? '' : 'aron'}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteOrder(order.id)}
                      disabled={deletingId === order.id}
                      className="text-xs px-2 py-1.5 rounded-xl font-semibold bg-red-500/10 text-red-400/50 hover:bg-red-500/20 hover:text-red-400 transition disabled:opacity-40 flex-none"
                    >
                      {deletingId === order.id ? '...' : 'Eliminar'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
