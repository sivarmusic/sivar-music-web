import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/staff-auth'
import { validateEventFields } from '@/lib/eventValidation'
import { getEventsAvailability } from '@/lib/eventCapacity'

// GET — público lista visibles + eventos informativos de artistas; con ?admin=1 y sesión admin lista todos los eventos con venta
export async function GET(req: NextRequest) {
  const isAdmin = new URL(req.url).searchParams.get('admin') === '1'
    && !!(await verifyAdminSession())

  let query = supabase
    .from('events')
    .select('id, slug, nombre, descripcion, fecha, venue, direccion, lat, lng, imagen_url, precio, artistas, max_entradas, visible')
    .order('fecha', { ascending: true })

  if (!isAdmin) query = query.eq('visible', true)

  const { data, error } = await query
  if (error) return serverError('eventos/events', error)

  if (isAdmin) {
    return NextResponse.json({ events: (data ?? []).map(ev => ({ ...ev, kind: 'ticket' as const })) })
  }

  // Aditivo y retrocompatible: soldOut/remaining (remaining solo si quedan <= 20).
  const availability = await getEventsAvailability(supabase, data ?? [])
  const ticketEvents = (data ?? []).map(ev => ({
    ...ev,
    kind: 'ticket' as const,
    ...(availability.get(ev.id) ?? { soldOut: false, remaining: null }),
  }))

  const { data: artistEvents } = await supabase
    .from('artist_events')
    .select('id, nombre, fecha, venue, imagen_url, artist_profiles(nombre_artistico, slug)')
    .eq('status', 'aprobado')
    .order('fecha', { ascending: true })

  const infoEvents = (artistEvents ?? []).map(ev => {
    const artist = Array.isArray(ev.artist_profiles) ? ev.artist_profiles[0] : ev.artist_profiles
    return {
      id: ev.id, nombre: ev.nombre, fecha: ev.fecha, venue: ev.venue, imagen_url: ev.imagen_url,
      artistas: artist ? [artist.nombre_artistico] : [],
      artistSlug: artist?.slug ?? null,
      kind: 'info' as const,
    }
  })

  return NextResponse.json({ events: [...ticketEvents, ...infoEvents] })
}

// POST admin — crear evento
// precio: 0 es un valor válido (evento gratis, sin cobro). Solo cuando no se
// envía precio (null/ausente) se aplica el default de negocio de $10.
export const DEFAULT_PRECIO = 10

const CREATE_FIELDS = [
  'nombre', 'slug', 'descripcion', 'fecha', 'venue', 'direccion', 'lat', 'lng',
  'imagen_url', 'precio', 'artistas', 'max_entradas', 'visible',
] as const

export async function POST(req: NextRequest) {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  if (!body.nombre || !body.fecha || !body.venue || !body.direccion || !body.slug) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const parsed = validateEventFields(body, CREATE_FIELDS)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const v = parsed.values

  const { data, error } = await supabase
    .from('events')
    .insert({
      slug: v.slug,
      nombre: v.nombre,
      descripcion: v.descripcion ?? null,
      fecha: v.fecha,
      venue: v.venue,
      direccion: v.direccion ?? '',
      lat: v.lat ?? null,
      lng: v.lng ?? null,
      imagen_url: v.imagen_url ?? null,
      precio: v.precio ?? DEFAULT_PRECIO,
      artistas: v.artistas ?? [],
      visible: v.visible ?? false,
      max_entradas: v.max_entradas || null,
    })
    .select()
    .single()

  if (error) return serverError('eventos/events', error)
  return NextResponse.json({ event: data })
}
