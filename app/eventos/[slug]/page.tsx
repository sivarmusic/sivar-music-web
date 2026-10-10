import type { Metadata } from 'next'
import EventClient from './EventClient'
import { getPublicEvent } from '@/lib/eventsPublic'
import { formatEventDateTime } from '@/lib/eventDate'

// El evento se lee en el servidor para que WhatsApp/Instagram/Google vean título,
// descripción e imagen. La UI interactiva sigue siendo EventClient (sin cambios).

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  let ev = null
  try { ev = await getPublicEvent(slug) } catch { /* sin DB: metadata genérica */ }

  if (!ev) {
    return { title: 'Evento — Sivar Music', robots: { index: false, follow: false } }
  }

  const title = `${ev.nombre} — Sivar Music`
  let when = ''
  try { when = formatEventDateTime(ev.fecha) } catch { /* fecha inválida */ }
  const description = clip(
    ev.descripcion?.trim() || [when, ev.venue].filter(Boolean).join(' · ') || 'Entradas disponibles en Sivar Music.',
    160,
  )
  const url = `/eventos/${ev.slug}`
  const images = ev.imagen_url ? [{ url: ev.imagen_url, alt: ev.nombre }] : undefined

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'Sivar Music', type: 'website', locale: 'es_SV', images },
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      title,
      description,
      images: images?.map(i => i.url),
    },
  }
}

export default function EventPage() {
  return <EventClient />
}
