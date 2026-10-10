'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '../../../../components/icons'
import { useRequireAdmin } from '../../../components/useRequireAdmin'
import { EVENT_TZ } from '@/lib/eventDate'

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

  if (loading) return <div className="ev-state-screen"><p className="ev-muted" role="status">Cargando…</p></div>
  if (!event) return <div className="ev-state-screen"><p className="ev-muted" role="status">Evento no encontrado.</p></div>

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
      a.checkInAt ? new Date(a.checkInAt).toLocaleString('es-SV', { timeZone: EVENT_TZ }) : 'No ha ingresado',
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

  const categorias = Object.entries(cortesiaPorCategoria)
  const eventDate = new Date(event.fecha).toLocaleDateString('es-SV', { timeZone: EVENT_TZ, day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <>
      <div className="ev-page-head">
        <div className="ev-stack ev-stack--sm" style={{ minWidth: 0 }}>
          <Link className="ev-back-link" href="/eventos/admin"><Icon name="arrow-left" size="sm" />Eventos</Link>
          <h1 className="ev-display ev-display--md">Reporte</h1>
          <p className="ev-muted">{event.nombre} · {event.venue} · {eventDate}</p>
        </div>
        <button type="button" className="ev-btn ev-btn--secondary ev-btn--sm" onClick={exportCsv}>
          <Icon name="download" />Exportar CSV
        </button>
      </div>

      <h2 className="ev-visually-hidden">Resumen</h2>
      <div className="ev-stats" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 'var(--ev-space-8)' }}>
        <div className="ev-stat ev-stat--accent">
          <span className="ev-stat__value">{vendidas}</span>
          <span className="ev-stat__label">Entradas vendidas (sin cortesías) · para liquidación con el venue</span>
        </div>
        <div className="ev-stat ev-stat--confirmed">
          <span className="ev-stat__value">{ingresados}</span>
          <span className="ev-stat__label">Total ingresaron</span>
        </div>
        <div className="ev-stat">
          <span className="ev-stat__value">{cortesias}</span>
          <span className="ev-stat__label"><Icon name="gift" size="sm" />Entradas de cortesía</span>
        </div>
        <div className="ev-stat">
          <span className="ev-stat__value">{attendees.length}</span>
          <span className="ev-stat__label">Entradas confirmadas</span>
        </div>
      </div>

      <div className="ev-split-2">
        {cortesias > 0 && (
          <section className="ev-admin-card ev-admin-form ev-split-2__aside" aria-labelledby="h-cat">
            <h2 className="ev-title ev-title--sm" id="h-cat" style={{ marginBottom: 'var(--ev-space-5)' }}>Cortesías por categoría</h2>
            <div className="ev-bar-list">
              {categorias.map(([cat, count]) => (
                <div key={cat} className="ev-bar-list__row">
                  <span>{CATEGORIA_LABELS[cat] ?? cat}</span>
                  <span className="ev-tabular"><strong>{count}</strong></span>
                  <div className="ev-bar-list__track">
                    <div className="ev-bar-list__fill" style={{ width: `${cortesias ? Math.round((count / cortesias) * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="ev-split-2__main" aria-labelledby="h-asist" style={cortesias > 0 ? undefined : { gridColumn: '1 / -1' }}>
          <h2 className="ev-title ev-title--sm" id="h-asist" style={{ marginBottom: 'var(--ev-space-4)' }}>Asistentes ({attendees.length})</h2>
          {attendees.length === 0 ? (
            <div className="ev-empty">
              <span className="ev-dropzone__icon" aria-hidden="true"><Icon name="ticket" size="lg" /></span>
              <p className="ev-empty__text">No hay entradas confirmadas para este evento.</p>
            </div>
          ) : (
            <div className="ev-table-wrap">
              <table className="ev-table">
                <thead>
                  <tr><th>Asistente</th><th>Tipo</th><th className="num">Entrada</th><th>Ingreso</th></tr>
                </thead>
                <tbody>
                  {attendees.map((a, i) => (
                    <tr key={`${a.orderCode}-${a.ticketNumber}-${i}`}>
                      <td><strong>{a.nombre}</strong><br /><span className="ev-subtle">{a.orderCode}</span></td>
                      <td>{a.tipo}</td>
                      <td className="num">{a.ticketNumber}</td>
                      <td>
                        {a.checkInAt
                          ? <span className="ev-chip ev-chip--confirmed"><Icon name="check-circle" />{new Date(a.checkInAt).toLocaleTimeString('es-SV', { timeZone: EVENT_TZ, hour: '2-digit', minute: '2-digit' })}</span>
                          : <span className="ev-subtle">No ha ingresado</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
