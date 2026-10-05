import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAdmin: vi.fn(),
  deleteApplication: vi.fn(),
  referencedUrls: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/lib/voces-session', () => ({ getAdmin: mocks.getAdmin }))
vi.mock('@/lib/voces-castings', () => ({ deleteApplication: mocks.deleteApplication }))
vi.mock('@/lib/voces-audio-refs', () => ({ referencedUrls: mocks.referencedUrls }))
vi.mock('@/lib/supabase', () => ({
  supabase: { storage: { from: () => ({ remove: mocks.remove }) } },
}))

import { POST } from './route'
import { NextRequest } from 'next/server'

const URL_A = 'https://x.supabase.co/storage/v1/object/public/voces-casting-files/castings/a.mp3'

function req(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/voces/admin/casting/application/delete', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  mocks.getAdmin.mockReset().mockResolvedValue({ id: 'adm' })
  mocks.deleteApplication.mockReset().mockResolvedValue(undefined)
  mocks.referencedUrls.mockReset().mockResolvedValue(new Set())
  mocks.remove.mockReset().mockResolvedValue({})
})

describe('POST application/delete con purgeRemote', () => {
  it('purga el archivo si nadie más lo referencia', async () => {
    const res = await POST(req({ id: 'p1', purgeRemote: true, audioUrl: URL_A }))
    expect(res.status).toBe(200)
    expect(mocks.deleteApplication).toHaveBeenCalledWith('p1')
    expect(mocks.remove).toHaveBeenCalledWith(['castings/a.mp3'])
  })

  it('NO purga el archivo compartido con otra postulación (solo borra la fila)', async () => {
    mocks.referencedUrls.mockResolvedValue(new Set([URL_A]))
    const res = await POST(req({ id: 'p1', purgeRemote: true, audioUrl: URL_A }))
    expect(res.status).toBe(200)
    expect(mocks.deleteApplication).toHaveBeenCalledWith('p1')
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('sin purgeRemote no toca el storage', async () => {
    await POST(req({ id: 'p1', audioUrl: URL_A }))
    expect(mocks.remove).not.toHaveBeenCalled()
  })
})
