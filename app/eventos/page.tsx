'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Event {
  id: string
  slug: string
  nombre: string
  descripcion: string
  fecha: string
  venue: string
  direccion: string
  imagen_url: string | null
  precio: number
  artistas: string[]
}

export default function EventosPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/eventos/events')
      .then(r => r.json())
      .then(d => { setEvents(d.events ?? []); setLoading(false) })
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      {/* Header */}
      <div className="border-b border-white/8 px-5 py-5 flex items-center justify-between">
        <div>
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.25em] uppercase">Sivar Music</p>
          <h1 className="text-white text-xl font-bold">Eventos</h1>
        </div>
        <Link
          href="/eventos/mi-cuenta"
          className="text-white/40 hover:text-white text-xs uppercase tracking-wider transition"
        >
          Mi cuenta →
        </Link>
      </div>

      <div className="px-5 py-6 max-w-lg mx-auto space-y-4">
        {/* Pink Fest — tarjeta fija */}
        <Link href="/pinkfest">
          <div className="bg-white/4 border border-white/10 hover:border-[#F472B6]/30 hover:bg-white/6 rounded-2xl overflow-hidden transition">
            <div className="relative h-44 w-full">
              <Image src="/pinkfest/poster.jpg" alt="Pink Fest" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0008]/80 via-transparent to-transparent" />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-white font-bold text-base leading-tight">Pink Fest</h2>
                <span className="text-[#F472B6] font-bold text-sm flex-none">$10</span>
              </div>
              <p className="text-white/50 text-xs mb-1">sáb. 12 jul · 8:00 PM</p>
              <p className="text-white/40 text-xs">Beerhaus · San Salvador</p>
              <p className="text-white/30 text-xs mt-2">Vanessa García · Jazay · Danie</p>
            </div>
          </div>
        </Link>

        {loading ? (
          <p className="text-white/30 text-sm text-center py-8">Cargando eventos...</p>
        ) : events.length === 0 ? null : (
          events.map(event => {
            const fecha = new Date(event.fecha)
            const isPast = fecha < new Date()
            return (
              <Link key={event.id} href={`/eventos/${event.slug}`}>
                <div className={`bg-white/4 border rounded-2xl overflow-hidden hover:bg-white/6 transition ${isPast ? 'border-white/8 opacity-60' : 'border-white/10 hover:border-[#F472B6]/30'}`}>
                  {event.imagen_url && (
                    <div className="relative h-44 w-full">
                      <Image src={event.imagen_url} alt={event.nombre} fill className="object-cover" />
                      {isPast && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white/70 text-sm font-semibold bg-black/40 px-3 py-1 rounded-full">Evento pasado</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h2 className="text-white font-bold text-base leading-tight">{event.nombre}</h2>
                      <span className="text-[#F472B6] font-bold text-sm flex-none">${event.precio}</span>
                    </div>
                    <p className="text-white/50 text-xs mb-1">
                      {fecha.toLocaleDateString('es-SV', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' · '}
                      {fecha.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-white/40 text-xs">{event.venue}</p>
                    {event.artistas?.length > 0 && (
                      <p className="text-white/30 text-xs mt-2">{event.artistas.join(' · ')}</p>
                    )}
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>

      <p className="text-center text-white/15 text-[10px] pb-8">Sivar Music Group</p>
    </div>
  )
}
