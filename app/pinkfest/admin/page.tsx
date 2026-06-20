'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import StatusBadge from './components/StatusBadge'
import OrderModal from './components/OrderModal'
import QRModal from './components/QRModal'

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
  qr_token: string | null
  check_in_at: string | null
  created_at: string
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

  useEffect(() => { fetchOrders() }, [fetchOrders])

  async function logout() {
    await fetch('/api/pinkfest/auth/logout', { method: 'POST' })
    router.push('/pinkfest/admin/login')
  }

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

  // Contadores
  const totalConfirmadas = orders.filter(o => o.status === 'confirmado').length
  const totalEnRevision  = orders.filter(o => o.status === 'en_revision').length
  const totalEntradas    = orders.filter(o => o.status === 'confirmado').reduce((s, o) => s + o.cantidad, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0008] flex items-center justify-center">
        <p className="text-white/40 text-sm">Cargando órdenes...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/8 bg-[#0a0008]/95 backdrop-blur-md px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.25em] uppercase">Pink Fest</p>
          <h1 className="text-white text-base font-bold leading-tight">Órdenes</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            className="text-white/40 hover:text-white text-xs transition"
            title="Actualizar"
          >
            ↻
          </button>
          <button
            onClick={() => window.open('/pinkfest/verificar', '_blank')}
            className="text-[#F472B6]/70 hover:text-[#F472B6] text-xs uppercase tracking-wider transition"
          >
            Escanear
          </button>
          <button
            onClick={logout}
            className="text-white/40 hover:text-white text-xs uppercase tracking-wider transition"
          >
            Salir
          </button>
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
          <span className="text-white/60 text-sm">Entradas confirmadas</span>
          <span className="text-[#F472B6] font-bold text-xl">{totalEntradas}</span>
        </div>

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

        {/* Exportar */}
        <button
          onClick={exportCSV}
          className="w-full border border-white/12 hover:border-white/25 text-white/50 hover:text-white text-xs font-semibold uppercase tracking-wider rounded-2xl py-2.5 transition"
        >
          Exportar CSV ({filtered.length} fila{filtered.length !== 1 ? 's' : ''})
        </button>

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
                    </div>
                    <p className="text-white font-semibold text-sm truncate">{order.nombre}</p>
                    <p className="text-white/45 text-xs mt-0.5">{order.telefono}</p>
                    <p className="text-white/35 text-xs truncate">{order.email}</p>
                  </div>
                  <div className="text-right flex-none">
                    <p className="text-white font-bold text-lg leading-none">{order.cantidad}×</p>
                    <p className="text-white/35 text-xs mt-1">${order.cantidad * 10}</p>
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

                {/* QR entrada — solo si está confirmada */}
                {order.status === 'confirmado' && order.qr_token && (
                  <button
                    onClick={() => setQrOrder(order)}
                    className="w-full text-xs border border-green-500/30 text-green-400 rounded-xl py-2.5 hover:bg-green-500/8 transition"
                  >
                    Ver QR de entrada →
                  </button>
                )}

                {/* Check-in status */}
                {order.status === 'confirmado' && (
                  <p className={`text-xs ${order.check_in_at ? 'text-green-400/70' : 'text-white/25 italic'}`}>
                    {order.check_in_at
                      ? `Ingresó a las ${new Date(order.check_in_at).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}`
                      : 'Aún no ingresó'}
                  </p>
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
      </div>

      {/* Modal comprobante */}
      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* Modal QR entrada */}
      {qrOrder && qrOrder.qr_token && (
        <QRModal
          order={{ ...qrOrder, qr_token: qrOrder.qr_token }}
          onClose={() => setQrOrder(null)}
        />
      )}
    </div>
  )
}
