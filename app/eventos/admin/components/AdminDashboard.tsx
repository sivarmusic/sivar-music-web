'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EVENT_TZ } from '@/lib/eventDate'
import { Icon, type IconName } from '../../components/icons'
import RejectOrderModal from './RejectOrderModal'

interface Ticket { id: string; ticket_number: number; qr_token: string; check_in_at: string | null }
interface Order {
  id: string; order_code: string; nombre: string; telefono: string; email: string
  cantidad: number; status: string; created_at: string; comprobante_path: string | null
  order_type: string; event_id?: string
  events: { id?: string; nombre: string; slug: string } | null
  event_tickets: Ticket[]
}
interface Event { id: string; nombre: string; slug: string; fecha: string; precio: number; visible: boolean; imagen_url?: string | null; venue?: string }

const STATUS: Record<string, { cls: string; icon: IconName; label: string }> = {
  pendiente_comprobante: { cls: 'pending', icon: 'hourglass', label: 'Pendiente de comprobante' },
  en_revision: { cls: 'review', icon: 'eye', label: 'En revisión' },
  confirmado: { cls: 'confirmed', icon: 'check-circle', label: 'Confirmada' },
  rechazado: { cls: 'rejected', icon: 'x-circle', label: 'Rechazada' },
}

type StatusFilter = 'en_revision' | 'pendiente_comprobante' | 'confirmado' | 'rechazado' | 'all'
const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'en_revision', label: 'En revisión' },
  { value: 'pendiente_comprobante', label: 'Pendientes' },
  { value: 'confirmado', label: 'Confirmadas' },
  { value: 'rechazado', label: 'Rechazadas' },
  { value: 'all', label: 'Todas' },
]

interface Toast { kind: 'success' | 'error'; text: string }

const eventIdOf = (o: Order) => o.events?.id ?? o.event_id
const money = (n: number) => `$${n.toFixed(2)}`
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function shortDate(iso: string) {
  const s = new Date(iso).toLocaleDateString('es-SV', { timeZone: EVENT_TZ, weekday: 'short', day: 'numeric', month: 'short' })
  return cap(s.replace(/[.,]/g, ''))
}

function StatusChip({ status }: { status: string }) {
  const m = STATUS[status] ?? STATUS.pendiente_comprobante
  return <span className={`ev-chip ev-chip--${m.cls}`}><Icon name={m.icon} />{m.label}</span>
}

/**
 * Comprobante de una orden. En revisión: vista previa de la imagen (se pide la URL firmada
 * al montar). El resto, y los PDF, abren el archivo al tocar (misma URL firmada de siempre).
 */
