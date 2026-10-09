import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/staff-auth'
import { sendSafely } from '@/lib/email-safe'
import { sendAbandonedCartReminder } from '@/lib/email'

// Recordar compras que quedaron sin comprobante después de este tiempo
const STALE_AFTER_MS = 3 * 60 * 60 * 1000 // 3 horas

async function isAuthorized(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) return true
  return !!(await verifyAdminSession())
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - STALE_AFTER_MS).toISOString()
  let sent = 0

  // Eventos genéricos
  const { data: eventOrders } = await supabase
    .from('event_orders')
    .select('id, order_code, nombre, email, created_at, events(nombre, slug)')
    .eq('status', 'pendiente_comprobante')
    .is('reminder_sent_at', null)
    .lt('created_at', cutoff)

  for (const order of eventOrders ?? []) {
    const ev = order.events as unknown as { nombre: string; slug: string } | null
    if (!ev) continue
    const pagoUrl = `https://sivarmusic.com/eventos/${ev.slug}/pago/${order.id}`
    const ok = await sendSafely('abandoned_cart', order.order_code, () => sendAbandonedCartReminder({
      to: order.email, nombre: order.nombre, orderCode: order.order_code,
      eventName: ev.nombre, pagoUrl,
    }))
    if (!ok) continue
    await supabase.from('event_orders').update({ reminder_sent_at: new Date().toISOString() }).eq('id', order.id)
    sent++
  }

  return NextResponse.json({ sent })
}
