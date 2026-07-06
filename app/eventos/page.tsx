'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Event {
  id: string; slug: string; nombre: string; fecha: string
  venue: string; imagen_url: string | null; precio: number; artistas: string[]
}

const PINKFEST_DATE = new Date('2026-07-12T20:00:00')
const PINKFEST_TERMS = 'pink fest beerhaus san salvador sivar'

type TimeFilter = '24h' | '7d' | '30d' | null
const TIME_LABELS: Record<string, string> = { '24h': '24 HRS', '7d': '7 DÍAS', '30d': '30 DÍAS' }
const TIME_MS: Record<string, number> = { '24h': 86_400_000, '7d': 604_800_000, '30d': 2_592_000_000 }

export default function EventosPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(null)

  useEffect(() => {
    fetch('/api/eventos/events')
      .then(r => r.json())
      .then(d => { setEvents(d.events ?? []); setLoading(false) })
  }, [])

  const now = new Date()

  function withinWindow(fecha: Date) {
    if (!timeFilter) return true
    return fecha >= now && fecha <= new Date(now.getTime() + TIME_MS[timeFilter])
  }

  const q = search.toLowerCase()

  const showPinkFest = withinWindow(PINKFEST_DATE) &&
    (!q || PINKFEST_TERMS.includes(q))

  const filteredEvents = events.filter(ev => {
    if (!withinWindow(new Date(ev.fecha))) return false
    if (!q) return true
    return ev.nombre.toLowerCase().includes(q) ||
      ev.venue.toLowerCase().includes(q) ||
      (ev.artistas?.some(a => a.toLowerCase().includes(q)) ?? false)
  })

  const hasResults = showPinkFest || filteredEvents.length > 0

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-[#0a0008]/95 backdrop-blur-md border-b border-white/8">

        {/* Fila principal */}
        <div className="px-4 py-3 flex items-center gap-3 max-w-6xl mx-auto">

          {/* Logo */}
          <Link href="/eventos" className="flex-none mr-1 flex items-center gap-2.5">
            <img src="/favicon.ico" alt="Sivar Music" className="h-9 w-9 rounded-lg" />
            <span className="text-white font-bold text-sm hidden sm:block">Sivar Music</span>
          </Link>

          {/* Búsqueda */}
          <div className="flex-1 relative min-w-0">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar eventos, artistas, venues..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/6 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-2.5 pl-9 text-sm focus:outline-none focus:border-[#F472B6]/50 transition"
            />
          </div>

          {/* Redes sociales */}
          <div className="hidden sm:flex items-center gap-3 flex-none">
            <a href="http://instagram.com/sivar.music" target="_blank" rel="noopener noreferrer"
              className="text-white/35 hover:text-[#E1306C] transition" title="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
              </svg>
            </a>
            <a href="https://open.spotify.com/user/31xkfblpr6j3rclgugt5vrfwysbu" target="_blank" rel="noopener noreferrer"
              className="text-white/35 hover:text-[#1DB954] transition" title="Spotify">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </a>
            <a href="https://www.youtube.com/@sivarmusicentertainment9158" target="_blank" rel="noopener noreferrer"
              className="text-white/35 hover:text-red-500 transition" title="YouTube">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
              </svg>
            </a>
          </div>

          {/* Mi Cuenta */}
          <Link
            href="/eventos/mi-cuenta"
            className="flex-none bg-[#F472B6] hover:bg-[#ec4899] active:scale-95 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all whitespace-nowrap"
          >
            Mi Cuenta
          </Link>
        </div>

        {/* Filtros de tiempo */}
        <div className="border-t border-white/6 px-4 py-2 flex items-center gap-2 max-w-6xl mx-auto overflow-x-auto">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/25 flex-none">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {(['24h', '7d', '30d'] as const).map(f => (
            <button
              key={f}
              onClick={() => setTimeFilter(timeFilter === f ? null : f)}
              className={`flex-none text-xs font-semibold px-3 py-1 rounded-full border transition ${
                timeFilter === f
                  ? 'border-[#F472B6] bg-[#F472B6]/15 text-[#F472B6]'
                  : 'border-white/10 text-white/40 hover:text-white hover:border-white/25'
              }`}
            >
              {TIME_LABELS[f]}
            </button>
          ))}
          {(timeFilter || q) && (
            <button
              onClick={() => { setTimeFilter(null); setSearch('') }}
              className="flex-none text-white/25 hover:text-white/60 text-xs ml-1 transition"
            >
              ✕ Limpiar
            </button>
          )}
        </div>
      </header>

      {/* ── Contenido ──────────────────────────────────────── */}
      <div className="px-4 py-6 max-w-6xl mx-auto">
        {loading ? (
          <p className="text-white/30 text-sm text-center py-16">Cargando eventos...</p>
        ) : !hasResults ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-white/30 text-sm">No hay eventos para este período.</p>
            <button
              onClick={() => { setSearch(''); setTimeFilter(null) }}
              className="text-[#F472B6] text-sm hover:text-white transition"
            >
              Ver todos los eventos →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Pink Fest */}
            {showPinkFest && (
              <Link href="/pinkfest" className="group block">
                <div className="bg-white/4 border border-white/10 group-hover:border-[#F472B6]/30 rounded-2xl overflow-hidden transition h-full">
                  <div className="relative w-full aspect-[4/3]">
                    <Image src="/pinkfest/poster.jpg" alt="Pink Fest" fill className="object-cover" />
                  </div>
                  <div className="p-3 sm:p-4">
                    <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Sivar Music</p>
                    <h2 className="text-white font-bold text-sm leading-tight">Pink Fest</h2>
                    <p className="text-white/50 text-xs mt-1">sáb. 12 jul · 8:00 PM</p>
                    <p className="text-white/40 text-xs">Beerhaus · San Salvador</p>
                    <p className="text-[#F472B6] font-bold text-sm mt-2">$10</p>
                  </div>
                </div>
              </Link>
            )}

            {/* Eventos normales */}
            {filteredEvents.map(event => {
              const fecha = new Date(event.fecha)
              const isPast = fecha < now
              return (
                <Link key={event.id} href={`/eventos/${event.slug}`} className="group block">
                  <div className={`bg-white/4 border rounded-2xl overflow-hidden transition h-full ${
                    isPast ? 'border-white/8 opacity-60' : 'border-white/10 group-hover:border-[#F472B6]/30'
                  }`}>
                    <div className="relative w-full aspect-[4/3]">
                      {event.imagen_url ? (
                        <Image src={event.imagen_url} alt={event.nombre} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                          <span className="text-white/20 text-3xl">🎵</span>
                        </div>
                      )}
                      {isPast && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white/70 text-xs font-semibold bg-black/40 px-3 py-1 rounded-full">Evento pasado</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3 sm:p-4">
                      <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">
                        {event.artistas?.[0] ?? 'Sivar Music'}
                      </p>
                      <h2 className="text-white font-bold text-sm leading-tight">{event.nombre}</h2>
                      <p className="text-white/50 text-xs mt-1">
                        {fecha.toLocaleDateString('es-SV', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' · '}
                        {fecha.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-white/40 text-xs">{event.venue}</p>
                      <p className="text-[#F472B6] font-bold text-sm mt-2">${event.precio}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-center text-white/15 text-[10px] pb-8">Sivar Music Group</p>
    </div>
  )
}
