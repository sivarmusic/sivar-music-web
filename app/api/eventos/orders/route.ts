import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { serverError } from '@/lib/api-error'
import { supabase } from '@/lib/supabase'
import { verifyStaffSession } from '@/lib/staff-auth'
import { sendSafely } from '@/lib/email-safe'
import { checkEventCapacity } from '@/lib/eventCapacity'
import { parseCantidad } from '@/lib/eventValidation'
import { sendOrderConfirmation, sendAdminNewOrderRequest } from '@/lib/email'

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, 'orders', { limit: 60, windowSeconds: 3600 })
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

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  const { event_id, nombre, telefono, cantidad } = body
  const email = user.email!

  if (typeof event_id !== 'string' || typeof nombre !== 'string' || typeof telefono !== 'string'
    || !event_id || !nombre.trim() || !telefono.trim()) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }
  const cantidadFinal = parseCantidad(cantidad)
  if (cantidadFinal === null) {
    return NextResponse.json({ error: 'La cantidad debe ser un número entero entre 1 y 20' }, { status: 400 })
  }

  // Verificar que el evento existe y está visible
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, nombre, slug, precio, visible, max_entradas')
    .eq('id', event_id)
    .maybeSingle()

  // Un fallo de Supabase no es "evento no disponible": se informa como error interno.
  if (eventError) return serverError('eventos/orders', eventError)
  if (!event || !event.visible) {
    return NextResponse.json({ error: 'Evento no disponible' }, { status: 404 })
  }

  // Recuperar orden activa existente del mismo usuario
  const { data: existing, error: existingError } = await supabase
    .from('event_orders')
    .select('*')
    .eq('event_id', event_id)
    .eq('user_id', user.id)
    .in('status', ['pendiente_comprobante', 'en_revision'])
    .maybeSingle()

  // Si la consulta falla NO se asume "no existe": se podría crear una orden duplicada.
  if (existingError) return serverError('eventos/orders', existingError)

  if (existing) {
    return NextResponse.json({ order: existing, recovered: true })
  }

  // Aforo: el servidor es la fuente de verdad. No atómico (ver eventCapacity.ts).
  const capacity = await checkEventCapacity(supabase, event_id, event.max_entradas, cantidadFinal)
  if (!capacity.ok) {
    return NextResponse.json({ error: capacity.message, remaining: capacity.remaining }, { status: 409 })
  }

  // Guardar/actualizar perfil
  // Best-effort: el perfil es de conveniencia, no debe impedir la compra.
  const { error: profileError } = await supabase.from('attendee_profiles').upsert({
    id: user.id,
    nombre: nombre.trim(),
    telefono: telefono.trim(),
  })
  if (profileError) console.error('[eventos/orders] no se pudo guardar el perfil', { code: profileError.code, message: profileError.message })

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
      const { data: race, error: raceError } = await supabase
        .from('event_orders')
        .select('*')
        .eq('event_id', event_id)
        .eq('user_id', user.id)
        .in('status', ['pendiente_comprobante', 'en_revision'])
        .maybeSingle()
      if (raceError) return serverError('eventos/orders', raceError)
      if (race) return NextResponse.json({ order: race, recovered: true })
      // Otra cuenta ya tiene una solicitud activa con este teléfono para este evento.
      return NextResponse.json({
        error: 'Ya hay una solicitud activa con este teléfono para este evento. Si es tuya, revisá tu correo o escribinos a admin@sivarmusic.com.',
        code: 'phone_active',
      }, { status: 409 })
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
