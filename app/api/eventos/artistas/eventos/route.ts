import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/pinkfest-auth'
import { sendAdminNewArtistEvent } from '@/lib/email'

// GET admin — lista todos los eventos de artistas (pendientes primero)
export async function GET() {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('artist_events')
    .select('*, artist_profiles(nombre_artistico, slug)')
    .order('status', { ascending: true })
    .order('fecha', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events: data })
}

// POST artista — crear evento informativo (queda pendiente de aprobación)
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Se requiere autenticación' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

  const { data: artist } = await supabase.from('artist_profiles').select('nombre_artistico').eq('id', user.id).maybeSingle()
  if (!artist) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const { nombre, descripcion, fecha, venue, direccion, lat, lng, imagen_url, precio, max_entradas, link_externo } = body

  if (!nombre?.trim() || !fecha || !venue?.trim()) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const { data, error } = await supabase.from('artist_events').insert({
    artist_id: user.id,
    nombre: nombre.trim(),
    descripcion: descripcion?.trim() || null,
    fecha,
    venue: venue.trim(),
    direccion: direccion?.trim() || null,
    lat: lat || null,
    lng: lng || null,
    imagen_url: imagen_url || null,
    precio: precio || null,
    max_entradas: max_entradas || null,
    link_externo: link_externo?.trim() || null,
    status: 'pendiente',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  sendAdminNewArtistEvent({
    nombreArtistico: artist.nombre_artistico,
    nombreEvento: data.nombre,
    fecha: data.fecha,
    venue: data.venue,
  }).catch(() => {})

  return NextResponse.json({ event: data })
}
