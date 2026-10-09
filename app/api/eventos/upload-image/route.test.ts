import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({ admin: true as boolean, upload: vi.fn() }))

vi.mock('@/lib/staff-auth', () => ({ verifyAdminSession: async () => (m.admin ? { id: 'a' } : null) }))
vi.mock('@/lib/supabase', () => ({
  supabase: { storage: { from: () => ({
    upload: (...a: unknown[]) => { m.upload(...a); return Promise.resolve({ error: null }) },
    getPublicUrl: () => ({ data: { publicUrl: 'https://cdn/c.jpg' } }),
  }) } },
}))

import { POST } from './route'
import { NextRequest } from 'next/server'

const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])
const req = (bytes: Uint8Array, type: string, slug = '../Mi Evento!') => {
  const file = { type, name: 'a.svg', size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(0) }
  const f: Record<string, unknown> = { file, slug }
  return { formData: async () => ({ get: (k: string) => f[k] }) } as unknown as NextRequest
}

beforeEach(() => { m.admin = true; m.upload.mockReset() })

describe('POST /api/eventos/upload-image', () => {
  it('401 sin sesión de admin', async () => {
    m.admin = false
    expect((await POST(req(JPG, 'image/jpeg'))).status).toBe(401)
  })

  it('400 con SVG', async () => {
    expect((await POST(req(JPG, 'image/svg+xml'))).status).toBe(400)
  })

  it('éxito: slug saneado y extensión del MIME', async () => {
    const res = await POST(req(JPG, 'image/jpeg'))
    expect(res.status).toBe(200)
    expect(m.upload.mock.calls[0][0]).toBe('mi-evento/cover.jpg')
  })
})
