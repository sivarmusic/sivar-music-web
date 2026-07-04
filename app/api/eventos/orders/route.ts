import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/pinkfest-auth'
import { sendOrderConfirmation } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { event_id, nombre, telefono, email, cantidad, password } = await req.json()

  if (!event_id || !nombre?.trim() || !telefono?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Verificar que el evento existe y está visible
  const { data: event } = await supabase
    .from('events')
    .select('id, nombre, slug, precio, visible')
    .eq('id', event_id)
    .single()

  if (!event || !event.visible) {
    return NextResponse.json({ error: 'Evento no disponible' }, { status: 404 })
  }

  // Recuperar orden activa existente (mismo teléfono + evento)
  const { data: existing } = await supabase
    .from('event_orders')
    .select('*')
    .eq('event_id', event_id)
    .eq('telefono', telefono.trim())
    .in('status', ['pendiente_comprobante', 'en_revision'])
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ order: existing, recovered: true })
  }

  // Crear cuenta de asistente si viene contraseña
  let user_id: string | null = null
  if (password && password.length >= 6) {
    const { data: authData } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      user_metadata: { nombre: nombre.trim() },
      email_confirm: true,
    })
    if (authData?.user) {
      user_id = authData.user.id
      await supabase.from('attendee_profiles').upsert({
        id: authData.user.id,
        nombre: nombre.trim(),
        telefono: telefono.trim(),
      })
    }
  }

  const { data: order, error } = await supabase
    .from('event_orders')
    .insert({
      event_id,
      user_id,
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
        .from('event_orders')
        .select('*')
        .eq('event_id', event_id)
        .eq('telefono', telefono.trim())
        .in('status', ['pendiente_comprobante', 'en_revision'])
        .maybeSingle()
      if (race) return NextResponse.json({ order: race, recovered: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Enviar email de confirmación
  const pagoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'https://sivarmusic.com' : 'http://localhost:3000'}/eventos/${event.slug}/pago/${order.id}`
  sendOrderConfirmation({
    to: email.trim(),
    nombre: nombre.trim(),
    orderCode: order.order_code,
    eventName: event.nombre,
    cantidad: order.cantidad,
    total: order.cantidad * Number(event.precio),
    pagoUrl,
  }).catch(() => {})

  return NextResponse.json({ order })
}

export async function GET(req: NextRequest) {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('event_id')

  let query = supabase
    .from('event_orders')
    .select('*, events(nombre, slug), event_tickets(id, ticket_number, qr_token, check_in_at)')
    .order('created_at', { ascending: false })

  if (eventId) query = query.eq('event_id', eventId)

  const { data: orders, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders })
}
