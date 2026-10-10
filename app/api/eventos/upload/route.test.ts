import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  status: 'pendiente_comprobante', createdAt: new Date().toISOString(), uploadError: null as null | { message: string },
  upload: vi.fn(), remove: vi.fn(), update: vi.fn(), capacity: vi.fn(),
}))

vi.mock('@/lib/eventCapacity', async importActual => ({
  ...(await importActual<typeof import('@/lib/eventCapacity')>()),
  checkEventCapacity: m.capacity,
}))

vi.mock('@/lib/rate-limit', () => ({ enforceRateLimit: async () => null }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: { from: () => ({ upload: (...a: unknown[]) => { m.upload(...a); return Promise.resolve({ error: m.uploadError }) }, remove: m.remove }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { order_code: 'SM-1', comprobante_path: 'old', status: m.status, event_id: 'e1', cantidad: 2, created_at: m.createdAt, events: { max_entradas: 10 } }, error: null }) }) }),
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
  m.status = 'pendiente_comprobante'; m.uploadError = null; m.createdAt = new Date().toISOString()
  m.capacity.mockReset(); m.capacity.mockResolvedValue({ ok: true })
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

  it('rechazada: re-chequea cupo y responde 409 sin subir si ya no hay', async () => {
    m.status = 'rechazado'
    m.capacity.mockResolvedValueOnce({ ok: false, remaining: 0, message: 'No quedan entradas disponibles' })
    const res = await POST(req())
    expect(res.status).toBe(409)
    expect(m.upload).not.toHaveBeenCalled()
    expect(m.update).not.toHaveBeenCalled()
  })

  it('pendiente reciente no consulta cupo (ya lo ocupa); vencida sí', async () => {
    expect((await POST(req())).status).toBe(200)
    expect(m.capacity).not.toHaveBeenCalled()
    m.createdAt = new Date(Date.now() - 100 * 3600 * 1000).toISOString()
    expect((await POST(req())).status).toBe(200)
    expect(m.capacity).toHaveBeenCalledTimes(1)
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
