import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chain } from '@/test/chain'

const m = vi.hoisted(() => ({
  admin: vi.fn(), capacity: vi.fn(), ensureRows: [] as unknown[], inserts: [] as { table: string; row: unknown }[],
}))

vi.mock('@/lib/staff-auth', () => ({ verifyAdminSession: m.admin }))
vi.mock('@/lib/eventCapacity', () => ({ checkEventCapacity: m.capacity }))
vi.mock('@/lib/email-safe', () => ({ sendSafely: async () => true }))
vi.mock('@/lib/email', () => ({ sendTicketConfirmed: vi.fn() }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'events') return chain({ data: { id: 'e1', nombre: 'Show', fecha: '2026-12-01T20:00:00Z', venue: 'V', max_entradas: 10 } })
      return {
        insert: (row: unknown) => {
          m.inserts.push({ table, row })
          return chain(table === 'event_orders'
            ? { data: { id: 'o1', order_code: 'SM-9', nombre: 'Ana', email: 'a@x.com' }, error: null }
            : { data: [{ id: 't1' }], error: null })
        },
        update: () => chain({ error: null }),
      }
    },
  },
}))

import { POST } from './route'
import { NextRequest } from 'next/server'

const call = (body: unknown) => POST({ json: async () => body } as unknown as NextRequest)
const valid = { event_id: 'e1', categoria: 'staff', nombre: 'Ana', email: 'a@x.com', cantidad: 2 }

beforeEach(() => {
  m.admin.mockReset(); m.capacity.mockReset(); m.inserts = []
  m.admin.mockResolvedValue({ id: 'a', email: 'admin@x.com' })
  m.capacity.mockResolvedValue({ ok: true })
})

describe('POST /api/eventos/orders/cortesia', () => {
  it('401 sin admin', async () => {
    m.admin.mockResolvedValueOnce(null)
    expect((await call(valid)).status).toBe(401)
  })

  it('400 con categoría inválida', async () => {
    expect((await call({ ...valid, categoria: 'otra' })).status).toBe(400)
  })

  it('409 si no hay cupo y no inserta nada', async () => {
    m.capacity.mockResolvedValueOnce({ ok: false, remaining: 1, message: 'Quedan 1 entradas disponibles' })
    const res = await call(valid)
    expect(res.status).toBe(409)
    expect(m.inserts).toHaveLength(0)
  })

  it('éxito: crea orden confirmada tipo cortesía y los tickets', async () => {
    const res = await call(valid)
    expect(res.status).toBe(200)
    const order = m.inserts.find(i => i.table === 'event_orders')!.row as Record<string, unknown>
    expect(order).toMatchObject({ status: 'confirmado', order_type: 'cortesia', cantidad: 2 })
    const tickets = m.inserts.find(i => i.table === 'event_tickets')!.row as unknown[]
    expect(tickets).toHaveLength(2)
  })
})
