import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  signIn: vi.fn(), role: vi.fn(), rateLimited: false,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { signInWithPassword: m.signIn } }),
}))
vi.mock('@/lib/rate-limit', async () => {
  const { NextResponse } = await import('next/server')
  return {
    enforceRateLimit: async () => (m.rateLimited ? NextResponse.json({ error: 'x' }, { status: 429 }) : null),
  }
})
vi.mock('@/lib/staff-auth', async () => ({
  ACCESS_COOKIE: 'pf_admin_token',
  REFRESH_COOKIE: 'pf_admin_refresh',
  accessCookieOptions: () => ({ httpOnly: true, path: '/' }),
  refreshCookieOptions: () => ({ httpOnly: true, path: '/' }),
  getSessionRole: m.role,
}))

import { POST as login } from './login/route'
import { POST as logout } from './logout/route'
import { GET as session } from './session/route'
import { NextRequest } from 'next/server'

const loginReq = (body: unknown) => ({ headers: new Headers(), json: async () => body }) as unknown as NextRequest

beforeEach(() => { m.signIn.mockReset(); m.role.mockReset(); m.rateLimited = false })

describe('staff login', () => {
  it('400 si falta email o password, sin consultar a Supabase', async () => {
    expect((await login(loginReq({ password: 'x' }))).status).toBe(400)
    expect((await login(loginReq({ email: 'a@b.com' }))).status).toBe(400)
    expect(m.signIn).not.toHaveBeenCalled()
  })

  it('429 cuando se supera el límite', async () => {
    m.rateLimited = true
    expect((await login(loginReq({ email: 'a@b.com', password: 'x' }))).status).toBe(429)
  })

  it('credenciales malas: 401 uniforme', async () => {
    m.signIn.mockResolvedValueOnce({ data: {}, error: { message: 'Invalid login credentials' } })
    const res = await login(loginReq({ email: 'a@b.com', password: 'x' }))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Credenciales inválidas')
  })

  it('cuenta sin rol de staff: mismo 401 uniforme', async () => {
    m.signIn.mockResolvedValueOnce({ data: { session: { access_token: 'a', refresh_token: 'r' }, user: { app_metadata: {} } }, error: null })
    const res = await login(loginReq({ email: 'a@b.com', password: 'x' }))
    expect(res.status).toBe(401)
  })

  it('usuario simple se mapea a @sivarmusic.com y setea ambas cookies', async () => {
    m.signIn.mockResolvedValueOnce({
      data: { session: { access_token: 'a', refresh_token: 'r' }, user: { app_metadata: { role: 'verificador' } } }, error: null,
    })
    const res = await login(loginReq({ email: 'sivarentradas1', password: 'x' }))
    expect(m.signIn).toHaveBeenCalledWith({ email: 'sivarentradas1@sivarmusic.com', password: 'x' })
    expect(res.status).toBe(200)
    expect(res.cookies.get('pf_admin_token')?.value).toBe('a')
    expect(res.cookies.get('pf_admin_refresh')?.value).toBe('r')
  })
})

describe('staff logout y session', () => {
  it('logout borra ambas cookies', async () => {
    const res = await logout()
    expect(res.cookies.get('pf_admin_token')?.value).toBe('')
    expect(res.cookies.get('pf_admin_refresh')?.value).toBe('')
  })

  it('session 401 sin sesión y 200 con rol', async () => {
    m.role.mockResolvedValueOnce(null)
    expect((await session()).status).toBe(401)
    m.role.mockResolvedValueOnce({ email: 's@x.com', role: 'admin' })
    const res = await session()
    expect(res.status).toBe(200)
    expect((await res.json()).role).toBe('admin')
  })
})
