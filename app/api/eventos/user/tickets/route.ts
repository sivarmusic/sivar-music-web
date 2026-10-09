import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

  // Solo por user_id: el email de la cuenta no está verificado, así que nunca
  // se cruza ni se auto-vincula por coincidencia de correo.
  const { data } = await supabase
    .from('event_orders')
    .select('*, events(nombre, slug, fecha, venue, imagen_url), event_tickets(id, ticket_number, qr_token, check_in_at)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const eventOrders = data ?? []

  return NextResponse.json({ orders: eventOrders })
}
