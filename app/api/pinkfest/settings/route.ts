import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/pinkfest-auth'

const DEFAULTS = {
  venue: 'Beerhaus · San Salvador',
  descripcion: 'Todas las ganancias del evento se donan al Refugio Hogar Felino, un espacio dedicado al rescate y cuidado de gatos en situación de calle.',
  imagen_url: '/pinkfest/poster.jpg',
}

export async function GET() {
  const { data } = await supabase
    .from('pinkfest_settings')
    .select('venue, descripcion, imagen_url')
    .eq('id', 1)
    .maybeSingle()

  return NextResponse.json({
    venue: data?.venue || DEFAULTS.venue,
    descripcion: data?.descripcion || DEFAULTS.descripcion,
    imagen_url: data?.imagen_url || DEFAULTS.imagen_url,
  })
}

export async function PATCH(req: NextRequest) {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { venue, descripcion, imagen_url } = await req.json()

  const { data, error } = await supabase
    .from('pinkfest_settings')
    .upsert({ id: 1, venue, descripcion, imagen_url })
    .select('venue, descripcion, imagen_url')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
