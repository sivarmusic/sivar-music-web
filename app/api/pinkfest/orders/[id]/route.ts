import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/pinkfest-auth'
import crypto from 'crypto'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const { status, rechazo_motivo } = await req.json()

  if (!['confirmado', 'rechazado'].includes(status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('pinkfest_orders')
    .update({ status, rechazo_motivo: rechazo_motivo || null })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Al confirmar: generar un ticket (con QR) por cada entrada, si no existen ya
  if (status === 'confirmado') {
    const { count } = await supabase
      .from('pinkfest_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', id)

    if (!count) {
      const tickets = Array.from({ length: data.cantidad }, (_, i) => ({
        order_id: id,
        order_code: data.order_code,
        ticket_number: i + 1,
        qr_token: crypto.randomUUID(),
      }))
      await supabase.from('pinkfest_tickets').insert(tickets)
    }
  }

  return NextResponse.json({ order: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  // Borrar comprobante del Storage si existe
  const { data: order } = await supabase
    .from('pinkfest_orders')
    .select('comprobante_path')
    .eq('id', id)
    .single()

  if (order?.comprobante_path) {
    await supabase.storage.from('comprobantes').remove([order.comprobante_path])
  }

  // Los tickets se borran solos por ON DELETE CASCADE
  const { error } = await supabase.from('pinkfest_orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
