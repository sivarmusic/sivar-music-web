'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminHeader from '@/app/eventos/admin/components/AdminHeader'
import StatusBadge from './components/StatusBadge'
import OrderModal from './components/OrderModal'
import QRModal from './components/QRModal'

interface Ticket {
  id: string
  ticket_number: number
  qr_token: string
  check_in_at: string | null
}

interface Analytics {
  visits: number
  orders: number
  withComprobante: number
  confirmed: number
  daily: { date: string; count: number }[]
}

interface Order {
  id: string
  order_code: string
  nombre: string
  telefono: string
  email: string
  cantidad: number
  status: 'pendiente_comprobante' | 'en_revision' | 'confirmado' | 'rechazado'
  comprobante_path: string | null
  rechazo_motivo: string | null
  created_at: string
  pinkfest_tickets: Ticket[]
  order_type: string
  cortesia_categoria: string | null
}

const CATEGORIA_LABELS: Record<string, string> = {
  staff: 'Staff', organizacion: 'Organización', vip: 'VIP', musicos: 'Músicos (banda)',
}

type FilterStatus = 'todas' | 'pendiente_comprobante' | 'en_revision' | 'confirmado' | 'rechazado'

const FILTER_LABELS: Record<FilterStatus, string> = {
  todas: 'Todas',
  pendiente_comprobante: 'Pendientes',
  en_revision: 'En revisión',
  confirmado: 'Confirmadas',
  rechazado: 'Rechazadas',
}

