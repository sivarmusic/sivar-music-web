'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '../../components/icons'

interface EventOption { key: string; nombre: string }

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
        const opts: EventOption[] = ticketEvents
        setEvents(opts)
        setEventKey(prev => prev || opts[0]?.key || '')
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

  function adjust(delta: number) {
    if (!eventKey) return
    // Optimista y sin bloquear el botón — así se puede tocar rápido para contar
    // gente sin esperar el viaje de ida y vuelta al servidor en cada tap.
    setCount(c => Math.max(0, (c ?? 0) + delta))
    fetch('/api/eventos/admin/headcount', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_key: eventKey, delta }),
    }).catch(() => {})
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
    <main id="main" className="ev-door">
      <header className="ev-door__top">
        <Link className="ev-icon-btn ev-icon-btn--boxed ev-door__top-btn" href="/eventos/admin" aria-label="Volver al panel">
          <Icon name="arrow-left" size="lg" />
        </Link>
        <p className="ev-door__event">
          Contador<br /><span style={{ fontSize: '1rem' }}>{currentEvent?.nombre ?? 'Evento'}</span>
        </p>
      </header>

      <div className="ev-door__stage ev-door__stage--col">
        <div className="ev-counter" style={{ width: '100%', maxWidth: 480 }}>
          <div className="ev-door-field" style={{ width: '100%' }}>
            <label htmlFor="cnt-ev">Evento</label>
            {events.length === 0 ? (
              <p role="status">Cargando eventos…</p>
            ) : (
              <div className="ev-field__control ev-field__control--select">
                <select id="cnt-ev" className="ev-select ev-door__select" value={eventKey} onChange={e => setEventKey(e.target.value)}>
                  {events.map(ev => <option key={ev.key} value={ev.key}>{ev.nombre}</option>)}
                </select>
              </div>
            )}
          </div>

          <p className="ev-eyebrow" style={{ color: '#000', fontSize: '.875rem' }}>Personas adentro</p>
          {editing ? (
            <form onSubmit={saveEdit}>
              <label className="ev-visually-hidden" htmlFor="cnt-edit">Cantidad de personas</label>
              <input
                id="cnt-edit" className="ev-counter__edit" type="number" min={0} autoFocus
                value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit}
              />
            </form>
          ) : (
            <p className="ev-counter__value" aria-live="polite" aria-atomic="true">{loading ? '—' : count}</p>
          )}

          <div className="ev-counter__tools">
            <button type="button" className="ev-counter__tool" onClick={resetCount} disabled={busy}>
              <Icon name="refresh" />Reiniciar
            </button>
            <button type="button" className="ev-counter__tool" onClick={startEditing} disabled={busy}>
              <Icon name="edit" />Editar
            </button>
          </div>
        </div>
      </div>

      <div className="ev-door__actions">
        <div className="ev-counter__btns">
          <button
            type="button" className="ev-counter__btn" onClick={() => adjust(-1)}
            disabled={loading || (count ?? 0) <= 0} aria-label="Restar una persona (salió)"
          >
            <Icon name="minus" /><span style={{ fontSize: '1.25rem' }}>Salió</span>
          </button>
          <button
            type="button" className="ev-counter__btn ev-counter__btn--in" onClick={() => adjust(1)}
            disabled={loading} aria-label="Sumar una persona (entró)"
          >
            <Icon name="plus" /><span style={{ fontSize: '1.5rem' }}>Entró</span>
          </button>
        </div>
      </div>
    </main>
  )
}
