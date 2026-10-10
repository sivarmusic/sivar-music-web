import { supabase } from '@/lib/supabase'

// Capa de lectura pública de eventos: la comparten la API (/api/eventos/events/[id])
// y generateMetadata de /eventos/[slug], para que ambos expongan lo mismo.

export const PUBLIC_EVENT_COLUMNS =
  'id, slug, nombre, descripcion, fecha, venue, direccion, lat, lng, imagen_url, precio, artistas, max_entradas, visible'

export type PublicEvent = {
  id: string; slug: string; nombre: string; descripcion: string | null
  fecha: string; venue: string; direccion: string | null
  lat: number | null; lng: number | null; imagen_url: string | null
  precio: number; artistas: string[] | null; max_entradas: number | null; visible: boolean
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Evento visible por slug o UUID; null si no existe, está oculto o hay error. */
export async function getPublicEvent(idOrSlug: string): Promise<PublicEvent | null> {
  const base = supabase.from('events').select(PUBLIC_EVENT_COLUMNS).eq('visible', true)
  const { data, error } = await (UUID_RE.test(idOrSlug)
    ? base.or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
    : base.eq('slug', idOrSlug)
  ).maybeSingle()
  if (error || !data) return null
  return data as unknown as PublicEvent
}

export type SitemapEvent = { slug: string; updated: string | null }

/** Slugs de eventos visibles para el sitemap. */
export async function listVisibleEventSlugs(): Promise<SitemapEvent[]> {
  const { data, error } = await supabase.from('events').select('slug, fecha').eq('visible', true)
  if (error || !data) return []
  return data.map(e => ({ slug: e.slug as string, updated: (e.fecha as string | null) ?? null }))
}
