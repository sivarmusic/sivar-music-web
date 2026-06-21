import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/pinkfest-auth'

export async function POST(req: NextRequest) {
  const { nombre, telefono, email, cantidad } = await req.json()

  if (!nombre?.trim() || !telefono?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 })
  }

  // Recuperar orden activa existente para ese teléfono
  const { data: existing } = await supabase
    .from('pinkfest_orders')
    .select('*')
    .eq('telefono', telefono.trim())
    .in('status', ['pendiente_comprobante', 'en_revision'])
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ order: existing, recovered: true })
  }

  const { data: order, error } = await supabase
    .from('pinkfest_orders')
    .insert({
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      cantidad: Math.max(1, Math.min(20, Number(cantidad) || 1)),
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      const { data: race } = await supabase
        .from('pinkfest_orders')
        .select('*')
        .eq('telefono', telefono.trim())
        .in('status', ['pendiente_comprobante', 'en_revision'])
        .maybeSingle()
      if (race) return NextResponse.json({ order: race, recovered: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ order })
}

export async function GET() {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: orders, error } = await supabase
    .from('pinkfest_orders')
    .select('*, pinkfest_tickets(id, ticket_number, qr_token, check_in_at)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ orders })
}
