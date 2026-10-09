import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  jar: {} as Record<string, string>,
  setThrows: false,
  getUser: vi.fn(),
  refreshSession: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (k: string) => (m.jar[k] ? { value: m.jar[k] } : undefined),
    set: (k: string, v: string) => { if (m.setThrows) throw new Error('read-only'); m.jar[k] = v },
    delete: (k: string) => { delete m.jar[k] },
  }),
}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: m.getUser, refreshSession: m.refreshSession } }),
}))

import { verifyStaffSession } from './staff-auth'

const staff = { id: 's', app_metadata: { role: 'verificador' } }

beforeEach(() => {
  m.jar = {}; m.setThrows = false
  m.getUser.mockReset(); m.refreshSession.mockReset()
})

describe('verifyStaffSession', () => {
  it('usa el access token válido sin refrescar', async () => {
    m.jar.pf_admin_token = 'a'
    m.getUser.mockResolvedValueOnce({ data: { user: staff }, error: null })
    expect(await verifyStaffSession()).toEqual(staff)
    expect(m.refreshSession).not.toHaveBeenCalled()
  })

  it('renueva con el refresh token cuando el access venció y guarda las cookies nuevas', async () => {
    m.jar.pf_admin_token = 'viejo'; m.jar.pf_admin_refresh = 'r1'
    m.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'expired' } })
    m.refreshSession.mockResolvedValueOnce({
      data: { user: staff, session: { access_token: 'nuevo', refresh_token: 'r2' } }, error: null,
    })
    expect(await verifyStaffSession()).toEqual(staff)
    expect(m.jar.pf_admin_token).toBe('nuevo')
    expect(m.jar.pf_admin_refresh).toBe('r2')
  })

  it('devuelve null si el refresh falla', async () => {
    m.jar.pf_admin_refresh = 'r1'
    m.refreshSession.mockResolvedValueOnce({ data: { user: null, session: null }, error: { message: 'bad' } })
    expect(await verifyStaffSession()).toBeNull()
  })

  it('no rota el refresh token si no se pueden escribir cookies (Server Component)', async () => {
    m.jar.pf_admin_refresh = 'r1'; m.setThrows = true
    expect(await verifyStaffSession()).toBeNull()
    expect(m.refreshSession).not.toHaveBeenCalled()
  })

  it('rechaza cuentas sin rol de staff aunque el token sea válido', async () => {
    m.jar.pf_admin_token = 'a'
    m.getUser.mockResolvedValueOnce({ data: { user: { id: 'x', app_metadata: {} } }, error: null })
    expect(await verifyStaffSession()).toBeNull()
  })
})
