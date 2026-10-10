import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { proxyEventosAdmin } from './proxy'

const req = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost${path}`, { headers: cookie ? { cookie } : {} })

describe('proxyEventosAdmin', () => {
  it('redirige al login con ?redirect cuando no hay cookie de staff', () => {
    const res = proxyEventosAdmin(req('/eventos/admin/cortesias?x=1'), '/eventos/admin/cortesias')
    expect(res.status).toBe(307)
    const loc = new URL(res.headers.get('location')!)
    expect(loc.pathname).toBe('/eventos/admin/login')
    expect(loc.searchParams.get('redirect')).toBe('/eventos/admin/cortesias?x=1')
  })

  it('deja pasar con cookie de acceso o de refresh', () => {
    expect(proxyEventosAdmin(req('/eventos/admin', 'pf_admin_token=a'), '/eventos/admin').headers.get('location')).toBeNull()
    expect(proxyEventosAdmin(req('/eventos/admin', 'pf_admin_refresh=r'), '/eventos/admin').headers.get('location')).toBeNull()
  })

  it('no redirige la propia página de login', () => {
    const res = proxyEventosAdmin(req('/eventos/admin/login'), '/eventos/admin/login')
    expect(res.headers.get('location')).toBeNull()
  })
})
