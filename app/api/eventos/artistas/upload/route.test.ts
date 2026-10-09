import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({ artist: true, upload: vi.fn(), uploadError: null as null | { message: string } }))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: m.artist ? { id: 'u1' } : null }) }) }) }),
    storage: { from: () => ({
      upload: (...a: unknown[]) => { m.upload(...a); return Promise.resolve({ error: m.uploadError }) },
      getPublicUrl: () => ({ data: { publicUrl: 'https://cdn/x.png' } }),
    }) },
  },
}))

import { POST } from './route'
import { NextRequest } from 'next/server'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0])

function req(bytes: Uint8Array, type: string, size = bytes.length) {
  const file = { type, name: 'evil.html', size, arrayBuffer: async () => bytes.buffer.slice(0) }
  const fields: Record<string, unknown> = { file, type: 'galeria' }
  return {
    headers: new Headers({ authorization: 'Bearer t' }),
    formData: async () => ({ get: (k: string) => fields[k] }),
  } as unknown as NextRequest
}

beforeEach(() => {
  m.artist = true; m.uploadError = null; m.upload.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('POST /api/eventos/artistas/upload', () => {
  it('403 si el usuario no es artista', async () => {
    m.artist = false
    expect((await POST(req(PNG, 'image/png'))).status).toBe(403)
    expect(m.upload).not.toHaveBeenCalled()
  })

  it('400 por tipo no permitido', async () => {
    expect((await POST(req(PNG, 'text/html'))).status).toBe(400)
  })

  it('400 por tamaño mayor a 5MB', async () => {
    expect((await POST(req(PNG, 'image/png', 6 * 1024 * 1024))).status).toBe(400)
  })

  it('400 si la firma no coincide con el MIME', async () => {
    expect((await POST(req(new Uint8Array([60, 104, 116, 109, 108]), 'image/png'))).status).toBe(400)
  })

  it('éxito: extensión y contentType fijados por el servidor', async () => {
    const res = await POST(req(PNG, 'image/png'))
    expect(res.status).toBe(200)
    expect(m.upload.mock.calls[0][0]).toMatch(/^artistas\/u1\/galeria\/\d+\.png$/)
    expect(m.upload.mock.calls[0][2]).toMatchObject({ contentType: 'image/png' })
  })

  it('error de storage: mensaje genérico', async () => {
    m.uploadError = { message: 'internal bucket detail' }
    const res = await POST(req(PNG, 'image/png'))
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('bucket')
  })
})
