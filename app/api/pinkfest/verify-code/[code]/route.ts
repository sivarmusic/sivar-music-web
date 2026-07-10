import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET — buscar una orden por su código (ej: PF-0024) para verificación manual
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const orderCode = decodeURIComponent(code).trim().toUpperCase()

  const { data: order, error } = await supabase
    .from('pinkfest_orders')
    .select('order_code, nombre, cantidad, status, pinkfest_tickets(ticket_number, qr_token, check_in_at)')
    .eq('order_code', orderCode)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!order) return NextResponse.json({ error: 'Código no encontrado' }, { status: 404 })
  if (order.status !== 'confirmado') {
    return NextResponse.json({ error: 'Esta orden todavía no está confirmada', status: order.status }, { status: 400 })
  }

  const tickets = (order.pinkfest_tickets ?? []).sort((a, b) => a.ticket_number - b.ticket_number)
  if (tickets.length === 0) {
    return NextResponse.json({ error: 'Esta orden no tiene entradas generadas todavía' }, { status: 404 })
  }

  return NextResponse.json({
    order_code: order.order_code,
    nombre: order.nombre,
    cantidad: order.cantidad,
    tickets: tickets.map(t => ({ ticket_number: t.ticket_number, qr_token: t.qr_token, check_in_at: t.check_in_at })),
  })
}
