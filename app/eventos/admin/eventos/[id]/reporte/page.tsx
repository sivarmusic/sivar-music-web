'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminHeader from '../../../components/AdminHeader'
import { useRequireAdmin } from '../../../components/useRequireAdmin'

interface Ticket { id: string; ticket_number: number; check_in_at: string | null }
interface Order {
  id: string; order_code: string; nombre: string; status: string
  order_type: string; cortesia_categoria: string | null
  event_tickets: Ticket[]
}
interface EventInfo { id: string; nombre: string; fecha: string; venue: string }

const CATEGORIA_LABELS: Record<string, string> = {
  staff: 'Staff', organizacion: 'Organización', vip: 'VIP', musicos: 'Músicos (banda)',
}

interface Attendee {
  orderCode: string; nombre: string; tipo: string; ticketNumber: number
  checkInAt: string | null
}

export default function ReporteEventoPage() {
  useRequireAdmin()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [event, setEvent] = useState<EventInfo | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const [evRes, ordRes] = await Promise.all([
      fetch(`/api/eventos/events/${id}`),
      fetch(`/api/eventos/orders?event_id=${id}`),
    ])
    if (evRes.status === 401 || ordRes.status === 401) { router.push('/eventos/admin/login'); return }
    const [evData, ordData] = await Promise.all([evRes.json(), ordRes.json()])
    setEvent(evData.event ?? null)
    setOrders((ordData.orders ?? []).filter((o: Order) => o.status === 'confirmado'))
    setLoading(false)
  }, [id, router])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <div className="min-h-screen bg-[#0a0008] flex items-center justify-center"><p className="text-white/30 text-sm">Cargando...</p></div>
  if (!event) return <div className="min-h-screen bg-[#0a0008] flex items-center justify-center"><p className="text-white/30 text-sm">Evento no encontrado.</p></div>

  const compraOrders = orders.filter(o => o.order_type !== 'cortesia')
  const cortesiaOrders = orders.filter(o => o.order_type === 'cortesia')

  const vendidas = compraOrders.reduce((sum, o) => sum + o.event_tickets.length, 0)
  const cortesias = cortesiaOrders.reduce((sum, o) => sum + o.event_tickets.length, 0)

  const cortesiaPorCategoria = cortesiaOrders.reduce<Record<string, number>>((acc, o) => {
    const key = o.cortesia_categoria ?? 'otro'
    acc[key] = (acc[key] ?? 0) + o.event_tickets.length
    return acc
  }, {})

  const attendees: Attendee[] = orders.flatMap(o => o.event_tickets.map(t => ({
    orderCode: o.order_code,
    nombre: o.nombre,
    tipo: o.order_type === 'cortesia' ? `Cortesía — ${CATEGORIA_LABELS[o.cortesia_categoria ?? ''] ?? o.cortesia_categoria}` : 'Comprada',
    ticketNumber: t.ticket_number,
    checkInAt: t.check_in_at,
  }))).sort((a, b) => {
    if (a.checkInAt && b.checkInAt) return a.checkInAt < b.checkInAt ? -1 : 1
    if (a.checkInAt) return -1
    if (b.checkInAt) return 1
    return a.nombre.localeCompare(b.nombre)
  })

  const ingresados = attendees.filter(a => a.checkInAt).length

  function exportCsv() {
    const header = ['Código', 'Nombre', 'Tipo', 'Entrada', 'Hora de ingreso']
    const rows = attendees.map(a => [
      a.orderCode, a.nombre, a.tipo, String(a.ticketNumber),
      a.checkInAt ? new Date(a.checkInAt).toLocaleString('es-SV') : 'No ha ingresado',
    ])
    const csv = [header, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-${event!.nombre.toLowerCase().replace(/\s+/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      <AdminHeader />

      <div className="px-5 py-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href="/eventos/admin" className="text-white/35 hover:text-white text-xs transition">← Eventos</Link>
            <h1 className="text-white text-lg font-bold truncate mt-1">Reporte — {event.nombre}</h1>
            <p className="text-white/35 text-xs mt-0.5">{event.venue} · {new Date(event.fecha).toLocaleDateString('es-SV', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
          <button onClick={exportCsv}
            className="flex-none bg-white/8 hover:bg-[#F472B6]/20 hover:text-[#F472B6] text-white/60 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition">
            Exportar CSV
          </button>
        </div>

        {/* Resumen para el venue */}
        <div className="rounded-2xl border border-[#F472B6]/25 bg-[#F472B6]/5 p-4">
          <p className="text-[#F472B6] text-[10px] font-bold uppercase tracking-wider mb-1">Para liquidación con el venue</p>
          <p className="text-white text-3xl font-bold">{vendidas}</p>
          <p className="text-white/40 text-xs">entradas vendidas (no incluye cortesías)</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/5 border border-white/8 p-3 text-center">
            <p className="text-white text-2xl font-bold">{ingresados}</p>
            <p className="text-white/35 text-[10px] mt-1">Total ingresaron</p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/8 p-3 text-center">
            <p className="text-purple-300 text-2xl font-bold">{cortesias}</p>
            <p className="text-white/35 text-[10px] mt-1">Entradas de cortesía</p>
          </div>
        </div>

        {/* Desglose cortesías */}
        {cortesias > 0 && (
          <div>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2">Cortesías por categoría</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(cortesiaPorCategoria).map(([cat, count]) => (
                <div key={cat} className="rounded-xl bg-white/4 border border-white/8 px-3 py-2 flex items-center justify-between">
                  <span className="text-white/60 text-xs">{CATEGORIA_LABELS[cat] ?? cat}</span>
                  <span className="text-white font-bold text-sm">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabla de asistentes */}
        <div>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2">Asistentes ({attendees.length})</p>
          {attendees.length === 0 ? (
            <p className="text-white/25 text-sm text-center py-8">No hay entradas confirmadas para este evento.</p>
          ) : (
            <div className="space-y-1.5">
              {attendees.map((a, i) => (
                <div key={`${a.orderCode}-${a.ticketNumber}-${i}`} className="rounded-xl bg-white/4 border border-white/8 px-4 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{a.nombre}</p>
                    <p className="text-white/35 text-xs">{a.orderCode} · {a.tipo} · Entrada {a.ticketNumber}</p>
                  </div>
                  <span className={`text-xs font-semibold flex-none ${a.checkInAt ? 'text-green-400' : 'text-white/25'}`}>
                    {a.checkInAt
                      ? new Date(a.checkInAt).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })
                      : 'No ha ingresado'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
