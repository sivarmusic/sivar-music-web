import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({ staff: vi.fn(), sign: vi.fn() }))

vi.mock('@/lib/staff-auth', () => ({ verifyStaffSession: m.staff }))
vi.mock('@/lib/supabase', () => ({
  supabase: { storage: { from: () => ({ createSignedUrl: m.sign }) } },
}))

import { GET } from './route'
import { NextRequest } from 'next/server'

const call = (path?: string) =>
  GET(new NextRequest(`http://localhost/api/eventos/signed-url${path === undefined ? '' : `?path=${encodeURIComponent(path)}`}`))

beforeEach(() => {
  m.staff.mockReset(); m.sign.mockReset()
  m.staff.mockResolvedValue({ id: 's' })
  m.sign.mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null })
})

describe('GET /api/eventos/signed-url', () => {
  it('401 sin sesión de staff', async () => {
    m.staff.mockResolvedValueOnce(null)
    expect((await call('eventos/SM-1/comprobante.png')).status).toBe(401)
  })

  it('400 sin path', async () => {
    expect((await call()).status).toBe(400)
  })

  it.each([
    'pinkfest/PF-1/comprobante.png',
    'eventos/../otro/x.png',
    'eventos//x.png',
    'eventos/x\u0000.png',
    'eventos/' + 'a'.repeat(300),
  ])('400 con path no permitido: %s', async (p) => {
    expect((await call(p)).status).toBe(400)
    expect(m.sign).not.toHaveBeenCalled()
  })

  it('firma un comprobante de eventos', async () => {
    const res = await call('eventos/SM-1/comprobante.png')
    expect(res.status).toBe(200)
    expect((await res.json()).url).toBe('https://signed')
  })
})
