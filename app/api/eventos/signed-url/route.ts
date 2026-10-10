import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { supabase } from '@/lib/supabase'
import { verifyStaffSession } from '@/lib/staff-auth'

export async function GET(req: NextRequest) {
  const user = await verifyStaffSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const path = req.nextUrl.searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'Path requerido' }, { status: 400 })

  // Solo comprobantes de eventos, sin traversal ni caracteres raros.
  const safePath =
    path.startsWith('eventos/') &&
    path.length <= 200 &&
    !path.includes('..') &&
    !path.includes('//') &&
    !/[\u0000-\u001f\u007f\\]/.test(path)
  if (!safePath) return NextResponse.json({ error: 'Path inválido' }, { status: 400 })

  const { data, error } = await supabase.storage
    .from('comprobantes')
    .createSignedUrl(path, 3600)

  if (error) return serverError('eventos/signed-url', error)

  return NextResponse.json({ url: data.signedUrl })
}
