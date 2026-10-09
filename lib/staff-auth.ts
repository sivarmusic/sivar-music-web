import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export type StaffRole = 'admin' | 'verificador'

export const ACCESS_COOKIE = 'pf_admin_token'
export const REFRESH_COOKIE = 'pf_admin_refresh'
export const STAFF_SESSION_MAX_AGE = 60 * 60 * 8

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

// Renueva la sesión con el refresh token cuando el access token venció.
// Solo se intenta si podemos persistir las cookies nuevas (route handlers):
// el refresh token rota, y rotarlo sin guardarlo dejaría la sesión inservible.
async function tryRefresh(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value
  if (!refreshToken) return null

  // En Server Components cookies().set lanza: ahí no refrescamos (devuelve null como antes).
  try {
    cookieStore.set(REFRESH_COOKIE, refreshToken, refreshCookieOptions())
  } catch {
    return null
  }

  const { data, error } = await anonClient().auth.refreshSession({ refresh_token: refreshToken })
  if (error || !data.session || !data.user) {
    try { cookieStore.delete(REFRESH_COOKIE) } catch { /* noop */ }
    return null
  }

  try {
    cookieStore.set(ACCESS_COOKIE, data.session.access_token, accessCookieOptions())
    cookieStore.set(REFRESH_COOKIE, data.session.refresh_token, refreshCookieOptions())
  } catch { /* noop */ }
  return data.user
}

export function accessCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: STAFF_SESSION_MAX_AGE,
    path: '/',
  }
}

export function refreshCookieOptions() {
  return { ...accessCookieOptions(), sameSite: 'strict' as const }
}

async function getSessionUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ACCESS_COOKIE)?.value

  if (token) {
    const { data: { user }, error } = await anonClient().auth.getUser(token)
    if (!error && user) return user
  }

  return tryRefresh(cookieStore)
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
