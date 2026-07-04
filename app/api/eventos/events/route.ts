import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/pinkfest-auth'

// GET — público lista visibles; con ?admin=1 y sesión admin lista todos
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
  return NextResponse.json({ events: data })
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
