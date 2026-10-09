import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { supabase } from '@/lib/supabase'
import { validateEventFields } from '@/lib/eventValidation'
import { verifyAdminSession } from '@/lib/staff-auth'

const EDITABLE_FIELDS = [
  'nombre', 'descripcion', 'fecha', 'venue', 'direccion',
  'lat', 'lng', 'imagen_url', 'precio', 'max_entradas', 'link_externo',
] as const

// PATCH admin — editar campos y/o aprobar o rechazar un evento de artista
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const parsed = validateEventFields(body ?? {}, EDITABLE_FIELDS)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const update: Record<string, unknown> = { ...parsed.values }
  if ('status' in body) {
    if (!['aprobado', 'rechazado', 'pendiente'].includes(body.status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }
    update.status = body.status
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })
  }

  const { data, error } = await supabase.from('artist_events').update(update).eq('id', id).select().single()
  if (error) return serverError('eventos/artistas/eventos/[id]', error)
  return NextResponse.json({ event: data })
}
