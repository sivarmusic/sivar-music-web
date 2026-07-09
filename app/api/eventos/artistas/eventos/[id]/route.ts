import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/pinkfest-auth'

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

  const update: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field]
  }
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data })
}