export default function PinkFestAdmin() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('todas')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [qrOrder, setQrOrder] = useState<Order | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [resentId, setResentId] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [role, setRole] = useState<'admin' | 'verificador' | null>(null)
  const isAdmin = role === 'admin'

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/pinkfest/orders')
    if (res.status === 401) {
      router.push('/pinkfest/admin/login')
      return
    }
    const data = await res.json()
    setOrders(data.orders ?? [])
    setLoading(false)
  }, [router])

  const fetchAnalytics = useCallback(async () => {
    const res = await fetch('/api/pinkfest/analytics')
    if (res.ok) {
      const data = await res.json()
      setAnalytics(data)
    }
  }, [])

  const fetchRole = useCallback(async () => {
    const res = await fetch('/api/pinkfest/auth/session')
    if (res.ok) {
      const data = await res.json()
      setRole(data.role ?? null)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    fetchRole()
  }, [fetchOrders, fetchRole])

  useEffect(() => {
    if (isAdmin) fetchAnalytics()
  }, [isAdmin, fetchAnalytics])

  async function updateStatus(id: string, status: 'confirmado' | 'rechazado', rechazo_motivo?: string) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/pinkfest/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rechazo_motivo }),
      })
      if (res.ok) {
        await fetchOrders()
        setRejectingId(null)
        setRejectReason('')
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function deleteOrder(id: string) {
    if (!confirm('¿Eliminás esta orden? Esta acción no se puede deshacer.')) return
    setDeletingId(id)
    try {
      await fetch(`/api/pinkfest/orders/${id}`, { method: 'DELETE' })
      await fetchOrders()
    } finally {
      setDeletingId(null)
    }
  }

  async function resendEmail(id: string) {
    setResendingId(id)
    setResentId(null)
    const res = await fetch(`/api/pinkfest/orders/${id}/resend`, { method: 'POST' })
    setResendingId(null)
    if (res.ok) {
      setResentId(id)
      setTimeout(() => setResentId(null), 4000)
    }
  }

  function exportCSV() {
    const params = filter !== 'todas' ? `?status=${filter}` : ''
    window.open(`/api/pinkfest/export${params}`, '_blank')
  }

  const filtered = orders.filter(o => {
    const matchStatus = filter === 'todas' || o.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q || o.nombre.toLowerCase().includes(q) || o.order_code.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  // Contadores — las cortesías no cuentan como vendidas para la liquidación con el venue
  const ventasConfirmadas = orders.filter(o => o.status === 'confirmado' && o.order_type !== 'cortesia')
  const cortesiasConfirmadas = orders.filter(o => o.status === 'confirmado' && o.order_type === 'cortesia')
  const totalConfirmadas = ventasConfirmadas.length
  const totalEnRevision  = orders.filter(o => o.status === 'en_revision').length
  const totalEntradas    = ventasConfirmadas.reduce((s, o) => s + o.cantidad, 0)
  const totalCortesias   = cortesiasConfirmadas.reduce((s, o) => s + o.cantidad, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0008] flex items-center justify-center">
        <p className="text-white/40 text-sm">Cargando órdenes...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      <AdminHeader />

      <div className="px-4 pt-4 max-w-lg mx-auto flex items-center justify-between">
        <div>
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.25em] uppercase">Pink Fest</p>
          <h1 className="text-white text-lg font-bold leading-tight">Órdenes</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            className="text-white/40 hover:text-white text-xs transition"
            title="Actualizar"
          >
            ↻
          </button>
          {isAdmin && (
            <>
              <Link href="/pinkfest/admin/reporte"
                className="text-white/40 hover:text-white text-xs uppercase tracking-wider transition">
                Reporte
              </Link>
              <Link href="/pinkfest/admin/editar"
                className="text-white/40 hover:text-white text-xs uppercase tracking-wider transition">
                Editar
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">

        {/* Contadores */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/5 border border-white/8 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{orders.length}</p>
            <p className="text-white/40 text-xs mt-0.5">Total</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{totalConfirmadas}</p>
            <p className="text-white/40 text-xs mt-0.5">Confirmadas</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-yellow-400">{totalEnRevision}</p>
            <p className="text-white/40 text-xs mt-0.5">En revisión</p>
          </div>
        </div>

        <div className="bg-[#F472B6]/10 border border-[#F472B6]/20 rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-white/60 text-sm">Entradas vendidas (para el venue)</span>
          <span className="text-[#F472B6] font-bold text-xl">{totalEntradas}</span>
        </div>
        {totalCortesias > 0 && (
          <div className="bg-purple-400/10 border border-purple-400/20 rounded-2xl px-4 py-3 flex items-center justify-between">
            <span className="text-white/60 text-sm">Entradas de cortesía</span>
            <span className="text-purple-300 font-bold text-xl">{totalCortesias}</span>
          </div>
        )}

        {/* Analítica de conversión — admin */}
        {isAdmin && (
        <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowAnalytics(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/60 hover:text-white transition"
          >
            <span className="font-semibold">Analítica de conversión</span>
            <span className="text-white/30 text-xs">{showAnalytics ? '▲ ocultar' : '▼ ver'}</span>
          </button>

          {showAnalytics && analytics && (
            <div className="border-t border-white/8 px-4 py-4 space-y-4">

              {/* Funnel */}
              {(() => {
                const pct = (a: number, b: number) =>
                  b === 0 ? '—' : `${Math.round((a / b) * 100)}%`
                const steps = [
                  { label: 'Visitaron la página', value: analytics.visits, color: 'text-white' },
                  { label: 'Llenaron el formulario', value: analytics.orders, color: 'text-blue-300', pctOf: analytics.visits },
                  { label: 'Subieron comprobante', value: analytics.withComprobante, color: 'text-yellow-300', pctOf: analytics.orders },
                  { label: 'Entradas confirmadas', value: analytics.confirmed, color: 'text-green-400', pctOf: analytics.withComprobante },
                ]
                return (
                  <div className="space-y-2">
                    {steps.map((step, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between">
                          <span className="text-white/55 text-xs">{step.label}</span>
                          <div className="flex items-center gap-2">
                            {step.pctOf !== undefined && (
                              <span className="text-white/30 text-[10px]">
                                {pct(step.value, step.pctOf)} del paso anterior
                              </span>
                            )}
                            <span className={`font-bold text-sm ${step.color}`}>{step.value}</span>
                          </div>
                        </div>
                        {i < steps.length - 1 && (
                          <div className="mt-1 ml-1 h-3 w-px bg-white/15" />
                        )}
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Visitas últimos 7 días */}
              {analytics.daily.length > 0 && (
                <div>
                  <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Últimos 7 días</p>
                  <div className="space-y-1">
                    {analytics.daily.map(({ date, count }) => {
                      const max = Math.max(...analytics.daily.map(d => d.count))
                      const pctBar = max === 0 ? 0 : (count / max) * 100
                      const label = new Date(date + 'T12:00:00').toLocaleDateString('es-SV', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      })
                      return (
                        <div key={date} className="flex items-center gap-2">
                          <span className="text-white/35 text-[10px] w-20 flex-none">{label}</span>
                          <div className="flex-1 bg-white/8 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-[#F472B6]/60 rounded-full transition-all"
                              style={{ width: `${pctBar}%` }}
                            />
                          </div>
                          <span className="text-white/50 text-[10px] w-4 text-right">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={fetchAnalytics}
                className="text-white/25 hover:text-white/50 text-[10px] transition"
              >
                Actualizar
              </button>
            </div>
          )}
        </div>
        )}

        {/* Búsqueda */}
        <input
          type="text"
          placeholder="Buscar por nombre o código (ej: PF-0001)..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 transition"
        />

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(Object.keys(FILTER_LABELS) as FilterStatus[]).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex-none text-xs px-3 py-1.5 rounded-full border transition whitespace-nowrap ${
                filter === s
                  ? 'border-[#F472B6] bg-[#F472B6]/15 text-[#F472B6]'
                  : 'border-white/12 text-white/45 hover:text-white hover:border-white/25'
              }`}
            >
              {FILTER_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Exportar — admin */}
        {isAdmin && (
          <button
            onClick={exportCSV}
            className="w-full border border-white/12 hover:border-white/25 text-white/50 hover:text-white text-xs font-semibold uppercase tracking-wider rounded-2xl py-2.5 transition"
          >
            Exportar CSV ({filtered.length} fila{filtered.length !== 1 ? 's' : ''})
          </button>
        )}

        {/* Lista de órdenes */}
        <div className="space-y-3 pb-10">
          {filtered.length === 0 ? (
            <p className="text-white/30 text-center py-10 text-sm">Sin órdenes</p>
          ) : (
            filtered.map(order => (
              <div
                key={order.id}
                className="bg-white/4 border border-white/8 rounded-2xl p-4 space-y-3"
              >
                {/* Cabecera */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[#F472B6] font-bold text-sm">{order.order_code}</span>
                      <StatusBadge status={order.status} />
                      {order.order_type === 'cortesia' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-300">
                          Cortesía{order.cortesia_categoria ? ` — ${CATEGORIA_LABELS[order.cortesia_categoria] ?? order.cortesia_categoria}` : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-white font-semibold text-sm truncate">{order.nombre}</p>
                    <p className="text-white/45 text-xs mt-0.5">{order.telefono}</p>
                    <p className="text-white/35 text-xs truncate">{order.email}</p>
                  </div>
                  <div className="text-right flex-none">
                    <p className="text-white font-bold text-lg leading-none">{order.cantidad}×</p>
                    {order.order_type !== 'cortesia' && (
                      <p className="text-white/35 text-xs mt-1">${order.cantidad * 10}</p>
                    )}
                  </div>
                </div>

                {/* Fecha */}
                <p className="text-white/25 text-xs">
                  {new Date(order.created_at).toLocaleString('es-SV', {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>

                {/* Comprobante */}
                {order.comprobante_path ? (
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="w-full text-xs border border-[#F472B6]/25 text-[#F472B6] rounded-xl py-2.5 hover:bg-[#F472B6]/8 transition"
                  >
                    Ver comprobante →
                  </button>
                ) : (
                  <p className="text-white/25 text-xs italic">Sin comprobante aún</p>
                )}

                {/* QR + check-in — solo órdenes confirmadas */}
                {order.status === 'confirmado' && (
                  <>
                    <button
                      onClick={() => setQrOrder(order)}
                      className="w-full text-xs border border-green-500/30 text-green-400 rounded-xl py-2.5 hover:bg-green-500/8 transition"
                    >
                      Ver QR{order.cantidad > 1 ? `s (${order.cantidad} entradas)` : ' de entrada'} →
                    </button>
                    {order.pinkfest_tickets?.length > 0 && (
                      <div className="space-y-1">
                        {order.pinkfest_tickets
                          .sort((a, b) => a.ticket_number - b.ticket_number)
                          .map(t => (
                            <p key={t.id} className={`text-xs ${t.check_in_at ? 'text-green-400/70' : 'text-white/25 italic'}`}>
                              {t.check_in_at
                                ? `Entrada ${t.ticket_number}: ingresó ${new Date(t.check_in_at).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}`
                                : `Entrada ${t.ticket_number}: pendiente de ingreso`}
                            </p>
                          ))}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <button
                        onClick={() => resendEmail(order.id)}
                        disabled={resendingId === order.id}
                        className="w-full text-xs border border-white/10 hover:border-[#F472B6]/30 text-white/40 hover:text-[#F472B6] hover:bg-[#F472B6]/8 rounded-xl py-2.5 transition disabled:opacity-40"
                      >
                        {resendingId === order.id ? 'Enviando...' : '✉ Reenviar mail de confirmación'}
                      </button>
                      {resentId === order.id && (
                        <p className="text-green-400 text-xs text-center">Mail enviado a {order.email}</p>
                      )}
                    </div>
                  </>
                )}

                {/* Botón eliminar — admin */}
                {isAdmin && (
                  <button
                    onClick={() => deleteOrder(order.id)}
                    disabled={deletingId === order.id}
                    className="w-full text-xs border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 rounded-xl py-2 transition disabled:opacity-40"
                  >
                    {deletingId === order.id ? 'Eliminando...' : 'Eliminar orden'}
                  </button>
                )}

                {/* Motivo de rechazo */}
                {order.status === 'rechazado' && order.rechazo_motivo && (
                  <p className="text-red-400/70 text-xs bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2">
                    Motivo: {order.rechazo_motivo}
                  </p>
                )}

                {/* Acciones admin (solo para en_revision) */}
                {order.status === 'en_revision' && (
                  <div className="space-y-2">
                    {rejectingId === order.id ? (
                      <>
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Motivo del rechazo (opcional)"
                          className="w-full bg-white/6 border border-red-400/25 text-white placeholder-white/25 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-red-400/50 transition"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateStatus(order.id, 'rechazado', rejectReason)}
                            disabled={actionLoading === order.id}
                            className="flex-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500/35 text-red-400 text-xs font-semibold rounded-xl py-2.5 transition disabled:opacity-50"
                          >
                            {actionLoading === order.id ? '...' : 'Confirmar rechazo'}
                          </button>
                          <button
                            onClick={() => { setRejectingId(null); setRejectReason('') }}
                            className="flex-1 border border-white/12 text-white/40 hover:text-white text-xs rounded-xl py-2.5 transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(order.id, 'confirmado')}
                          disabled={actionLoading === order.id}
                          className="flex-1 bg-green-500/15 hover:bg-green-500/25 border border-green-500/35 text-green-400 text-xs font-bold rounded-xl py-2.5 transition disabled:opacity-50"
                        >
                          {actionLoading === order.id ? '...' : '✓ Confirmar'}
                        </button>
                        <button
                          onClick={() => setRejectingId(order.id)}
                          className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 text-xs font-semibold rounded-xl py-2.5 transition"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Accesos grandes — para no perderse en el momento */}
        <div className="grid grid-cols-2 gap-3 pt-2 pb-6">
          <Link href="/pinkfest/verificar"
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

      {/* Modal comprobante */}
      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* Modal QR entrada */}
      {qrOrder && (
        <QRModal
          order={qrOrder}
          onClose={() => setQrOrder(null)}
          onRefresh={fetchOrders}
        />
      )}
    </div>
  )
}
