import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyStaffSession } from '@/lib/pinkfest-auth'
import { sendTicketConfirmed } from '@/lib/email'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyStaffSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  const { data: order, error } = await supabase
    .from('pinkfest_orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !order) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
  if (order.status !== 'confirmado') return NextResponse.json({ error: 'La orden no está confirmada' }, { status: 400 })

  await sendTicketConfirmed({
    to: order.email,
    nombre: order.nombre,
    orderCode: order.order_code,
    eventName: 'Pink Fest',
    eventDate: 'sábado, 12 de julio · 8:00 PM',
    eventVenue: 'Beerhaus · San Salvador',
    verUrl: 'https://sivarmusic.com/eventos/mi-cuenta/login',
  })

  return NextResponse.json({ success: true })
}
