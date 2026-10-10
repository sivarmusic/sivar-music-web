import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({ admin: true as boolean, insert: vi.fn() }))

vi.mock('@/lib/staff-auth', () => ({ verifyAdminSession: async () => (m.admin ? { id: 'a' } : null) }))
vi.mock('@/lib/supabase', () => ({
  supabase: { from: () => ({
    insert: (row: unknown) => { m.insert(row); return { select: () => ({ single: async () => ({ data: { id: 'e1' }, error: null }) }) } },
  }) },
}))

import { POST } from './route'
import { NextRequest } from 'next/server'

const call = (body: unknown) => POST({ json: async () => body } as unknown as NextRequest)
const base = { nombre: 'Show', slug: 'Mi Show', fecha: '2026-12-01T20:00', venue: 'Teatro', direccion: 'Calle 1' }

beforeEach(() => { m.admin = true; m.insert.mockReset() })

describe('POST /api/eventos/events', () => {
  it('401 sin admin', async () => {
    m.admin = false
    expect((await call(base)).status).toBe(401)
  })

  it('precio 0 se respeta (evento gratis), no se convierte en $10', async () => {
    expect((await call({ ...base, precio: 0 })).status).toBe(200)
    expect(m.insert.mock.calls[0][0]).toMatchObject({ precio: 0, slug: 'mi-show' })
  })

  it('sin precio aplica el default de negocio ($10)', async () => {
    await call(base)
    expect(m.insert.mock.calls[0][0]).toMatchObject({ precio: 10 })
  })

  it('400 con precio negativo o imagen de host no permitido', async () => {
    expect((await call({ ...base, precio: -1 })).status).toBe(400)
    expect((await call({ ...base, imagen_url: 'https://evil.tld/a.jpg' })).status).toBe(400)
    expect(m.insert).not.toHaveBeenCalled()
  })

  it('400 si faltan campos requeridos', async () => {
    expect((await call({ nombre: 'x' })).status).toBe(400)
  })
})
