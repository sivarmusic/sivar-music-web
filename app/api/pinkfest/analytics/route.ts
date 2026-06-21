import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/pinkfest-auth'

export async function GET() {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [visitsRes, ordersRes, dailyRes] = await Promise.all([
    supabase.from('pinkfest_visits').select('id', { count: 'exact', head: true }),
    supabase.from('pinkfest_orders').select('status, comprobante_path'),
    supabase
      .from('pinkfest_visits')
      .select('visit_date')
      .gte('visit_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('visit_date', { ascending: true }),
  ])

  const orders = ordersRes.data ?? []
  const totalOrders       = orders.length
  const withComprobante   = orders.filter(o => o.comprobante_path).length
  const confirmed         = orders.filter(o => o.status === 'confirmado').length

  // Agrupar visitas por día (últimos 7 días)
  const dailyMap: Record<string, number> = {}
  for (const row of (dailyRes.data ?? [])) {
    dailyMap[row.visit_date] = (dailyMap[row.visit_date] ?? 0) + 1
  }
  const daily = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))

  return NextResponse.json({
    visits: visitsRes.count ?? 0,
    orders: totalOrders,
    withComprobante,
    confirmed,
    daily,
  })
}
