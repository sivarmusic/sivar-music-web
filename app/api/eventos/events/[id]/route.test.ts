import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({ admin: true as boolean, update: vi.fn() }))

vi.mock('@/lib/staff-auth', () => ({ verifyAdminSession: async () => (m.admin ? { id: 'a' } : null) }))
vi.mock('@/lib/supabase', () => ({
  supabase: { from: () => ({
    update: (row: unknown) => { m.update(row); return { eq: () => ({ select: () => ({ single: async () => ({ data: { id: 'e1' }, error: null }) }) }) } },
  }) },
}))

import { PATCH } from './route'
import { NextRequest } from 'next/server'

const call = (body: unknown) =>
  PATCH({ json: async () => body } as unknown as NextRequest, { params: Promise.resolve({ id: 'e1' }) })

beforeEach(() => { m.admin = true; m.update.mockReset() })

describe('PATCH /api/eventos/events/[id]', () => {
  it('401 sin admin', async () => {
    m.admin = false
    expect((await call({ visible: true })).status).toBe(401)
  })

  it('ignora campos no permitidos (mass assignment)', async () => {
    const res = await call({ visible: true, id: 'otro', created_at: 'x', foo: 1 })
    expect(res.status).toBe(200)
    expect(m.update).toHaveBeenCalledWith({ visible: true })
  })

  it('400 si no queda ningún campo permitido', async () => {
    expect((await call({ id: 'x' })).status).toBe(400)
  })

  it('400 con precio negativo o imagen con esquema javascript:', async () => {
    expect((await call({ precio: -5 })).status).toBe(400)
    expect((await call({ imagen_url: 'javascript:alert(1)' })).status).toBe(400)
  })

  it('acepta una edición completa válida', async () => {
    const res = await call({
      nombre: 'Show', slug: 'Mi Show', fecha: '2026-12-01T20:00', venue: 'Teatro', direccion: 'Calle 1',
      lat: 13.7, lng: -89.2, precio: 12.5, artistas: ['A', 'B'], max_entradas: 100, visible: true,
      imagen_url: 'https://x.supabase.co/a.jpg',
    })
    expect(res.status).toBe(200)
    expect(m.update.mock.calls[0][0]).toMatchObject({ slug: 'mi-show', precio: 12.5, max_entradas: 100 })
  })
})
