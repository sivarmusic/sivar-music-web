import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession, verifyStaffSession } from '@/lib/staff-auth'
import { sendSafely } from '@/lib/email-safe'
import { sendTicketConfirmed } from '@/lib/email'
import { recordAudit } from '@/lib/audit'
import { ensureEventTickets } from '@/lib/eventTickets'
import { EVENT_TZ } from '@/lib/eventDate'

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

  // Quién y cuándo decidió (best-effort: requiere scripts/eventos-hardening-5.sql).
  const nowIso = new Date().toISOString()
  await recordAudit(supabase, 'event_orders', id, {
    reviewed_by: user.email ?? null,
    reviewed_at: nowIso,
    ...(status === 'confirmado' ? { confirmed_by: user.email ?? null, confirmed_at: nowIso } : {}),
  })

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
        eventDate: new Date(ev.fecha).toLocaleString('es-SV', { timeZone: EVENT_TZ, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
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

  const { data: order, error: readError } = await supabase
    .from('event_orders')
    .select('comprobante_path, status')
    .eq('id', id)
    .maybeSingle()
  if (readError) return serverError('eventos/orders/[id]', readError)

  // Las órdenes confirmadas (pagadas, con tickets) no se eliminan: se rechazan.
  if (order?.status === 'confirmado') {
    return NextResponse.json(
      { error: 'La orden está confirmada: rechazala en lugar de eliminarla (así se conserva el registro del pago).' },
      { status: 409 },
    )
  }

  if (order?.comprobante_path) {
    await supabase.storage.from('comprobantes').remove([order.comprobante_path])
  }

  const { error } = await supabase.from('event_orders').delete().eq('id', id)
  if (error) return serverError('eventos/orders/[id]', error)
  return NextResponse.json({ success: true })
}
