import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/pinkfest-auth'

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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ticketEvents = (data ?? []).map(ev => ({ ...ev, kind: 'ticket' as const }))

  if (isAdmin) return NextResponse.json({ events: ticketEvents })

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
export async function POST(req: NextRequest) {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { nombre, descripcion, fecha, venue, direccion, lat, lng, imagen_url, precio, artistas, visible, max_entradas, slug } = body

  if (!nombre || !fecha || !venue || !direccion || !slug) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
      nombre, descripcion, fecha, venue, direccion,
      lat: lat || null, lng: lng || null,
      imagen_url: imagen_url || null,
      precio: Number(precio) || 10,
      artistas: artistas || [],
      visible: visible ?? false,
      max_entradas: max_entradas || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data })
}
