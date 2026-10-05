import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAdmin: vi.fn(),
  getCasting: vi.fn(),
  moveApplications: vi.fn(),
}))

vi.mock('@/lib/voces-session', () => ({ getAdmin: mocks.getAdmin }))
vi.mock('@/lib/voces-castings', () => ({
  getCasting: mocks.getCasting,
  moveApplications: mocks.moveApplications,
}))

import { POST } from './route'
import { NextRequest } from 'next/server'

function req(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/voces/admin/casting/application/move', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  mocks.getAdmin.mockReset().mockResolvedValue({ id: 'adm_1' })
  mocks.getCasting.mockReset().mockResolvedValue({ id: 'cas_2', shareId: 'share2' })
  mocks.moveApplications.mockReset()
})

describe('POST /api/voces/admin/casting/application/move', () => {
  it('401 sin admin y no toca nada', async () => {
    mocks.getAdmin.mockResolvedValue(null)
    const res = await POST(req({ ids: ['a'], targetId: 'cas_2' }))
    expect(res.status).toBe(401)
    expect(mocks.moveApplications).not.toHaveBeenCalled()
  })

  it.each([
    [{ targetId: 'cas_2' }],
    [{ ids: [], targetId: 'cas_2' }],
    [{ ids: ['a'] }],
    [{ ids: 'a', targetId: 'cas_2' }],
    [{ ids: [1], targetId: 'cas_2' }],
    [{ ids: Array.from({ length: 201 }, (_, i) => `a${i}`), targetId: 'cas_2' }],
  ])('400 con datos inválidos %#', async (body) => {
    const res = await POST(req(body))
    expect(res.status).toBe(400)
    expect(mocks.moveApplications).not.toHaveBeenCalled()
  })

  it('404 si el casting destino no existe', async () => {
    mocks.getCasting.mockResolvedValue(null)
    const res = await POST(req({ ids: ['a'], targetId: 'nope' }))
    expect(res.status).toBe(404)
    expect(mocks.moveApplications).not.toHaveBeenCalled()
  })

  it('éxito: mueve con id y shareId del destino', async () => {
    mocks.moveApplications.mockResolvedValue({ moved: ['a', 'b'], skipped: [], ignored: 0 })
    const res = await POST(req({ ids: ['a', 'b'], targetId: 'cas_2' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, moved: 2, keepOriginal: true, skipped: [] })
    expect(mocks.moveApplications).toHaveBeenCalledWith(['a', 'b'], { id: 'cas_2', shareId: 'share2' }, true)
  })

  it('omisión por email duplicado: informa nombre y motivo sin exponer ids', async () => {
    mocks.moveApplications.mockResolvedValue({
      moved: ['a'],
      skipped: [{ id: 'b', name: 'Ana Pérez', reason: 'ya postuló en el destino' }],
      ignored: 0,
    })
    const res = await POST(req({ ids: ['a', 'b'], targetId: 'cas_2' }))
    expect(await res.json()).toEqual({
      ok: true,
      moved: 1,
      keepOriginal: true,
      skipped: [{ name: 'Ana Pérez', reason: 'ya postuló en el destino' }],
    })
  })

  it('ids repetidos: se pasan a la lib (que deduplica) y el conteo refleja lo movido', async () => {
    mocks.moveApplications.mockResolvedValue({ moved: ['a'], skipped: [], ignored: 0 })
    const res = await POST(req({ ids: ['a', 'a', 'a'], targetId: 'cas_2' }))
    expect((await res.json()).moved).toBe(1)
  })

  it('keepOriginal=false se pasa a la lib (mover); no booleano -> 400', async () => {
    mocks.moveApplications.mockResolvedValue({ moved: ['a'], skipped: [], ignored: 0 })
    const res = await POST(req({ ids: ['a'], targetId: 'cas_2', keepOriginal: false }))
    expect((await res.json()).keepOriginal).toBe(false)
    expect(mocks.moveApplications).toHaveBeenCalledWith(['a'], { id: 'cas_2', shareId: 'share2' }, false)
    const bad = await POST(req({ ids: ['a'], targetId: 'cas_2', keepOriginal: 'no' }))
    expect(bad.status).toBe(400)
  })

  it('400 si todas ya estaban en el destino o no existen', async () => {
    mocks.moveApplications.mockResolvedValue({ moved: [], skipped: [], ignored: 2 })
    const res = await POST(req({ ids: ['a', 'b'], targetId: 'cas_2' }))
    expect(res.status).toBe(400)
  })

  it('500 si la lib falla', async () => {
    mocks.moveApplications.mockRejectedValue(new Error('boom'))
    const res = await POST(req({ ids: ['a'], targetId: 'cas_2' }))
    expect(res.status).toBe(500)
  })
})
