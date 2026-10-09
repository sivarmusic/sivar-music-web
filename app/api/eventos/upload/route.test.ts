import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  status: 'pendiente_comprobante', uploadError: null as null | { message: string },
  upload: vi.fn(), remove: vi.fn(), update: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: { from: () => ({ upload: (...a: unknown[]) => { m.upload(...a); return Promise.resolve({ error: m.uploadError }) }, remove: m.remove }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { order_code: 'SM-1', comprobante_path: 'old', status: m.status }, error: null }) }) }),
      update: (row: unknown) => { m.update(row); return { eq: () => ({ in: () => Promise.resolve({ error: null }) }) } },
    }),
  },
}))

import { POST } from './route'
import { NextRequest } from 'next/server'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0])

function req(bytes: Uint8Array = PNG, type = 'image/png', name = 'x.png') {
  // jsdom no implementa File.arrayBuffer: se usa un objeto equivalente.
  const file = { type, name, size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(0) }
  const fields: Record<string, unknown> = { orderId: 'o1', file }
  return { formData: async () => ({ get: (k: string) => fields[k] }) } as unknown as NextRequest
}

beforeEach(() => {
  m.status = 'pendiente_comprobante'; m.uploadError = null
  m.upload.mockReset(); m.remove.mockReset(); m.update.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('POST /api/eventos/upload', () => {
  it('409 si la orden ya está confirmada y no toca nada', async () => {
    m.status = 'confirmado'
    const res = await POST(req())
    expect(res.status).toBe(409)
    expect(m.remove).not.toHaveBeenCalled()
    expect(m.upload).not.toHaveBeenCalled()
    expect(m.update).not.toHaveBeenCalled()
  })

  it('éxito con orden pendiente; la extensión sale del MIME, no del nombre', async () => {
    const res = await POST(req(PNG, 'image/png', 'evil.php'))
    expect(res.status).toBe(200)
    expect(m.upload.mock.calls[0][0]).toBe('eventos/SM-1/comprobante.png')
    expect(m.update).toHaveBeenCalledWith({ comprobante_path: 'eventos/SM-1/comprobante.png', status: 'en_revision' })
  })

  it('400 si los bytes no coinciden con el tipo declarado', async () => {
    const res = await POST(req(new Uint8Array([1, 2, 3, 4, 5]), 'image/png'))
    expect(res.status).toBe(400)
    expect(m.upload).not.toHaveBeenCalled()
  })

  it('error de storage devuelve mensaje genérico, sin detalle interno', async () => {
    m.uploadError = { message: 'bucket secret detail' }
    const res = await POST(req())
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('secret')
  })
})
