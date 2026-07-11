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
    .from('event_orders')
    .select('*, events(nombre, slug, venue, fecha)')
    .eq('id', id)
    .single()

  if (error || !order) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
  if (order.status !== 'confirmado') return NextResponse.json({ error: 'La orden no está confirmada' }, { status: 400 })

  const ev = order.events as { nombre: string; slug: string; venue: string; fecha: string } | null
  if (!ev) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })

  await sendTicketConfirmed({
    to: order.email,
    nombre: order.nombre,
    orderCode: order.order_code,
    eventName: ev.nombre,
    eventDate: new Date(ev.fecha).toLocaleString('es-SV', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    }),
    eventVenue: ev.venue,
    verUrl: 'https://sivarmusic.com/eventos/mi-cuenta',
  })

  return NextResponse.json({ success: true })
}
