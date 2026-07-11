'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminHeader from './components/AdminHeader'

interface Ticket { id: string; ticket_number: number; qr_token: string; check_in_at: string | null }
interface Order {
  id: string; order_code: string; nombre: string; telefono: string; email: string
  cantidad: number; status: string; created_at: string; comprobante_path: string | null
  order_type: string
  events: { id: string; nombre: string; slug: string } | null
  event_tickets: Ticket[]
}
interface Event { id: string; nombre: string; slug: string; fecha: string; precio: number; visible: boolean; imagen_url?: string | null; venue?: string }

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pendiente_comprobante: { label: 'Sin comprobante', color: 'text-white/50', bg: 'bg-white/8' },
  en_revision: { label: 'En revisión', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  confirmado: { label: 'Confirmado', color: 'text-green-400', bg: 'bg-green-400/10' },
  rechazado: { label: 'Rechazado', color: 'text-red-400', bg: 'bg-red-400/10' },
}

export default function EventosAdminPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<'admin' | 'verificador' | null>(null)
  const isAdmin = role === 'admin'
  const [actionId, setActionId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [resentId, setResentId] = useState<string | null>(null)
  const [sendingReminders, setSendingReminders] = useState(false)
  const [remindersResult, setRemindersResult] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    const sessionRes = await fetch('/api/pinkfest/auth/session')
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

  async function setStatus(orderId: string, status: 'confirmado' | 'rechazado') {
    setActionId(orderId)
    await fetch(`/api/eventos/orders/${orderId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await fetchData()
    setActionId(null)
  }

  async function deleteOrder(orderId: string) {
    if (!window.confirm('¿Eliminar esta orden? Esta acción no se puede deshacer.')) return
    setDeletingId(orderId)
    await fetch(`/api/eventos/orders/${orderId}`, { method: 'DELETE' })
    await fetchData()
    setDeletingId(null)
  }

  async function resendEmail(orderId: string) {
    setResendingId(orderId)
    setResentId(null)
    const res = await fetch(`/api/eventos/orders/${orderId}/resend`, { method: 'POST' })
    setResendingId(null)
    if (res.ok) {
      setResentId(orderId)
      setTimeout(() => setResentId(null), 4000)
    }
  }

  async function toggleVisible(eventId: string, current: boolean) {
    await fetch(`/api/eventos/events/${eventId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: !current }),
    })
    await fetchData()
  }

  async function deleteEvent(eventId: string, nombre: string) {
    if (!window.confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return
    setDeletingEventId(eventId)
    await fetch(`/api/eventos/events/${eventId}`, { method: 'DELETE' })
    await fetchData()
    setDeletingEventId(null)
  }

  async function sendReminders() {
    setSendingReminders(true)
    setRemindersResult(null)
    const res = await fetch('/api/cron/remind-pending')
    const data = await res.json()
    setRemindersResult(res.ok ? data.sent ?? 0 : null)
    setSendingReminders(false)
  }

  const filtered = selectedEvent === 'all' ? orders : orders.filter(o => o.events?.id === selectedEvent)

  const counts = {
    en_revision: filtered.filter(o => o.status === 'en_revision').length,
    confirmado: filtered.filter(o => o.status === 'confirmado').length,
    total: filtered.length,
  }

  if (loading) return <div className="min-h-screen bg-[#0a0008] flex items-center justify-center"><p className="text-white/30 text-sm">Cargando...</p></div>

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      <AdminHeader />

      <div className="px-5 py-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-lg font-bold">{isAdmin ? 'Eventos' : 'Solicitudes de entrada'}</h1>
          {isAdmin && (
            <Link href="/eventos/admin/nuevo"
              className="bg-[#F472B6] hover:bg-[#ec4899] text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-xl transition">
              + Nuevo
            </Link>
          )}
        </div>

        {!isAdmin && (
          <Link href="/pinkfest/admin"
            className="block rounded-2xl border border-[#F472B6]/20 bg-[#F472B6]/5 px-4 py-3 text-sm text-white/70 hover:text-[#F472B6] transition">
            Ver solicitudes de Pink Fest →
          </Link>
        )}

        {/* Eventos — solo admin */}
        {isAdmin && (
          <div className="space-y-3">
            {/* Pink Fest — tarjeta fija */}
            <div className="rounded-2xl border border-[#F472B6]/20 bg-[#F472B6]/5 p-4 flex items-center gap-4">
              <div className="h-14 w-14 flex-none rounded-xl bg-[#F472B6]/15 flex items-center justify-center text-2xl">🎀</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-semibold text-sm">Pink Fest</p>
                  <span className="text-[10px] text-[#F472B6] font-bold bg-[#F472B6]/10 px-2 py-0.5 rounded-full">Independiente</span>
                  <span className="text-xs px-2.5 py-1 rounded-xl font-semibold bg-green-400/15 text-green-400">Visible</span>
                </div>
                <p className="text-white/35 text-xs mt-1">sáb. 12 jul · $10 · Beerhaus</p>
              </div>
              <div className="flex items-center gap-2 flex-none flex-wrap justify-end">
                <Link href="/pinkfest/admin/reporte"
                  className="text-xs px-3 py-1.5 rounded-xl font-semibold bg-white/8 text-white/50 hover:bg-[#F472B6]/20 hover:text-[#F472B6] transition">
                  Reporte
                </Link>
                <Link href="/pinkfest/admin"
                  className="text-xs px-3 py-1.5 rounded-xl font-semibold bg-white/8 text-white/50 hover:bg-[#F472B6]/20 hover:text-[#F472B6] transition">
                  Gestionar
                </Link>
                <a href="/pinkfest" target="_blank" rel="noopener noreferrer"
                  className="text-white/25 hover:text-white text-xs transition">↗</a>
              </div>
            </div>

            {events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                <p className="text-white/25 text-sm">No hay otros eventos creados.</p>
                <Link href="/eventos/admin/nuevo" className="text-[#F472B6] text-xs mt-2 block hover:text-white transition">Crear evento →</Link>
              </div>
            ) : events.map(event => (
              <div key={event.id} className="rounded-2xl border border-white/10 bg-white/4 p-4 flex items-center gap-4">
                {event.imagen_url ? (
                  <img src={event.imagen_url} alt={event.nombre} className="h-14 w-14 flex-none rounded-xl object-cover" />
                ) : (
                  <div className="h-14 w-14 flex-none rounded-xl bg-white/8 flex items-center justify-center text-2xl">🎫</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-semibold text-sm truncate">{event.nombre}</p>
                    <button onClick={() => toggleVisible(event.id, event.visible)}
                      className={`text-xs px-2.5 py-1 rounded-xl font-semibold transition ${event.visible ? 'bg-green-400/15 text-green-400 hover:bg-red-400/15 hover:text-red-400' : 'bg-white/8 text-white/40 hover:bg-green-400/15 hover:text-green-400'}`}>
                      {event.visible ? 'Visible' : 'Oculto'}
                    </button>
                  </div>
                  <p className="text-white/35 text-xs mt-1">
                    {new Date(event.fecha).toLocaleDateString('es-SV', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {event.venue && ` · ${event.venue}`}
                    {' · '}<span className="font-mono">${event.precio}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-none flex-wrap justify-end">
                  <Link href={`/eventos/admin/eventos/${event.id}/reporte`}
                    className="text-xs px-3 py-1.5 rounded-xl font-semibold bg-white/8 text-white/50 hover:bg-[#F472B6]/20 hover:text-[#F472B6] transition">
                    Reporte
                  </Link>
                  <Link href={`/eventos/admin/editar/${event.id}`}
                    className="text-xs px-3 py-1.5 rounded-xl font-semibold bg-white/8 text-white/50 hover:bg-[#F472B6]/20 hover:text-[#F472B6] transition">
                    Editar
                  </Link>
                  <a href={`/eventos/${event.slug}`} target="_blank" rel="noopener noreferrer"
                    className="text-white/25 hover:text-white text-xs transition">↗</a>
                  <button
                    onClick={() => deleteEvent(event.id, event.nombre)}
                    disabled={deletingEventId === event.id}
                    className="text-xs px-2 py-1.5 rounded-xl font-semibold bg-red-500/10 text-red-400/50 hover:bg-red-500/20 hover:text-red-400 transition disabled:opacity-40"
                  >
                    {deletingEventId === event.id ? '...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filtro por evento */}
        {isAdmin && events.length > 1 && (
          <div>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2">Filtrar órdenes</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSelectedEvent('all')}
                className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition ${selectedEvent === 'all' ? 'bg-[#F472B6] text-white' : 'bg-white/8 text-white/50 hover:text-white'}`}>
                Todos
              </button>
              {events.map(e => (
                <button key={e.id} onClick={() => setSelectedEvent(e.id)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition ${selectedEvent === e.id ? 'bg-[#F472B6] text-white' : 'bg-white/8 text-white/50 hover:text-white'}`}>
                  {e.nombre}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total órdenes', value: counts.total, color: 'text-white' },
            { label: 'En revisión', value: counts.en_revision, color: 'text-yellow-400' },
            { label: 'Confirmadas', value: counts.confirmado, color: 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl bg-white/5 border border-white/8 p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-white/35 text-[10px] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={sendReminders} disabled={sendingReminders}
              className="bg-white/6 hover:bg-[#F472B6]/15 hover:text-[#F472B6] border border-white/10 hover:border-[#F472B6]/30 text-white/50 text-xs font-semibold rounded-xl px-4 py-2.5 transition disabled:opacity-40">
              {sendingReminders ? 'Enviando...' : '✉ Recordar compras pendientes'}
            </button>
            {remindersResult !== null && (
              <p className="text-white/35 text-xs">
                {remindersResult === 0 ? 'No había recordatorios pendientes por enviar.' : `${remindersResult} recordatorio${remindersResult > 1 ? 's' : ''} enviado${remindersResult > 1 ? 's' : ''}.`}
              </p>
            )}
          </div>
        )}

        {/* Órdenes */}
        <div>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-3">Órdenes</p>
          {filtered.length === 0 ? (
            <p className="text-white/25 text-sm text-center py-12">No hay órdenes.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(order => {
                const statusInfo = STATUS_LABELS[order.status] ?? { label: order.status, color: 'text-white/40', bg: 'bg-white/5' }
                const isExpanded = expandedId === order.id

                return (
                  <div key={order.id} className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
                    <button onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className="w-full px-4 py-4 text-left flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-semibold text-sm">{order.nombre}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          {order.order_type === 'cortesia' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-300">Cortesía</span>
                          )}
                        </div>
                        <p className="text-white/35 text-xs">{[order.telefono, order.email].filter(Boolean).join(' · ')}</p>
                        {order.events && <p className="text-white/25 text-xs mt-0.5">{order.events.nombre}</p>}
                      </div>
                      <div className="text-right flex-none">
                        <p className="text-[#F472B6] font-bold text-sm">{order.order_code}</p>
                        <p className="text-white/30 text-xs">{order.cantidad} entrada{order.cantidad > 1 ? 's' : ''}</p>
                        <p className="text-white/20 text-xs mt-1">{isExpanded ? '▲' : '▼'}</p>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-white/8 px-4 py-4 space-y-3">
                        {/* Comprobante */}
                        {order.comprobante_path && (
                          <a href={`/api/pinkfest/comprobante/${order.comprobante_path.split('/').pop()}`}
                            target="_blank" rel="noopener noreferrer"
                            className="block text-center text-[#F472B6] text-xs underline underline-offset-2">
                            Ver comprobante ↗
                          </a>
                        )}

                        {/* Tickets */}
                        {order.event_tickets.length > 0 && (
                          <div className="space-y-1">
                            {order.event_tickets.map(t => (
                              <div key={t.id} className="flex items-center justify-between bg-white/4 rounded-xl px-3 py-2">
                                <span className="text-white/50 text-xs">Entrada {t.ticket_number}</span>
                                <span className={`text-xs font-semibold ${t.check_in_at ? 'text-green-400' : 'text-white/25'}`}>
                                  {t.check_in_at
                                    ? `Ingresó ${new Date(t.check_in_at).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}`
                                    : 'Pendiente'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reenviar mail */}
                        {order.status === 'confirmado' && (
                          <div className="space-y-1.5">
                            <button
                              onClick={() => resendEmail(order.id)}
                              disabled={resendingId === order.id}
                              className="w-full bg-white/5 hover:bg-[#F472B6]/15 hover:text-[#F472B6] border border-white/10 hover:border-[#F472B6]/30 text-white/50 text-xs font-semibold rounded-xl py-2.5 transition disabled:opacity-40"
                            >
                              {resendingId === order.id ? 'Enviando...' : '✉ Reenviar mail de confirmación'}
                            </button>
                            {resentId === order.id && (
                              <p className="text-green-400 text-xs text-center">Mail enviado a {order.email}</p>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 flex-wrap">
                          {order.status === 'en_revision' && (
                            <>
                              <button onClick={() => setStatus(order.id, 'confirmado')} disabled={actionId === order.id}
                                className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-bold py-2.5 rounded-xl transition disabled:opacity-50">
                                {actionId === order.id ? '...' : 'Confirmar'}
                              </button>
                              <button onClick={() => setStatus(order.id, 'rechazado')} disabled={actionId === order.id}
                                className="flex-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-bold py-2.5 rounded-xl transition disabled:opacity-50">
                                Rechazar
                              </button>
                            </>
                          )}
                          {isAdmin && (
                            <button onClick={() => deleteOrder(order.id)} disabled={deletingId === order.id}
                              className="bg-white/6 hover:bg-red-500/15 hover:text-red-400 text-white/30 text-xs font-bold px-4 py-2.5 rounded-xl transition disabled:opacity-50">
                              {deletingId === order.id ? '...' : 'Eliminar'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Accesos grandes — para no perderse en el momento */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link href="/eventos/admin/verificar"
            className="flex flex-col items-center justify-center gap-2 bg-[#F472B6] hover:bg-[#ec4899] active:scale-[0.98] text-white rounded-3xl py-10 transition-all text-center px-3">
            <span className="text-4xl">📷</span>
            <span className="font-bold text-sm uppercase tracking-wide">Verificar entrada</span>
          </Link>
          <Link href="/eventos/admin/contador"
            className="flex flex-col items-center justify-center gap-2 bg-[#5fb3b3] hover:bg-[#4fa3a3] active:scale-[0.98] text-white rounded-3xl py-10 transition-all text-center px-3">
            <span className="text-4xl">🔢</span>
            <span className="font-bold text-sm uppercase tracking-wide">Contar personas</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
