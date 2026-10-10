'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Icon } from '../../components/icons'
import { useRequireAdmin } from '../components/useRequireAdmin'

const QRCode = dynamic(() => import('qrcode').then(mod => ({
  default: ({ value, size }: { value: string; size: number }) => {
    const [url, setUrl] = useState('')
    useEffect(() => { mod.toDataURL(value, { width: size, margin: 1 }).then(setUrl) }, [value, size])
    return url ? <img src={url} alt="QR" width={size} height={size} /> : null
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

export default function CortesiasPage() {
  useRequireAdmin()
  const router = useRouter()
  const [events, setEvents] = useState<EventOption[]>([])
  const [orders, setOrders] = useState<CortesiaOrder[]>([])
  const [loading, setLoading] = useState(true)

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

    const cortesias = (ordData.orders ?? [])
      .filter((o: CortesiaOrder) => o.order_type === 'cortesia')

    setOrders(cortesias)
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
      setLastIssued({
        ...data.order, events: event ?? null, event_tickets: data.tickets,
      })
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

  const groupedByEvent = orders.reduce<Record<string, { nombre: string; orders: CortesiaOrder[] }>>((acc, order) => {
    const key = order.events?.id ?? 'otro'
    if (!acc[key]) acc[key] = { nombre: order.events?.nombre ?? 'Otro', orders: [] }
    acc[key].orders.push(order)
    return acc
  }, {})
  const eventGroups = Object.entries(groupedByEvent)

  if (loading) return <div className="ev-state-screen"><p className="ev-muted" role="status">Cargando…</p></div>

  const totalEnviadas = orders.length

  return (
    <>
      <div className="ev-page-head">
        <div className="ev-stack ev-stack--sm">
          <h1 className="ev-display ev-display--md">Cortesías</h1>
          <p className="ev-muted">Generá entradas sin cobro para staff, organización, VIP o músicos. No se cuentan como vendidas en el reporte.</p>
        </div>
      </div>

      <div className="ev-split-2">
        <form onSubmit={handleSubmit} className="ev-admin-card ev-admin-form ev-split-2__aside" aria-busy={submitting}>
          <h2 className="ev-title ev-title--sm" style={{ marginBottom: 'var(--ev-space-5)' }}>Nueva cortesía</h2>
          <div className="ev-form-grid">
            <div className="ev-field">
              <label className="ev-field__label" htmlFor="c-ev">Evento</label>
              {events.length === 0 ? (
                <p className="ev-subtle">No hay eventos creados todavía.</p>
              ) : (
                <div className="ev-field__control ev-field__control--select">
                  <select className="ev-select" id="c-ev" value={eventId} onChange={e => setEventId(e.target.value)}>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="ev-field">
              <span className="ev-field__label" id="c-cat">Categoría</span>
              <div className="ev-filters ev-filters--wrap" role="group" aria-labelledby="c-cat">
                {CATEGORIAS.map(c => (
                  <button key={c.value} type="button" className="ev-filter-chip" aria-pressed={categoria === c.value} onClick={() => setCategoria(c.value)}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ev-field">
              <label className="ev-field__label" htmlFor="c-n">Nombre (persona o grupo)</label>
              <input className="ev-input" id="c-n" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Ej: Juan Pérez o Banda Los Sivar" />
            </div>

            <div className="ev-field">
              <label className="ev-field__label" htmlFor="c-q">Cantidad</label>
              <input className="ev-input" id="c-q" type="number" min={1} max={20} value={cantidad} onChange={e => setCantidad(e.target.value)} />
            </div>

            <div className="ev-field">
              <label className="ev-field__label" htmlFor="c-t">Teléfono <span className="ev-opt">(opcional)</span></label>
              <div className="ev-field__control">
                <Icon name="phone" />
                <input className="ev-input" id="c-t" value={telefono} onChange={e => setTelefono(e.target.value)} />
              </div>
            </div>

            <div className="ev-field">
              <label className="ev-field__label" htmlFor="c-e">Correo</label>
              <div className="ev-field__control">
                <Icon name="mail" />
                <input
                  className="ev-input" id="c-e" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="Para enviarle el mail de la entrada"
                />
              </div>
            </div>

            {error && (
              <div className="ev-banner ev-banner--error" role="alert">
                <Icon name="alert-circle" />
                <div><p className="ev-banner__title">{error}</p></div>
              </div>
            )}

            <button
              type="submit" className="ev-btn ev-btn--primary ev-btn--block"
              disabled={submitting || events.length === 0 || !nombre.trim() || !email.trim()}
            >
              <Icon name="gift" size="lg" />{submitting ? 'Generando…' : 'Generar cortesía'}
            </button>
          </div>
        </form>

        <div className="ev-split-2__main ev-stack ev-stack--lg">
          {lastIssued && (
            <div className="ev-banner ev-banner--success" role="status">
              <Icon name="check-circle" />
              <div>
                <p className="ev-banner__title">
                  {lastIssued.order_code} · {lastIssued.nombre} — {lastIssued.event_tickets.length} entrada{lastIssued.event_tickets.length > 1 ? 's' : ''} generada{lastIssued.event_tickets.length > 1 ? 's' : ''}
                </p>
                <div className="ev-qr-grid" style={{ marginTop: 'var(--ev-space-3)' }}>
                  {lastIssued.event_tickets.map(t => (
                    <figure key={t.id}>
                      <QRCode value={t.qr_token} size={120} />
                      <figcaption>Entrada {t.ticket_number}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            </div>
          )}

          <section aria-labelledby="h-env">
            <h2 className="ev-title ev-title--sm" id="h-env" style={{ marginBottom: 'var(--ev-space-4)' }}>Enviadas · {totalEnviadas}</h2>

            {eventGroups.length === 0 ? (
              <div className="ev-empty">
                <span className="ev-dropzone__icon" aria-hidden="true"><Icon name="gift" size="lg" /></span>
                <h3 className="ev-empty__title">Ninguna cortesía todavía</h3>
                <p className="ev-empty__text">Las que generes aparecen acá.</p>
              </div>
            ) : (
              <div className="ev-stack">
                {eventGroups.map(([groupId, group]) => {
                  const totalEntradas = group.orders.reduce((s, o) => s + o.cantidad, 0)
                  return (
                    <div key={groupId}>
                      <h3 className="ev-eyebrow" style={{ marginBottom: 'var(--ev-space-2)' }}>
                        {group.nombre} · {group.orders.length} cortesía{group.orders.length > 1 ? 's' : ''} · {totalEntradas} entrada{totalEntradas > 1 ? 's' : ''}
                      </h3>
                      <div className="ev-table-wrap">
                        <table className="ev-table">
                          <thead><tr><th>Invitado</th><th className="num">Cant.</th><th className="num">Ingresaron</th><th><span className="ev-visually-hidden">Acciones</span></th></tr></thead>
                          <tbody>
                            {group.orders.map(order => {
                              const cat = CATEGORIAS.find(c => c.value === order.cortesia_categoria)
                              const checkedIn = order.event_tickets.filter(t => t.check_in_at).length
                              return (
                                <tr key={order.id}>
                                  <td>
                                    <strong>{order.nombre}</strong>{' '}
                                    <span className="ev-chip ev-chip--courtesy">{cat?.label ?? order.cortesia_categoria}</span>
                                    <br /><span className="ev-subtle">{order.order_code}</span>
                                  </td>
                                  <td className="num">{order.cantidad}</td>
                                  <td className="num">{checkedIn}</td>
                                  <td>
                                    <button
                                      type="button" className="ev-btn ev-btn--ghost ev-btn--sm"
                                      onClick={() => deleteOrder(order.id)} disabled={deletingId === order.id}
                                      aria-label={`Eliminar cortesía de ${order.nombre}`}
                                    >
                                      <Icon name="trash" />{deletingId === order.id ? '…' : 'Eliminar'}
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
