'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import EventMap from '../components/EventMap'
import { supabaseBrowser } from '@/lib/supabase-browser'

interface Event {
  id: string; slug: string; nombre: string; descripcion: string
  fecha: string; venue: string; direccion: string; lat: number | null; lng: number | null
  imagen_url: string | null; precio: number; artistas: string[]
}

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [cantidad, setCantidad] = useState(1)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch(`/api/eventos/events/${slug}`)
      .then(r => r.json())
      .then(d => { if (d.event) setEvent(d.event); else setNotFound(true) })
      .catch(() => setNotFound(true))
  }, [slug])

  async function handleComprar() {
    if (!event) return
    setBusy(true)
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    const checkoutUrl = `/eventos/${slug}/checkout?cantidad=${cantidad}`
    if (session) {
      router.push(checkoutUrl)
    } else {
      router.push(`/eventos/mi-cuenta/login?next=${encodeURIComponent(checkoutUrl)}`)
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
  const total = cantidad * event.precio

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      {/* Imagen hero */}
      {event.imagen_url ? (
        <div className="relative h-64 w-full">
          <Image src={event.imagen_url} alt={event.nombre} fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0008]/30 to-[#0a0008]" />
        </div>
      ) : <div className="h-16" />}

      <div className="px-5 pb-16 max-w-lg mx-auto -mt-10 relative z-10 space-y-6">
        {/* Volver */}
        <a href="/eventos" className="text-white/35 hover:text-white text-xs transition">← Todos los eventos</a>

        {/* Info del evento */}
        <div>
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.25em] uppercase mb-2">Sivar Music</p>
          <h1 className="text-white text-2xl font-bold mb-3">{event.nombre}</h1>
          <div className="space-y-1.5 text-sm">
            <p className="text-white/60">
              📅{' '}
              {fecha.toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' a las '}
              {fecha.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-white/60">📍 {event.venue}</p>
            {event.artistas?.length > 0 && (
              <p className="text-white/50">🎤 {event.artistas.join(', ')}</p>
            )}
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

        {/* Selector de entradas + botón de compra */}
        <div className="border-t border-white/8 pt-6">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-4">Reservar entradas</p>

          <div className="bg-white/4 border border-white/10 rounded-2xl p-4 space-y-4 mb-4">
            {/* Tipo y cantidad */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm">General</p>
                <p className="text-[#F472B6] font-bold text-sm">${event.precio} por entrada</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCantidad(c => Math.max(1, c - 1))}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xl transition flex items-center justify-center leading-none"
                >−</button>
                <span className="text-white font-bold text-lg w-5 text-center tabular-nums">{cantidad}</span>
                <button
                  onClick={() => setCantidad(c => Math.min(10, c + 1))}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xl transition flex items-center justify-center leading-none"
                >+</button>
              </div>
            </div>

            <div className="border-t border-white/8" />

            <div className="flex items-center justify-between">
              <span className="text-white/40 text-sm">{cantidad} entrada{cantidad > 1 ? 's' : ''}</span>
              <span className="text-white font-bold">${total}</span>
            </div>
          </div>

          <button
            onClick={handleComprar}
            disabled={busy}
            className="w-full bg-[#F472B6] hover:bg-[#ec4899] active:scale-[0.98] disabled:opacity-60 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all"
          >
            {busy ? 'Cargando...' : `Comprar → $${total}`}
          </button>
          <p className="text-center text-white/20 text-[11px] mt-2">Pago por transferencia bancaria</p>
        </div>
      </div>
    </div>
  )
}
