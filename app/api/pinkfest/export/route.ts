import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/pinkfest-auth'

export async function GET(req: NextRequest) {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const statusFilter = req.nextUrl.searchParams.get('status')

  let query = supabase
    .from('pinkfest_orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (statusFilter && statusFilter !== 'todas') {
    query = query.eq('status', statusFilter)
  }

  const { data: orders, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const headers = ['Código', 'Nombre', 'Teléfono', 'Correo', 'Cantidad', 'Total $', 'Estado', 'Fecha']
  const rows = (orders ?? []).map(o => [
    o.order_code,
    o.nombre,
    o.telefono,
    o.email,
    o.cantidad,
    o.cantidad * 10,
    o.status,
    new Date(o.created_at).toLocaleString('es-SV'),
  ])

  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pinkfest-ordenes-${Date.now()}.csv"`,
    },
  })
}
