import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

  const [eventRes, pfRes] = await Promise.all([
    // Órdenes de eventos normales — por user_id o email
    supabase
      .from('event_orders')
      .select('*, events(nombre, slug, fecha, venue, imagen_url), event_tickets(id, ticket_number, qr_token, check_in_at)')
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .order('created_at', { ascending: false }),

    // Órdenes de Pink Fest — siempre por email
    supabase
      .from('pinkfest_orders')
      .select('*, pinkfest_tickets(id, ticket_number, qr_token, check_in_at)')
      .eq('email', user.email)
      .order('created_at', { ascending: false }),
  ])

  const eventOrders = eventRes.data ?? []

  // Normalizar órdenes de Pink Fest al mismo formato
  const pfOrders = (pfRes.data ?? []).map(o => ({
    ...o,
    events: {
      nombre: 'Pink Fest',
      fecha: '2026-07-12T20:00:00',
      venue: 'Beerhaus · San Salvador',
      slug: null,
      imagen_url: '/pinkfest/poster.jpg',
    },
    event_tickets: o.pinkfest_tickets ?? [],
  }))

  // Auto-vincular órdenes de eventos sin user_id
  const unlinked = eventOrders.filter(o => !o.user_id)
  if (unlinked.length > 0) {
    await supabase
      .from('event_orders')
      .update({ user_id: user.id })
      .in('id', unlinked.map(o => o.id))
  }

  const orders = [...eventOrders, ...pfOrders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({ orders })
}
