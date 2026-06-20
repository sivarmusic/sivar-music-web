import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/pinkfest-auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const { data: order, error } = await supabase
    .from('pinkfest_orders')
    .select('order_code, nombre, cantidad, status, check_in_at')
    .eq('qr_token', token)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!order) return NextResponse.json({ error: 'Entrada no válida' }, { status: 404 })
  if (order.status !== 'confirmado') {
    return NextResponse.json({ error: 'Esta entrada no está confirmada', status: order.status }, { status: 400 })
  }

  return NextResponse.json({ order })
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { token } = await params

  const { data: order } = await supabase
    .from('pinkfest_orders')
    .select('id, check_in_at, status')
    .eq('qr_token', token)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'Entrada no válida' }, { status: 404 })
  if (order.status !== 'confirmado') return NextResponse.json({ error: 'Entrada no confirmada' }, { status: 400 })
  if (order.check_in_at) return NextResponse.json({ error: 'Ya ingresó', alreadyUsed: true }, { status: 409 })

  await supabase
    .from('pinkfest_orders')
    .update({ check_in_at: new Date().toISOString() })
    .eq('id', order.id)

  return NextResponse.json({ success: true })
}
