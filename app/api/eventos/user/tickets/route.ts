import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

  // Buscar por user_id O por email para agarrar órdenes creadas antes de tener cuenta
  const { data: orders, error } = await supabase
    .from('event_orders')
    .select('*, events(nombre, slug, fecha, venue, imagen_url), event_tickets(id, ticket_number, qr_token, check_in_at)')
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Vincular automáticamente órdenes huérfanas a esta cuenta
  const unlinked = (orders ?? []).filter(o => !o.user_id)
  if (unlinked.length > 0) {
    await supabase
      .from('event_orders')
      .update({ user_id: user.id })
      .in('id', unlinked.map(o => o.id))
  }

  return NextResponse.json({ orders })
}
