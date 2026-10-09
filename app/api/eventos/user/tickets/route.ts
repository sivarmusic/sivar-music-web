import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

  // Solo se cruza por email si el correo está verificado; sin eso, solo por user_id.
  const emailVerified = !!user.email_confirmed_at && !!user.email

  // Órdenes de eventos — por user_id, o también por email si el correo está verificado
  const { data } = await supabase
    .from('event_orders')
    .select('*, events(nombre, slug, fecha, venue, imagen_url), event_tickets(id, ticket_number, qr_token, check_in_at)')
    .or(emailVerified ? `user_id.eq.${user.id},email.eq.${user.email}` : `user_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  const eventOrders = data ?? []

  // Auto-vincular órdenes de eventos sin user_id
  const unlinked = emailVerified ? eventOrders.filter(o => !o.user_id) : []
  if (unlinked.length > 0) {
    await supabase
      .from('event_orders')
      .update({ user_id: user.id })
      .in('id', unlinked.map(o => o.id))
  }

  return NextResponse.json({ orders: eventOrders })
}
