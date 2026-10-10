import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { supabase } from '@/lib/supabase'
import { validateEventFields } from '@/lib/eventValidation'
import { verifyAdminSession } from '@/lib/staff-auth'
import { getPublicEvent } from '@/lib/eventsPublic'

// Allowlist: nunca se pasa el body completo a update().
const EDITABLE_FIELDS = [
  'nombre', 'slug', 'descripcion', 'fecha', 'venue', 'direccion', 'lat', 'lng',
  'precio', 'artistas', 'max_entradas', 'visible', 'imagen_url',
] as const

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  const isAdmin = !!(await verifyAdminSession())

  // Público: misma capa que generateMetadata (solo visibles, columnas acotadas).
  // Admin (sesión válida): ve todo, incluidos eventos ocultos.
  if (!isAdmin) {
    const ev = await getPublicEvent(id)
    if (!ev) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    return NextResponse.json({ event: ev })
  }

  const query = supabase.from('events').select('*')
  const { data, error } = await (isUuid
    ? query.or(`id.eq.${id},slug.eq.${id}`)
    : query.eq('slug', id)
  ).single()

  if (error || !data) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
  return NextResponse.json({ event: data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const parsed = validateEventFields(body, EDITABLE_FIELDS)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  // Columnas NOT NULL: nunca escribir null.
  if ('direccion' in parsed.values && parsed.values.direccion === null) parsed.values.direccion = ''
  if (parsed.values.precio === null) delete parsed.values.precio
  if (Object.keys(parsed.values).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('events')
    .update(parsed.values)
    .eq('id', id)
    .select()
    .single()

  if (error) return serverError('eventos/events/[id]', error)
  return NextResponse.json({ event: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  // Borrar un evento elimina en cascada sus órdenes y tickets: no se permite si
  // ya hay entradas confirmadas (dinero cobrado). Ocultarlo es lo correcto.
  const { count, error: countError } = await supabase
    .from('event_orders')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', id)
    .eq('status', 'confirmado')
  if (countError) return serverError('eventos/events/[id]', countError)
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Tiene órdenes confirmadas: ocultalo en lugar de eliminarlo.' },
      { status: 409 },
    )
  }

  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return serverError('eventos/events/[id]', error)
  return NextResponse.json({ success: true })
}
