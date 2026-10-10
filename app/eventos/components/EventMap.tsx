'use client'
import { useLanguage } from '@/lib/i18n'
import { copyFor } from '../copy'
import { Icon } from './icons'

interface Props {
  lat: number
  lng: number
  venue: string
  direccion: string
}

export default function EventMap({ lat, lng, venue, direccion }: Props) {
  const { lang } = useLanguage()
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
  const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
  const osmEmbed = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.008},${lat - 0.005},${lng + 0.008},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}`

  return (
    <div className="ev-stack" style={{ ['--stack-gap' as string]: 'var(--ev-space-3)' }}>
      {/* Mapa embed */}
      <div className="ev-admin-card" style={{ overflow: 'hidden' }}>
        <iframe
          src={osmEmbed}
          width="100%"
          height="220"
          style={{ border: 0, display: 'block' }}
          loading="lazy"
          title={copyFor(lang, 'evd.mapTitle', { venue })}
        />
      </div>

      {/* Dirección */}
      <div className="ev-admin-card" style={{ padding: 'var(--ev-space-4)' }}>
        <p style={{ fontWeight: 'var(--ev-weight-semi)' }}>{venue}</p>
        {direccion && <p className="ev-subtle">{direccion}</p>}
      </div>

      {/* Botones para abrir en app */}
      <div className="ev-cluster">
        <a className="ev-btn ev-btn--secondary ev-btn--sm" href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
          <Icon name="map-pin" />Google Maps
        </a>
        <a className="ev-btn ev-btn--secondary ev-btn--sm" href={wazeUrl} target="_blank" rel="noopener noreferrer">
          <Icon name="external" />Waze
        </a>
      </div>
    </div>
  )
}
