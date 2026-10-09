import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession, verifyStaffSession } from '@/lib/staff-auth'
import { sendSafely } from '@/lib/email-safe'
import { sendTicketConfirmed } from '@/lib/email'
import { ensureEventTickets } from '@/lib/eventTickets'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyStaffSession()
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

  if (error) return serverError('eventos/orders/[id]', error)

  let emailSent: boolean | undefined

  if (status === 'confirmado') {
    // Idempotente: confirmar dos veces o reintentar no duplica entradas.
    const { error: ticketsError } = await ensureEventTickets(supabase, id, data.order_code, data.cantidad)
    if (ticketsError) {
      return NextResponse.json({ error: 'No se pudieron generar las entradas. Reintentá confirmar.' }, { status: 500 })
    }

    // Enviar email de confirmación al comprador
    const ev = data.events as { nombre: string; slug: string; venue: string; fecha: string } | null
    if (ev) {
      const verUrl = `https://sivarmusic.com/eventos/mi-cuenta`
      emailSent = await sendSafely('ticket_confirmed', data.order_code, () => sendTicketConfirmed({
        to: data.email,
        nombre: data.nombre,
        orderCode: data.order_code,
        eventName: ev.nombre,
        eventDate: new Date(ev.fecha).toLocaleString('es-SV', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
        eventVenue: ev.venue,
        verUrl,
      }))
    }
  }

  return NextResponse.json({ order: data, ...(emailSent !== undefined ? { emailSent } : {}) })
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
  if (error) return serverError('eventos/orders/[id]', error)
  return NextResponse.json({ success: true })
}
