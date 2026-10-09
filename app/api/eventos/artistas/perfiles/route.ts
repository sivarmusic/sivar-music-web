import { NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/staff-auth'

// GET admin — lista todos los perfiles de artistas aprobados
export async function GET() {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('artist_profiles')
    .select('*')
    .order('nombre_artistico', { ascending: true })

  if (error) return serverError('eventos/artistas/perfiles', error)
  return NextResponse.json({ profiles: data })
}
