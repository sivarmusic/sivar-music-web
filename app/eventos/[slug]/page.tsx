'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import EventMap from '../components/EventMap'

interface Event {
  id: string; slug: string; nombre: string; descripcion: string
  fecha: string; venue: string; direccion: string; lat: number | null; lng: number | null
  imagen_url: string | null; precio: number; artistas: string[]
}

interface FormState {
  nombre: string; telefono: string; email: string; cantidad: number
  password: string; createAccount: boolean
}

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [form, setForm] = useState<FormState>({ nombre: '', telefono: '', email: '', cantidad: 1, password: '', createAccount: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/eventos/events/${slug}`)
      .then(r => r.json())
      .then(d => { if (d.event) setEvent(d.event); else setNotFound(true) })
      .catch(() => setNotFound(true))
  }, [slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!event) return
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/eventos/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: event.id, ...form, password: form.createAccount ? form.password : undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al registrar')
      router.push(`/eventos/${slug}/pago/${data.order.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0a0008] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/50 text-sm mb-4">Evento no encontrado.</p>
          <a href="/eventos" className="text-[#F472B6] text-sm">← Ver todos los eventos</a>
        </div>
      </div>
    )
  }

  if (!event) {
    return <div className="min-h-screen bg-[#0a0008] flex items-center justify-center"><p className="text-white/30 text-sm">Cargando...</p></div>
  }

  const fecha = new Date(event.fecha)
  const total = form.cantidad * event.precio

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      {/* Imagen hero */}
      {event.imagen_url ? (
        <div className="relative h-56 w-full">
          <Image src={event.imagen_url} alt={event.nombre} fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0008]/40 to-[#0a0008]" />
        </div>
      ) : <div className="h-16" />}

      <div className="px-5 pb-12 max-w-lg mx-auto -mt-8 relative z-10 space-y-5">
        {/* Volver */}
        <a href="/eventos" className="text-white/35 hover:text-white text-xs transition">← Todos los eventos</a>

        {/* Info del evento */}
        <div>
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.25em] uppercase mb-2">Sivar Music</p>
          <h1 className="text-white text-2xl font-bold mb-3">{event.nombre}</h1>
          <div className="space-y-1 text-sm">
            <p className="text-white/60">
              📅 {fecha.toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' a las '}
              {fecha.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-white/60">📍 {event.venue}</p>
            {event.artistas?.length > 0 && (
              <p className="text-white/50">🎤 {event.artistas.join(', ')}</p>
            )}
            <p className="text-[#F472B6] font-bold">${event.precio} por entrada</p>
          </div>
        </div>

        {/* Descripción */}
        {event.descripcion && (
          <p className="text-white/55 text-sm leading-relaxed">{event.descripcion}</p>
        )}

        {/* Mapa */}
        {event.lat && event.lng && (
          <div>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2">Ubicación</p>
            <EventMap lat={event.lat} lng={event.lng} venue={event.venue} direccion={event.direccion} />
          </div>
        )}

        {/* Formulario de compra */}
        <div className="pt-2">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-4">Reservar entradas</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            {[
              { label: 'Nombre completo', name: 'nombre', type: 'text', placeholder: 'Tu nombre completo' },
              { label: 'WhatsApp / Teléfono', name: 'telefono', type: 'tel', placeholder: '+503 7000 0000' },
              { label: 'Correo electrónico', name: 'email', type: 'email', placeholder: 'tu@correo.com' },
            ].map(({ label, name, type, placeholder }) => (
              <div key={name}>
                <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{label}</label>
                <input
                  type={type}
                  value={form[name as keyof FormState] as string}
                  onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
                  placeholder={placeholder}
                  required
                  className="w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 transition"
                />
              </div>
            ))}

            <div>
              <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">Cantidad de entradas</label>
              <select
                value={form.cantidad}
                onChange={e => setForm(p => ({ ...p, cantidad: Number(e.target.value) }))}
                className="w-full bg-[#1a0014] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 transition"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n} entrada{n > 1 ? 's' : ''} — ${n * event.precio}</option>
                ))}
              </select>
            </div>

            {/* Crear cuenta opcional */}
            <label className="flex items-center gap-3 cursor-pointer py-1">
              <div
                onClick={() => setForm(p => ({ ...p, createAccount: !p.createAccount }))}
                className={`w-10 h-6 rounded-full transition-colors flex-none ${form.createAccount ? 'bg-[#F472B6]' : 'bg-white/15'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${form.createAccount ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-white/55 text-sm">Crear cuenta para ver mis entradas después</span>
            </label>

            {form.createAccount && (
              <div>
                <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">Contraseña</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  className="w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 transition"
                />
              </div>
            )}

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F472B6] hover:bg-[#ec4899] active:scale-[0.98] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all"
            >
              {loading ? 'Procesando...' : `Continuar → $${total}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