function Proof({ order, preview }: { order: Order; preview: boolean }) {
  const path = order.comprobante_path as string
  const isPdf = /\.pdf$/i.test(path)
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!preview || isPdf) return
    let cancelled = false
    fetch(`/api/eventos/signed-url?path=${encodeURIComponent(path)}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && d.url) setUrl(d.url) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [path, preview, isPdf])

  async function open() {
    const r = await fetch(`/api/eventos/signed-url?path=${encodeURIComponent(path)}`)
    const d = await r.json()
    if (d.url) window.open(d.url, '_blank', 'noopener,noreferrer')
  }

  if (url) {
    return (
      <a className="ev-order-card__proof" href={url} target="_blank" rel="noopener noreferrer">
        <img src={url} alt={`Comprobante de la orden ${order.order_code}`} />
        <span className="ev-order-card__proof-label"><Icon name="external" size="sm" />Ver comprobante</span>
      </a>
    )
  }
  return (
    <button type="button" className="ev-order-card__proof ev-order-card__proof--tile" onClick={open}>
      <span className="ev-dropzone__icon" aria-hidden="true"><Icon name={isPdf ? 'file' : 'image'} size="lg" /></span>
      <span style={{ fontWeight: 600 }}>Ver comprobante</span>
      <span className="ev-subtle">{isPdf ? 'PDF' : 'Imagen'} · Abrir <Icon name="external" size="sm" /></span>
    </button>
  )
}

export default function AdminDashboard({ view }: { view: 'eventos' | 'ordenes' }) {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<'admin' | 'verificador' | null>(null)
  const isAdmin = role === 'admin'
  const [actionId, setActionId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [resentId, setResentId] = useState<string | null>(null)
  const [sendingReminders, setSendingReminders] = useState(false)
  const [remindersResult, setRemindersResult] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('en_revision')
  const [query, setQuery] = useState('')
  const [rejecting, setRejecting] = useState<Order | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((kind: Toast['kind'], text: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ kind, text })
    if (kind === 'success') toastTimer.current = setTimeout(() => setToast(null), 6000)
  }, [])
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  const fetchData = useCallback(async () => {
    const sessionRes = await fetch('/api/staff/auth/session')
    if (sessionRes.status === 401) { router.push('/eventos/admin/login'); return }
    const session = await sessionRes.json()
    const currentRole = (session.role as 'admin' | 'verificador' | undefined) ?? null
    setRole(currentRole)

    const [evRes, ordRes] = await Promise.all([
      currentRole === 'admin' ? fetch('/api/eventos/events?admin=1') : Promise.resolve(null),
      fetch('/api/eventos/orders'),
    ])
    if (ordRes.status === 401) { router.push('/eventos/admin/login'); return }
    const [evData, ordData] = await Promise.all([evRes ? evRes.json() : { events: [] }, ordRes.json()])
    setEvents(evData.events ?? [])
    setOrders(ordData.orders ?? [])
    setLoading(false)
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  async function setStatus(order: Order, status: 'confirmado' | 'rechazado') {
    setActionId(order.id)
    const res = await fetch(`/api/eventos/orders/${order.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json().catch(() => ({}))
    await fetchData()
    setActionId(null)
    setRejecting(null)
    if (!res.ok) showToast('error', data.error || 'No se pudo actualizar la orden')
    else if (data.emailSent === false) showToast('error', 'Orden confirmada, pero el correo no pudo enviarse')
    else if (status === 'confirmado') showToast('success', `${order.order_code} confirmada. Se enviaron las entradas a ${order.email}.`)
    else showToast('success', `${order.order_code} rechazada.`)
  }

  async function deleteOrder(orderId: string) {
    if (!window.confirm('¿Eliminar esta orden? Esta acción no se puede deshacer.')) return
    setDeletingId(orderId)
    const res = await fetch(`/api/eventos/orders/${orderId}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({} as { error?: string }))
    await fetchData()
    setDeletingId(null)
    if (!res.ok) showToast('error', data.error || 'No se pudo eliminar la orden')
  }

  async function resendEmail(orderId: string) {
    setResendingId(orderId)
    setResentId(null)
    const res = await fetch(`/api/eventos/orders/${orderId}/resend`, { method: 'POST' })
    setResendingId(null)
    if (res.ok) {
      setResentId(orderId)
      setTimeout(() => setResentId(null), 4000)
    } else {
      showToast('error', 'No se pudo enviar el correo. Intentá de nuevo más tarde.')
    }
  }

  async function toggleVisible(eventId: string, current: boolean) {
    const res = await fetch(`/api/eventos/events/${eventId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: !current }),
    })
    const data = await res.json().catch(() => ({} as { error?: string }))
    await fetchData()
    if (!res.ok) showToast('error', data.error || 'No se pudo cambiar la visibilidad del evento')
  }

  async function deleteEvent(eventId: string, nombre: string) {
    if (!window.confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return
    setDeletingEventId(eventId)
    const res = await fetch(`/api/eventos/events/${eventId}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({} as { error?: string }))
    await fetchData()
    setDeletingEventId(null)
    if (!res.ok) showToast('error', data.error || 'No se pudo eliminar el evento')
  }

  async function sendReminders() {
    setSendingReminders(true)
    setRemindersResult(null)
    const res = await fetch('/api/cron/remind-pending')
    const data = await res.json()
    setRemindersResult(res.ok ? data.sent ?? 0 : null)
    setSendingReminders(false)
  }

  if (loading) {
    return <div className="ev-state-screen"><p className="ev-muted" role="status">Cargando…</p></div>
  }

  const countsFor = (list: Order[]) => ({
    total: list.length,
    en_revision: list.filter(o => o.status === 'en_revision').length,
    pendiente_comprobante: list.filter(o => o.status === 'pendiente_comprobante').length,
    confirmado: list.filter(o => o.status === 'confirmado').length,
    rechazado: list.filter(o => o.status === 'rechazado').length,
  })

  const byEvent = selectedEvent === 'all' ? orders : orders.filter(o => eventIdOf(o) === selectedEvent)
  const counts = countsFor(byEvent)
  const priceOf = (o: Order) => {
    const ev = events.find(e => e.id === eventIdOf(o))
    return ev ? o.cantidad * ev.precio : null
  }

  // El verificador solo ve solicitudes (su "página de inicio" es la lista de órdenes).
  const showEvents = view === 'eventos' && isAdmin

  let eventOptions: { id: string; nombre: string }[] = events
  if (!isAdmin) {
    const seen = new Map<string, string>()
    for (const o of orders) {
      const id = eventIdOf(o)
      if (id && o.events?.nombre && !seen.has(id)) seen.set(id, o.events.nombre)
    }
    eventOptions = [...seen.entries()].map(([id, nombre]) => ({ id, nombre }))
  }

  const q = query.trim().toLowerCase()
  const visibleOrders = byEvent.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (!q) return true
    return [o.order_code, o.nombre, o.telefono, o.email].some(v => (v ?? '').toLowerCase().includes(q))
  })

  const toastNode = toast && (
    <div className="ev-toast-region" role="status">
      <div className={`ev-toast ev-toast--${toast.kind}`} role={toast.kind === 'error' ? 'alert' : undefined}>
        <Icon name={toast.kind === 'success' ? 'check-circle' : 'alert-circle'} />
        <span>{toast.text}</span>
        <button type="button" className="ev-icon-btn" aria-label="Cerrar aviso" onClick={() => setToast(null)}>
          <Icon name="x" />
        </button>
      </div>
    </div>
  )

  if (showEvents) {
    return (
      <>
        <div className="ev-page-head">
          <h1 className="ev-display ev-display--md">Eventos</h1>
          <Link className="ev-btn ev-btn--primary ev-btn--sm" href="/eventos/admin/nuevo">
            <Icon name="plus" />Nuevo evento
          </Link>
        </div>

        <h2 className="ev-visually-hidden">Resumen general</h2>
        <div className="ev-stats" style={{ marginBottom: 'var(--ev-space-6)' }}>
          <div className="ev-stat"><span className="ev-stat__value">{counts.total}</span><span className="ev-stat__label"><Icon name="ticket" size="sm" />Total órdenes</span></div>
          <div className="ev-stat ev-stat--review"><span className="ev-stat__value">{counts.en_revision}</span><span className="ev-stat__label"><Icon name="eye" size="sm" />En revisión</span></div>
          <div className="ev-stat ev-stat--confirmed"><span className="ev-stat__value">{counts.confirmado}</span><span className="ev-stat__label"><Icon name="check-circle" size="sm" />Confirmadas</span></div>
        </div>

        <div className="ev-cluster" style={{ marginBottom: 'var(--ev-space-8)' }}>
          <button type="button" className="ev-btn ev-btn--secondary ev-btn--sm" onClick={sendReminders} disabled={sendingReminders}>
            <Icon name="mail" />{sendingReminders ? 'Enviando…' : 'Recordar compras pendientes'}
          </button>
          {remindersResult !== null && (
            <p className="ev-subtle" role="status">
              {remindersResult === 0 ? 'No había recordatorios pendientes por enviar.' : `${remindersResult} recordatorio${remindersResult > 1 ? 's' : ''} enviado${remindersResult > 1 ? 's' : ''}.`}
            </p>
          )}
        </div>

        {events.length === 0 ? (
          <div className="ev-empty">
            <span className="ev-dropzone__icon" aria-hidden="true"><Icon name="calendar" size="lg" /></span>
            <h2 className="ev-empty__title">No hay eventos próximos</h2>
            <p className="ev-empty__text">Cuando se cargue un evento, vas a ver acá sus órdenes y métricas.</p>
            <Link className="ev-btn ev-btn--primary ev-btn--sm" href="/eventos/admin/nuevo"><Icon name="plus" />Crear evento</Link>
          </div>
        ) : (
          <ul className="ev-admin-grid" role="list">
            {events.map(event => {
              const c = countsFor(orders.filter(o => eventIdOf(o) === event.id))
              return (
                <li key={event.id} className={`ev-admin-card${event.visible ? '' : ' ev-admin-card--hidden'}`}>
                  <div className="ev-admin-card__head">
                    <div className="ev-admin-card__thumb">
                      {event.imagen_url ? (
                        <img src={event.imagen_url} alt="" />
                      ) : (
                        <div className="ev-poster-fallback"><span className="ev-poster-fallback__name">{event.nombre}</span></div>
                      )}
                    </div>
                    <div className="ev-stack ev-stack--sm" style={{ flex: 1, minWidth: 0 }}>
                      <div className="ev-cluster" style={{ ['--cluster-gap' as string]: 'var(--ev-space-2)' }}>
                        {event.visible
                          ? <span className="ev-chip ev-chip--available"><Icon name="check" />Visible</span>
                          : <span className="ev-chip ev-chip--hidden"><Icon name="eye-off" />Oculto</span>}
                      </div>
                      <h3 className="ev-title ev-title--sm">{event.nombre}</h3>
                      <p className="ev-subtle">
                        {shortDate(event.fecha)}{event.venue ? ` · ${event.venue}` : ''} · {money(Number(event.precio) || 0)}
                      </p>
                      {!event.visible && <p className="ev-subtle" style={{ fontSize: 'var(--ev-text-xs)' }}>No aparece en la cartelera pública.</p>}
                    </div>
                  </div>
                  <div className="ev-admin-card__body">
                    <div className="ev-stats">
                      <div className="ev-stat"><span className="ev-stat__value">{c.total}</span><span className="ev-stat__label">Órdenes</span></div>
                      <div className="ev-stat ev-stat--review"><span className="ev-stat__value">{c.en_revision}</span><span className="ev-stat__label">En revisión</span></div>
                      <div className="ev-stat ev-stat--confirmed"><span className="ev-stat__value">{c.confirmado}</span><span className="ev-stat__label">Confirmadas</span></div>
                    </div>
                    <div className="ev-cluster">
                      {c.en_revision > 0 && (
                        <Link className="ev-btn ev-btn--primary ev-btn--sm" href="/eventos/admin/ordenes">
                          <Icon name="eye" />Revisar {plural(c.en_revision, 'comprobante', 'comprobantes')}
                        </Link>
                      )}
                      <Link className="ev-btn ev-btn--ghost ev-btn--sm" href="/eventos/admin/verificar"><Icon name="scan" />Puerta</Link>
                      <Link className="ev-btn ev-btn--ghost ev-btn--sm" href={`/eventos/admin/eventos/${event.id}/reporte`}><Icon name="bar-chart" />Reporte</Link>
                      <Link className="ev-btn ev-btn--ghost ev-btn--sm" href={`/eventos/admin/editar/${event.id}`}><Icon name="edit" />Editar</Link>
                    </div>
                    <div className="ev-cluster">
                      <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm" onClick={() => toggleVisible(event.id, event.visible)}>
                        <Icon name={event.visible ? 'eye-off' : 'eye'} />{event.visible ? 'Ocultar' : 'Publicar'}
                      </button>
                      <a className="ev-btn ev-btn--ghost ev-btn--sm" href={`/eventos/${event.slug}`} target="_blank" rel="noopener noreferrer">
                        <Icon name="external" />Ver en el sitio
                      </a>
                      <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm" onClick={() => deleteEvent(event.id, event.nombre)} disabled={deletingEventId === event.id}>
                        <Icon name="trash" />{deletingEventId === event.id ? 'Eliminando…' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {toastNode}
      </>
    )
  }

  return (
    <>
      <div className="ev-page-head" style={{ marginBottom: 'var(--ev-space-4)' }}>
        <h1 className="ev-display ev-display--md">{isAdmin ? 'Órdenes' : 'Solicitudes de entrada'}</h1>
      </div>

      <div className="ev-form-grid ev-form-grid--2" style={{ marginBottom: 'var(--ev-space-4)', gap: 'var(--ev-space-3)' }}>
        {eventOptions.length > 1 && (
          <div className="ev-field">
            <label className="ev-visually-hidden" htmlFor="ord-ev">Evento</label>
            <div className="ev-field__control ev-field__control--select">
              <select className="ev-select" id="ord-ev" value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
                <option value="all">Todos los eventos</option>
                {eventOptions.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
          </div>
        )}
        <div className="ev-field">
          <label className="ev-visually-hidden" htmlFor="ord-q">Buscar orden</label>
          <div className="ev-field__control">
            <Icon name="search" />
            <input className="ev-input" id="ord-q" type="search" placeholder="Código, nombre o teléfono" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="ev-filters" role="group" aria-label="Filtrar por estado" style={{ marginBottom: 'var(--ev-space-6)' }}>
        {FILTERS.map(f => {
          const n = f.value === 'all' ? counts.total : counts[f.value]
          return (
            <button key={f.value} type="button" className="ev-filter-chip" aria-pressed={statusFilter === f.value} onClick={() => setStatusFilter(f.value)}>
              {f.label} · {n}
            </button>
          )
        })}
      </div>

      {visibleOrders.length === 0 ? (
        statusFilter === 'en_revision' && !q ? (
          <div className="ev-empty">
            <span className="ev-dropzone__icon" aria-hidden="true"><Icon name="check-circle" size="lg" /></span>
            <h2 className="ev-empty__title">Al día</h2>
            <p className="ev-empty__text">No hay comprobantes esperando revisión{selectedEvent === 'all' ? '' : ' para este evento'}.</p>
          </div>
        ) : (
          <div className="ev-empty">
            <span className="ev-dropzone__icon" aria-hidden="true"><Icon name="ticket" size="lg" /></span>
            <h2 className="ev-empty__title">No hay órdenes</h2>
            <p className="ev-empty__text">{q ? 'Ninguna orden coincide con la búsqueda.' : 'No hay órdenes en este estado.'}</p>
          </div>
        )
      ) : (
        <ul className="ev-stack" role="list" style={{ ['--stack-gap' as string]: 'var(--ev-space-4)', listStyle: 'none', padding: 0 }}>
          {visibleOrders.map(order => {
            const total = priceOf(order)
            const hasProof = !!order.comprobante_path
            const inReview = order.status === 'en_revision'
            const created = new Date(order.created_at).toLocaleString('es-SV', { timeZone: EVENT_TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            return (
              <li key={order.id}>
                <article className={`ev-order-card${order.status === 'pendiente_comprobante' ? ' ev-order-card--done' : ''}`} aria-labelledby={`o-${order.id}`}>
                  <div className="ev-order-card__main">
                    <div className="ev-cluster" style={{ justifyContent: 'space-between' }}>
                      <h2 className="ev-order-card__code" id={`o-${order.id}`}>{order.order_code}</h2>
                      <div className="ev-cluster" style={{ ['--cluster-gap' as string]: 'var(--ev-space-2)' }}>
                        {order.order_type === 'cortesia' && <span className="ev-chip ev-chip--courtesy"><Icon name="gift" />Cortesía</span>}
                        <StatusChip status={order.status} />
                      </div>
                    </div>
                    <dl className="ev-order-card__data">
                      <dt>Nombre</dt><dd>{order.nombre}</dd>
                      {order.telefono && <><dt>Teléfono</dt><dd><a href={`tel:${order.telefono.replace(/\s+/g, '')}`}>{order.telefono}</a></dd></>}
                      {order.email && <><dt>Correo</dt><dd>{order.email}</dd></>}
                      {order.events && <><dt>Evento</dt><dd>{order.events.nombre}</dd></>}
                      <dt>Entradas</dt><dd>{order.cantidad}{total !== null && order.order_type !== 'cortesia' && <> · <strong>{money(total)}</strong></>}</dd>
                      <dt>Creada</dt><dd>{created}</dd>
                    </dl>
                    {inReview && (
                      <div className="ev-verify" aria-label="Verificá en el comprobante">
                        {total !== null && order.order_type !== 'cortesia' && (
                          <div className="ev-verify__item"><p className="ev-verify__label">Monto esperado</p><p className="ev-verify__value">{money(total)}</p></div>
                        )}
                        <div className="ev-verify__item"><p className="ev-verify__label">Concepto</p><p className="ev-verify__value">{order.order_code}</p></div>
                      </div>
                    )}
                    {order.status === 'pendiente_comprobante' && !hasProof && <p className="ev-subtle">Todavía no subió comprobante.</p>}

                    {order.event_tickets.length > 0 && (
                      <ul className="ev-order-card__tickets" role="list">
                        {order.event_tickets.map(t => (
                          <li key={t.id}>
                            <span className="ev-muted">Entrada {t.ticket_number}</span>
                            <span style={{ fontWeight: 600, color: t.check_in_at ? 'var(--ev-color-success)' : 'var(--ev-color-text-subtle)' }}>
                              {t.check_in_at
                                ? `Ingresó ${new Date(t.check_in_at).toLocaleTimeString('es-SV', { timeZone: EVENT_TZ, hour: '2-digit', minute: '2-digit' })}`
                                : 'Pendiente'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {(order.status === 'confirmado' || isAdmin) && (
                      <div className="ev-order-card__more">
                        {order.status === 'confirmado' && (
                          <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm" onClick={() => resendEmail(order.id)} disabled={resendingId === order.id}>
                            <Icon name="mail" />{resendingId === order.id ? 'Enviando…' : 'Reenviar mail de confirmación'}
                          </button>
                        )}
                        {isAdmin && (
                          <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm" onClick={() => deleteOrder(order.id)} disabled={deletingId === order.id}>
                            <Icon name="trash" />{deletingId === order.id ? 'Eliminando…' : 'Eliminar'}
                          </button>
                        )}
                      </div>
                    )}
                    {resentId === order.id && <p className="ev-admin-note" role="status" style={{ color: 'var(--ev-color-success)' }}>Mail enviado a {order.email}</p>}
                  </div>

                  {hasProof && <Proof order={order} preview={inReview} />}

                  {inReview && (
                    <div className="ev-order-card__actions">
                      <button type="button" className="ev-btn ev-btn--danger" onClick={() => setRejecting(order)} disabled={actionId === order.id}>
                        <Icon name="x" />Rechazar
                      </button>
                      <button type="button" className="ev-btn ev-btn--success" onClick={() => setStatus(order, 'confirmado')} disabled={actionId === order.id}>
                        <Icon name="check" />{actionId === order.id ? 'Confirmando…' : 'Confirmar'}
                      </button>
                    </div>
                  )}
                </article>
              </li>
            )
          })}
        </ul>
      )}

      {rejecting && (
        <RejectOrderModal
          code={rejecting.order_code}
          detail={[
            rejecting.nombre,
            plural(rejecting.cantidad, 'entrada', 'entradas'),
            priceOf(rejecting) !== null ? money(priceOf(rejecting) as number) : '',
          ].filter(Boolean).join(' · ')}
          busy={actionId === rejecting.id}
          onCancel={() => setRejecting(null)}
          onConfirm={() => setStatus(rejecting, 'rechazado')}
        />
      )}
      {toastNode}
    </>
  )
}
