'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AdminHeader from '../components/AdminHeader'

interface EventOption { key: string; nombre: string }

const PINKFEST_OPTION: EventOption = { key: 'pinkfest', nombre: 'Pink Fest' }

export default function ContadorPage() {
  const router = useRouter()
  const [events, setEvents] = useState<EventOption[]>([])
  const [eventKey, setEventKey] = useState('')
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    fetch('/api/eventos/events')
      .then(r => r.status === 401 ? null : r.json())
      .then(data => {
        const ticketEvents = (data?.events ?? [])
          .filter((e: { kind: string }) => e.kind === 'ticket')
          .map((e: { id: string; nombre: string }) => ({ key: e.id, nombre: e.nombre }))
        const opts = [PINKFEST_OPTION, ...ticketEvents]
        setEvents(opts)
        setEventKey(prev => prev || opts[0].key)
      })
  }, [])

  const fetchCount = useCallback(async (key: string) => {
    setLoading(true)
    const res = await fetch(`/api/eventos/admin/headcount?event_key=${encodeURIComponent(key)}`)
    if (res.status === 401) { router.push('/eventos/admin/login'); return }
    const data = await res.json()
    setCount(data.count ?? 0)
    setLoading(false)
  }, [router])

  useEffect(() => { if (eventKey) fetchCount(eventKey) }, [eventKey, fetchCount])

  async function adjust(delta: number) {
    if (!eventKey || busy) return
    setBusy(true)
    setCount(c => Math.max(0, (c ?? 0) + delta))
    const res = await fetch('/api/eventos/admin/headcount', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_key: eventKey, delta }),
    })
    const data = await res.json()
    if (typeof data.count === 'number') setCount(data.count)
    setBusy(false)
  }

  async function resetCount() {
    if (!window.confirm('¿Reiniciar el contador a 0?')) return
    setBusy(true)
    const res = await fetch('/api/eventos/admin/headcount', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_key: eventKey, count: 0 }),
    })
    const data = await res.json()
    setCount(data.count ?? 0)
    setBusy(false)
  }

  function startEditing() {
    setEditValue(String(count ?? 0))
    setEditing(true)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    const value = Math.max(0, Number(editValue) || 0)
    setEditing(false)
    setBusy(true)
    const res = await fetch('/api/eventos/admin/headcount', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_key: eventKey, count: value }),
    })
    const data = await res.json()
    setCount(data.count ?? value)
    setBusy(false)
  }

  const currentEvent = events.find(e => e.key === eventKey)

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      <AdminHeader />

      <div className="px-5 py-6 max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-white text-lg font-bold">Contador de personas</h1>
          <p className="text-white/35 text-xs mt-1">Llevá la cuenta de quiénes van entrando al evento.</p>
        </div>

        <div>
          <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Evento</label>
          {events.length === 0 ? (
            <p className="text-white/30 text-xs">Cargando eventos...</p>
          ) : (
            <select value={eventKey} onChange={e => setEventKey(e.target.value)}
              className="w-full bg-white/6 border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 transition">
              {events.map(ev => <option key={ev.key} value={ev.key}>{ev.nombre}</option>)}
            </select>
          )}
        </div>

        {/* Tarjeta del contador */}
        <div className="rounded-3xl border border-white/10 overflow-hidden">
          <div className="bg-[#F472B6]/20 px-6 py-3 flex items-center justify-between">
            <p className="text-white font-semibold text-sm truncate">{currentEvent?.nombre ?? 'Evento'}</p>
            <div className="flex items-center gap-3 flex-none">
              <button onClick={resetCount} disabled={busy} title="Reiniciar a 0"
                className="text-white/60 hover:text-white transition disabled:opacity-40">
                ↻
              </button>
              <button onClick={startEditing} disabled={busy} title="Editar manualmente"
                className="text-white/60 hover:text-white transition disabled:opacity-40">
                ✎
              </button>
            </div>
          </div>
          <div className="bg-white/4 px-6 py-10 flex flex-col items-center justify-center">
            {editing ? (
              <form onSubmit={saveEdit} className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  autoFocus
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={saveEdit}
                  className="w-32 bg-white/8 border border-[#F472B6]/40 text-white text-5xl font-bold text-center rounded-2xl py-2 focus:outline-none"
                />
              </form>
            ) : (
              <p className="text-white text-7xl font-bold tabular-nums">{loading ? '—' : count}</p>
            )}
            <p className="text-white/25 text-xs mt-2">personas ingresadas</p>
          </div>
        </div>

        {/* Botones grandes +/- */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => adjust(-1)}
            disabled={busy || loading || (count ?? 0) <= 0}
            className="bg-[#e0a83c] hover:bg-[#d19a2f] active:scale-[0.98] disabled:opacity-40 text-white text-6xl font-bold rounded-3xl py-10 transition-all"
          >
            −
          </button>
          <button
            onClick={() => adjust(1)}
            disabled={busy || loading}
            className="bg-[#5fb3b3] hover:bg-[#4fa3a3] active:scale-[0.98] disabled:opacity-40 text-white text-6xl font-bold rounded-3xl py-10 transition-all"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
