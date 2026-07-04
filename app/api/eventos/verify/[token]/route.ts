import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/pinkfest-auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const { data: ticket, error } = await supabase
    .from('event_tickets')
    .select('id, ticket_number, check_in_at, event_orders(order_code, nombre, cantidad, status, events(nombre))')
    .eq('qr_token', token)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!ticket) return NextResponse.json({ error: 'Entrada no válida' }, { status: 404 })

  const order = ticket.event_orders as unknown as {
    order_code: string; nombre: string; cantidad: number; status: string
    events: { nombre: string } | null
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
      ticket_number: ticket.ticket_number,
      check_in_at: ticket.check_in_at,
    },
  })
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const user = await verifyAdminSession()
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
  if (ticket.check_in_at) return NextResponse.json({ error: 'Ya ingresó', alreadyUsed: true }, { status: 409 })

  await supabase
    .from('event_tickets')
    .update({ check_in_at: new Date().toISOString() })
    .eq('id', ticket.id)

  return NextResponse.json({ success: true })
}
