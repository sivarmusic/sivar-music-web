import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { supabase } from '@/lib/supabase'
import { validateEventFields } from '@/lib/eventValidation'
import { verifyAdminSession } from '@/lib/staff-auth'
import { sendSafely } from '@/lib/email-safe'
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

  if (error) return serverError('eventos/artistas/eventos', error)
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

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  if (!body.nombre?.toString().trim() || !body.fecha || !body.venue?.toString().trim()) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const parsed = validateEventFields(body, ['nombre', 'descripcion', 'fecha', 'venue', 'direccion', 'lat', 'lng', 'imagen_url', 'precio', 'max_entradas', 'link_externo'])
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const v = parsed.values

  const { data, error } = await supabase.from('artist_events').insert({
    artist_id: user.id,
    nombre: v.nombre,
    descripcion: v.descripcion ?? null,
    fecha: v.fecha,
    venue: v.venue,
    direccion: v.direccion ?? null,
    lat: v.lat ?? null,
    lng: v.lng ?? null,
    imagen_url: v.imagen_url ?? null,
    precio: v.precio ?? null,
    max_entradas: v.max_entradas ?? null,
    link_externo: v.link_externo ?? null,
    status: 'pendiente',
  }).select().single()

  if (error) return serverError('eventos/artistas/eventos', error)

  void sendSafely('admin_artist_event', data.id, () => sendAdminNewArtistEvent({
    nombreArtistico: artist.nombre_artistico,
    nombreEvento: data.nombre,
    fecha: data.fecha,
    venue: data.venue,
  }))

  return NextResponse.json({ event: data })
}
