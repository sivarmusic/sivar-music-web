import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({ insert: vi.fn() }))

vi.mock('@/lib/staff-auth', () => ({ verifyAdminSession: async () => null }))
vi.mock('@/lib/email-safe', () => ({ sendSafely: async () => true }))
vi.mock('@/lib/email', () => ({ sendAdminNewArtistEvent: vi.fn() }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
    from: (t: string) => t === 'artist_profiles'
      ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { nombre_artistico: 'DJ' } }) }) }) }
      : { insert: (row: unknown) => { m.insert(row); return { select: () => ({ single: async () => ({ data: { id: 'ev', nombre: 'x', fecha: 'f', venue: 'v' }, error: null }) }) } } },
  },
}))

import { POST } from './route'
import { NextRequest } from 'next/server'

const call = (body: unknown) => POST({
  headers: new Headers({ authorization: 'Bearer t' }),
  json: async () => body,
} as unknown as NextRequest)

const valid = { nombre: 'Show', fecha: '2026-12-01T20:00', venue: 'Teatro' }

beforeEach(() => m.insert.mockReset())

describe('POST /api/eventos/artistas/eventos', () => {
  it('400 si faltan campos requeridos', async () => {
    expect((await call({ nombre: 'x' })).status).toBe(400)
  })

  it('400 con link_externo javascript: o data:', async () => {
    expect((await call({ ...valid, link_externo: 'javascript:alert(1)' })).status).toBe(400)
    expect((await call({ ...valid, link_externo: 'data:text/html,hola' })).status).toBe(400)
    expect(m.insert).not.toHaveBeenCalled()
  })

  it('400 con precio negativo, lat fuera de rango o max_entradas decimal', async () => {
    expect((await call({ ...valid, precio: -1 })).status).toBe(400)
    expect((await call({ ...valid, lat: 120 })).status).toBe(400)
    expect((await call({ ...valid, max_entradas: 2.5 })).status).toBe(400)
  })

  it('crea el evento pendiente con campos válidos', async () => {
    const res = await call({ ...valid, precio: '15', lat: 13.7, lng: -89.2, max_entradas: 200, link_externo: 'https://tickets.example.com/x' })
    expect(res.status).toBe(200)
    expect(m.insert.mock.calls[0][0]).toMatchObject({ status: 'pendiente', precio: 15, max_entradas: 200, artist_id: 'u1' })
  })
})
