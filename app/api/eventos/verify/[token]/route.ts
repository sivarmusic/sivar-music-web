import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { supabase } from '@/lib/supabase'
import { verifyStaffSession } from '@/lib/staff-auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Solo staff: la pantalla de verificación vive en el admin y el GET devuelve
  // nombre del comprador y tipo de entrada.
  const user = await verifyStaffSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { token } = await params

  const { data: ticket, error } = await supabase
    .from('event_tickets')
    .select('id, ticket_number, check_in_at, event_orders(order_code, nombre, cantidad, status, order_type, cortesia_categoria, events(nombre, fecha))')
    .eq('qr_token', token)
    .maybeSingle()

  if (error) return serverError('eventos/verify/[token]', error)
  if (!ticket) return NextResponse.json({ error: 'Entrada no válida' }, { status: 404 })

  const order = ticket.event_orders as unknown as {
    order_code: string; nombre: string; cantidad: number; status: string
    order_type: string; cortesia_categoria: string | null
    events: { nombre: string; fecha: string | null } | null
  }

  if (order.status !== 'confirmado') {
    return NextResponse.json({ error: 'Entrada no confirmada', status: order.status }, { status: 400 })
  }

  return NextResponse.json({
    ticket: {
      order_code: order.order_code,
      nombre: order.nombre,
      cantidad: order.cantidad,
      evento: order.events?.nombre ?? '',
      evento_fecha: order.events?.fecha ?? null,
      ticket_number: ticket.ticket_number,
      check_in_at: ticket.check_in_at,
      order_type: order.order_type,
      cortesia_categoria: order.cortesia_categoria,
    },
  })
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const user = await verifyStaffSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { token } = await params

  const { data: ticket } = await supabase
    .from('event_tickets')
    .select('id, check_in_at, event_orders(status)')
    .eq('qr_token', token)
    .maybeSingle()

  if (!ticket) return NextResponse.json({ error: 'Entrada no válida' }, { status: 404 })

  const order = ticket.event_orders as unknown as { status: string }
  if (order.status !== 'confirmado') return NextResponse.json({ error: 'Entrada no confirmada' }, { status: 400 })
  if (ticket.check_in_at) {
    return NextResponse.json({ error: 'Ya ingresó', alreadyUsed: true, check_in_at: ticket.check_in_at }, { status: 409 })
  }

  // Check-in atómico: UPDATE condicional. Si dos escáneres coinciden, solo uno
  // recibe fila de vuelta; el otro cae en "ya ingresó".
  const { data: updated, error: updateError } = await supabase
    .from('event_tickets')
    .update({ check_in_at: new Date().toISOString() })
    .eq('id', ticket.id)
    .is('check_in_at', null)
    .select('id')

  if (updateError) return NextResponse.json({ error: 'No se pudo registrar el ingreso' }, { status: 500 })

  if (!updated || updated.length === 0) {
    const { data: current } = await supabase
      .from('event_tickets')
      .select('check_in_at')
      .eq('id', ticket.id)
      .maybeSingle()
    return NextResponse.json(
      { error: 'Ya ingresó', alreadyUsed: true, check_in_at: current?.check_in_at ?? null },
      { status: 409 },
    )
  }

  return NextResponse.json({ success: true })
}
