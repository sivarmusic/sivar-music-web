import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/pinkfest-auth'
import { buildTicketRows } from '@/lib/eventTickets'
import { sendTicketConfirmed } from '@/lib/email'

const CATEGORIAS = ['staff', 'organizacion', 'vip', 'musicos'] as const

export async function POST(req: NextRequest) {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { event_id, categoria, nombre, cantidad, telefono, email } = await req.json()

  if (!event_id || !nombre?.trim() || !email?.trim() || !CATEGORIAS.includes(categoria)) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const { data: event } = await supabase
    .from('events')
    .select('id, nombre, slug, venue, fecha')
    .eq('id', event_id)
    .single()

  if (!event) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })

  const cantidadFinal = Math.max(1, Math.min(20, Number(cantidad) || 1))

  const { data: order, error } = await supabase
    .from('event_orders')
    .insert({
      event_id,
      nombre: nombre.trim(),
      telefono: telefono?.trim() || null,
      email: email.trim(),
      cantidad: cantidadFinal,
      status: 'confirmado',
      order_type: 'cortesia',
      cortesia_categoria: categoria,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: tickets, error: ticketsError } = await supabase
    .from('event_tickets')
    .insert(buildTicketRows(order.id, order.order_code, cantidadFinal))
    .select()

  if (ticketsError) return NextResponse.json({ error: ticketsError.message }, { status: 500 })

  sendTicketConfirmed({
    to: order.email,
    nombre: order.nombre,
    orderCode: order.order_code,
    eventName: event.nombre,
    eventDate: new Date(event.fecha).toLocaleString('es-SV', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
    eventVenue: event.venue,
    verUrl: 'https://sivarmusic.com/eventos/mi-cuenta',
  }).catch(() => {})

  return NextResponse.json({ order, tickets })
}
