import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession, verifyStaffSession } from '@/lib/staff-auth'
import { sendSafely } from '@/lib/email-safe'
import { sendTicketConfirmed } from '@/lib/email'
import { recordAudit } from '@/lib/audit'
import { ensureEventTickets } from '@/lib/eventTickets'
import { checkEventCapacity } from '@/lib/eventCapacity'

// Máquina de estados de la revisión manual (decisión de staff):
//   en_revision           -> confirmado | rechazado
//   pendiente_comprobante -> rechazado            (confirmar sin comprobante NO está permitido)
//   rechazado             -> confirmado (re-chequea cupo) | rechazado (actualiza motivo)
//   confirmado            -> rechazado (anulación) | confirmado (reintento idempotente: solo
//                            asegura tickets, no reenvía correo; para eso está "reenviar")
const ALLOWED: Record<string, readonly string[]> = {
  en_revision: ['confirmado', 'rechazado'],
  pendiente_comprobante: ['rechazado'],
  rechazado: ['confirmado', 'rechazado'],
  confirmado: ['confirmado', 'rechazado'],
}
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

  const { data: current, error: currentError } = await supabase
    .from('event_orders')
    .select('status, event_id, cantidad, events(max_entradas)')
    .eq('id', id)
    .maybeSingle()
  if (currentError) return serverError('eventos/orders/[id]', currentError)
  if (!current) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })

  if (!(ALLOWED[current.status] ?? []).includes(status)) {
    const msg = current.status === 'pendiente_comprobante' && status === 'confirmado'
      ? 'La orden todavía no tiene comprobante: no se puede confirmar.'
      : `No se puede pasar una orden de "${current.status}" a "${status}".`
    return NextResponse.json({ error: msg }, { status: 409 })
  }

  const wasConfirmed = current.status === 'confirmado'

  // Reconfirmar una rechazada vuelve a ocupar cupo: se re-chequea.
  if (status === 'confirmado' && current.status === 'rechazado') {
    const ev = current.events as unknown as { max_entradas: number | null } | null
    const capacity = await checkEventCapacity(supabase, current.event_id, ev?.max_entradas, current.cantidad)
    if (!capacity.ok) {
      return NextResponse.json({ error: capacity.message, remaining: capacity.remaining }, { status: 409 })
    }
  }

  // Update condicional al estado leído: si otro staff decidió en paralelo, no se pisa.
  const { data, error } = await supabase
    .from('event_orders')
    .update({ status, rechazo_motivo: status === 'rechazado' ? (rechazo_motivo || null) : null })
    .eq('id', id)
    .eq('status', current.status)
    .select('*, events(nombre, slug, venue, fecha)')
    .maybeSingle()

  if (error) return serverError('eventos/orders/[id]', error)
  if (!data) {
    return NextResponse.json({ error: 'La orden cambió de estado mientras la revisabas. Recargá la lista.' }, { status: 409 })
  }

  // Quién y cuándo decidió (best-effort: requiere scripts/eventos-hardening-5.sql).
  const nowIso = new Date().toISOString()
  if (!(wasConfirmed && status === 'confirmado')) {
    await recordAudit(supabase, 'event_orders', id, {
      reviewed_by: user.email ?? null,
      reviewed_at: nowIso,
      ...(status === 'confirmado' ? { confirmed_by: user.email ?? null, confirmed_at: nowIso } : {}),
    })
  }

  let emailSent: boolean | undefined

  if (status === 'confirmado') {
    // Idempotente: confirmar dos veces o reintentar no duplica entradas.
    const { error: ticketsError } = await ensureEventTickets(supabase, id, data.order_code, data.cantidad)
    if (ticketsError) {
      return NextResponse.json({ error: 'No se pudieron generar las entradas. Reintentá confirmar.' }, { status: 500 })
    }

    // Enviar email de confirmación al comprador
    const ev = data.events as { nombre: string; slug: string; venue: string; fecha: string } | null
    // Reintento sobre una orden ya confirmada: solo se aseguran los tickets.
    if (ev && !wasConfirmed) {
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

  return NextResponse.json({
    order: data,
    ...(emailSent !== undefined ? { emailSent } : {}),
    ...(wasConfirmed && status === 'confirmado' ? { alreadyConfirmed: true } : {}),
  })
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
