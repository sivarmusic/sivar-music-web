import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/pinkfest-auth'
import { sendTicketConfirmed } from '@/lib/email'
import { buildTicketRows } from '@/lib/eventTickets'

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
    .from('event_orders')
    .update({ status, rechazo_motivo: rechazo_motivo || null })
    .eq('id', id)
    .select('*, events(nombre, slug, venue, fecha)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (status === 'confirmado') {
    const { count } = await supabase
      .from('event_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', id)

    if (!count) {
      await supabase.from('event_tickets').insert(buildTicketRows(id, data.order_code, data.cantidad))
    }

    // Enviar email de confirmación al comprador
    const ev = data.events as { nombre: string; slug: string; venue: string; fecha: string } | null
    if (ev) {
      const verUrl = `https://sivarmusic.com/eventos/mi-cuenta`
      sendTicketConfirmed({
        to: data.email,
        nombre: data.nombre,
        orderCode: data.order_code,
        eventName: ev.nombre,
        eventDate: new Date(ev.fecha).toLocaleString('es-SV', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
        eventVenue: ev.venue,
        verUrl,
      }).catch(() => {})
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

  const { data: order } = await supabase
    .from('event_orders')
    .select('comprobante_path')
    .eq('id', id)
    .single()

  if (order?.comprobante_path) {
    await supabase.storage.from('comprobantes').remove([order.comprobante_path])
  }

  const { error } = await supabase.from('event_orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
