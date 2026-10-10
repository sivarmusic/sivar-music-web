import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { serverError } from '@/lib/api-error'
import { supabase } from '@/lib/supabase'
import { verifyStaffSession } from '@/lib/staff-auth'
import { sendSafely } from '@/lib/email-safe'
import { checkEventCapacity } from '@/lib/eventCapacity'
import { sendOrderConfirmation, sendAdminNewOrderRequest } from '@/lib/email'

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, 'orders', { limit: 30, windowSeconds: 3600 })
  if (limited) return limited

  // Autenticación requerida via Bearer token
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Se requiere autenticación' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Sesión inválida. Iniciá sesión de nuevo.' }, { status: 401 })
  }

  const { event_id, nombre, telefono, cantidad } = await req.json()
  const email = user.email!

  if (!event_id || !nombre?.trim() || !telefono?.trim()) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Verificar que el evento existe y está visible
  const { data: event } = await supabase
    .from('events')
    .select('id, nombre, slug, precio, visible, max_entradas')
    .eq('id', event_id)
    .single()

  if (!event || !event.visible) {
    return NextResponse.json({ error: 'Evento no disponible' }, { status: 404 })
  }

  // Recuperar orden activa existente del mismo usuario
  const { data: existing } = await supabase
    .from('event_orders')
    .select('*')
    .eq('event_id', event_id)
    .eq('user_id', user.id)
    .in('status', ['pendiente_comprobante', 'en_revision'])
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ order: existing, recovered: true })
  }

  const cantidadFinal = Math.max(1, Math.min(20, Number(cantidad) || 1))

  // Aforo: el servidor es la fuente de verdad. No atómico (ver eventCapacity.ts).
  const capacity = await checkEventCapacity(supabase, event_id, event.max_entradas, cantidadFinal)
  if (!capacity.ok) {
    return NextResponse.json({ error: capacity.message, remaining: capacity.remaining }, { status: 409 })
  }

  // Guardar/actualizar perfil
  await supabase.from('attendee_profiles').upsert({
    id: user.id,
    nombre: nombre.trim(),
    telefono: telefono.trim(),
  })

  const { data: order, error } = await supabase
    .from('event_orders')
    .insert({
      event_id,
      user_id: user.id,
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      email,
      cantidad: cantidadFinal,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      const { data: race } = await supabase
        .from('event_orders')
        .select('*')
        .eq('event_id', event_id)
        .eq('user_id', user.id)
        .in('status', ['pendiente_comprobante', 'en_revision'])
        .maybeSingle()
      if (race) return NextResponse.json({ order: race, recovered: true })
    }
    return serverError('eventos/orders', error)
  }

  const pagoUrl = `https://sivarmusic.com/eventos/${event.slug}/pago/${order.id}`
  const total = order.cantidad * Number(event.precio)
  void sendSafely('order_confirmation', order.order_code, () => sendOrderConfirmation({
    to: email,
    nombre: nombre.trim(),
    orderCode: order.order_code,
    eventName: event.nombre,
    cantidad: order.cantidad,
    total,
    pagoUrl,
  }))

  void sendSafely('admin_new_order', order.order_code, () => sendAdminNewOrderRequest({
    orderCode: order.order_code,
    eventName: event.nombre,
    nombre: nombre.trim(),
    telefono: telefono.trim(),
    email,
    cantidad: order.cantidad,
    total,
  }))

  return NextResponse.json({ order })
}

export async function GET(req: NextRequest) {
  const user = await verifyStaffSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('event_id')

  let query = supabase
    .from('event_orders')
    .select('*, events(nombre, slug), event_tickets(id, ticket_number, qr_token, check_in_at)')
    .order('created_at', { ascending: false })

  if (eventId) query = query.eq('event_id', eventId)

  const { data: orders, error } = await query
  if (error) return serverError('eventos/orders', error)
  return NextResponse.json({ orders })
}
