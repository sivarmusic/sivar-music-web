'use client'

interface Props {
  lat: number
  lng: number
  venue: string
  direccion: string
}

export default function EventMap({ lat, lng, venue, direccion }: Props) {
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
  const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
  const osmEmbed = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.008},${lat - 0.005},${lng + 0.008},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}`

  return (
    <div className="space-y-3">
      {/* Mapa embed */}
      <div className="rounded-2xl overflow-hidden border border-white/10">
        <iframe
          src={osmEmbed}
          width="100%"
          height="200"
          style={{ border: 0, display: 'block' }}
          loading="lazy"
          title={`Mapa — ${venue}`}
        />
      </div>

      {/* Dirección */}
      <div className="bg-white/5 border border-white/8 rounded-2xl px-4 py-3">
        <p className="text-white/90 text-sm font-semibold">{venue}</p>
        <p className="text-white/45 text-xs mt-0.5">{direccion}</p>
      </div>

      {/* Botones para abrir en app */}
      <div className="grid grid-cols-2 gap-2">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-white/6 hover:bg-white/10 border border-white/10 rounded-2xl py-3 text-white/70 hover:text-white text-sm font-medium transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          Google Maps
        </a>
        <a
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-[#09d3ac]/10 hover:bg-[#09d3ac]/20 border border-[#09d3ac]/20 rounded-2xl py-3 text-[#09d3ac] hover:text-[#09d3ac] text-sm font-medium transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
          </svg>
          Waze
        </a>
      </div>
    </div>
  )
}
