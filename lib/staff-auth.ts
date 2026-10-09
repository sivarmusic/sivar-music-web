import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export type StaffRole = 'admin' | 'verificador'

async function getSessionUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('pf_admin_token')?.value
  if (!token) return null

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: { user }, error } = await client.auth.getUser(token)
  if (error || !user) return null
  return user
}

function getRole(user: { app_metadata?: Record<string, unknown> }): StaffRole | null {
  const role = user.app_metadata?.role
  return role === 'admin' || role === 'verificador' ? role : null
}

// Solo cuentas con role: 'admin' en app_metadata — crear/editar/borrar eventos, cortesías, artistas, etc.
export async function verifyAdminSession() {
  const user = await getSessionUser()
  if (!user || getRole(user) !== 'admin') return null
  return user
}

// Cuentas 'admin' o 'verificador' — ver/confirmar solicitudes de entrada y verificar ingreso
export async function verifyStaffSession() {
  const user = await getSessionUser()
  if (!user || !getRole(user)) return null
  return user
}

export async function getSessionRole(): Promise<{ email: string; role: StaffRole } | null> {
  const user = await getSessionUser()
  if (!user) return null
  const role = getRole(user)
  if (!role) return null
  return { email: user.email!, role }
}
