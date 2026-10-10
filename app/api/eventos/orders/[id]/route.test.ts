import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chain } from '@/test/chain'

const m = vi.hoisted(() => ({
  staff: vi.fn(), admin: vi.fn(), ensure: vi.fn(), send: vi.fn(), capacity: vi.fn(),
  current: {} as Record<string, unknown>, selectError: null as null | { message: string },
  updates: [] as unknown[], order: {} as Record<string, unknown>, auditError: null as null | { message: string },
}))

vi.mock('@/lib/staff-auth', () => ({ verifyStaffSession: m.staff, verifyAdminSession: m.admin }))
vi.mock('@/lib/eventCapacity', () => ({ checkEventCapacity: m.capacity }))
vi.mock('@/lib/eventTickets', () => ({ ensureEventTickets: m.ensure }))
vi.mock('@/lib/email', () => ({ sendTicketConfirmed: m.send }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => chain(m.selectError ? { data: null, error: m.selectError } : { data: m.current, error: null }),
      update: (row: Record<string, unknown>) => {
        m.updates.push(row)
        // El primer update (estado) devuelve la orden; el de auditoría puede fallar.
        const isAudit = 'reviewed_by' in row
        return chain(isAudit ? { error: m.auditError } : { data: m.order, error: null })
      },
    }),
  },
}))

import { PATCH } from './route'
import { NextRequest } from 'next/server'

const call = (body: unknown) =>
  PATCH({ json: async () => body } as unknown as NextRequest, { params: Promise.resolve({ id: 'o1' }) })

beforeEach(() => {
  Object.values(m).forEach(v => typeof v === 'function' && 'mockReset' in v && (v as ReturnType<typeof vi.fn>).mockReset())
  m.updates = []; m.auditError = null; m.selectError = null
  m.current = { status: 'en_revision', event_id: 'e1', cantidad: 2, events: { max_entradas: 10 } }
  m.capacity.mockResolvedValue({ ok: true })
  m.order = {
    id: 'o1', order_code: 'SM-1', cantidad: 2, nombre: 'Ana', email: 'a@x.com',
    events: { nombre: 'Show', slug: 's', venue: 'V', fecha: '2026-12-01T20:00:00Z' },
  }
  m.staff.mockResolvedValue({ id: 's', email: 'staff@x.com' })
  m.ensure.mockResolvedValue({ error: null })
  m.send.mockResolvedValue({ error: null })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('PATCH /api/eventos/orders/[id]', () => {
  it('401 sin sesión de staff', async () => {
    m.staff.mockResolvedValueOnce(null)
    expect((await call({ status: 'confirmado' })).status).toBe(401)
    expect(m.updates).toHaveLength(0)
  })

  it('400 con estado inválido', async () => {
    expect((await call({ status: 'pendiente_comprobante' })).status).toBe(400)
  })

  it('confirmar: genera tickets de forma idempotente, audita y reporta emailSent', async () => {
    const res = await call({ status: 'confirmado' })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(m.ensure).toHaveBeenCalledWith(expect.anything(), 'o1', 'SM-1', 2)
    expect(body.emailSent).toBe(true)
    const audit = m.updates.find(u => (u as Record<string, unknown>).reviewed_by) as Record<string, unknown>
    expect(audit).toMatchObject({ reviewed_by: 'staff@x.com', confirmed_by: 'staff@x.com' })
  })

  it('confirmar funciona aunque falle la auditoría (columna inexistente)', async () => {
    m.auditError = { message: 'column "reviewed_by" does not exist' }
    const res = await call({ status: 'confirmado' })
    expect(res.status).toBe(200)
    expect(m.ensure).toHaveBeenCalled()
  })

  it('emailSent=false si Resend devuelve error; la orden queda confirmada', async () => {
    m.send.mockResolvedValueOnce({ error: { name: 'quota', message: 'limit' } })
    const res = await call({ status: 'confirmado' })
    expect(res.status).toBe(200)
    expect((await res.json()).emailSent).toBe(false)
  })

  it('rechazar: no genera tickets ni envía correo', async () => {
    const res = await call({ status: 'rechazado', rechazo_motivo: 'monto incorrecto' })
    expect(res.status).toBe(200)
    expect(m.ensure).not.toHaveBeenCalled()
    expect(m.send).not.toHaveBeenCalled()
    expect((await res.json()).emailSent).toBeUndefined()
  })

  it('409 pendiente_comprobante -> confirmado (sin comprobante)', async () => {
    m.current.status = 'pendiente_comprobante'
    const res = await call({ status: 'confirmado' })
    expect(res.status).toBe(409)
    expect(m.updates).toHaveLength(0)
    expect(m.ensure).not.toHaveBeenCalled()
  })

  it('pendiente_comprobante -> rechazado está permitido', async () => {
    m.current.status = 'pendiente_comprobante'
    expect((await call({ status: 'rechazado' })).status).toBe(200)
  })

  it('rechazado -> confirmado re-chequea cupo y responde 409 si ya no hay', async () => {
    m.current.status = 'rechazado'
    m.capacity.mockResolvedValueOnce({ ok: false, remaining: 0, message: 'No quedan entradas disponibles' })
    const res = await call({ status: 'confirmado' })
    expect(res.status).toBe(409)
    expect(m.capacity).toHaveBeenCalledWith(expect.anything(), 'e1', 10, 2)
    expect(m.updates).toHaveLength(0)
  })

  it('rechazado -> confirmado con cupo: confirma, genera tickets y envía correo', async () => {
    m.current.status = 'rechazado'
    const res = await call({ status: 'confirmado' })
    expect(res.status).toBe(200)
    expect(m.ensure).toHaveBeenCalled()
    expect((await res.json()).emailSent).toBe(true)
  })

  it('confirmado -> confirmado es idempotente: asegura tickets, no reenvía correo ni audita', async () => {
    m.current.status = 'confirmado'
    const res = await call({ status: 'confirmado' })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.alreadyConfirmed).toBe(true)
    expect(m.ensure).toHaveBeenCalled()
    expect(m.send).not.toHaveBeenCalled()
    expect(m.updates.find(u => 'reviewed_by' in (u as object))).toBeUndefined()
  })

  it('404 si la orden no existe y 500 si falla la lectura', async () => {
    m.current = null as unknown as Record<string, unknown>
    expect((await call({ status: 'confirmado' })).status).toBe(404)
    m.selectError = { message: 'x' }
    expect((await call({ status: 'confirmado' })).status).toBe(500)
  })

  it('500 si no se pueden generar las entradas', async () => {
    m.ensure.mockResolvedValueOnce({ error: { message: 'x' } })
    expect((await call({ status: 'confirmado' })).status).toBe(500)
  })
})
