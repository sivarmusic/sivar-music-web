import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  getUser: vi.fn(), insert: vi.fn(), orders: [] as { cantidad: number }[], insertError: null as null | { code: string; message: string }, event: {} as Record<string, unknown>,
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: m.getUser },
    from: (table: string) => {
      if (table === 'events') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: m.event }) }) }) }
      if (table === 'attendee_profiles') return { upsert: () => Promise.resolve({}) }
      return {
        // existing-order lookup (.eq.eq.in.maybeSingle) y suma de cupo (.eq.in)
        select: () => ({
          eq: () => ({
            eq: () => ({ in: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
            in: () => Promise.resolve({ data: m.orders, error: null }),
          }),
        }),
        insert: (row: unknown) => { m.insert(row); return { select: () => ({ single: () => Promise.resolve(m.insertError ? { data: null, error: m.insertError } : { data: { id: 'o1', order_code: 'SM-1', cantidad: 2 }, error: null }) }) } },
      }
    },
  },
}))
vi.mock('@/lib/staff-auth', () => ({ verifyStaffSession: vi.fn() }))
vi.mock('@/lib/email', () => ({
  sendOrderConfirmation: vi.fn().mockResolvedValue(undefined),
  sendAdminNewOrderRequest: vi.fn().mockResolvedValue(undefined),
}))

import { POST } from './route'
import { NextRequest } from 'next/server'

const req = (cantidad: number) => new NextRequest('http://localhost/api/eventos/orders', {
  method: 'POST',
  headers: { authorization: 'Bearer t', 'content-type': 'application/json' },
  body: JSON.stringify({ event_id: 'e1', nombre: 'Ana', telefono: '7000', cantidad }),
})

beforeEach(() => {
  m.getUser.mockReset(); m.insert.mockReset(); m.insertError = null
  m.getUser.mockResolvedValue({ data: { user: { id: 'u', email: 'a@x.com' } }, error: null })
  m.event = { id: 'e1', nombre: 'Show', slug: 's', precio: 10, visible: true, max_entradas: 10 }
  m.orders = [{ cantidad: 6 }, { cantidad: 2 }]
})

describe('POST /api/eventos/orders — aforo', () => {
  it('rechaza con 409 si la cantidad excede el cupo restante', async () => {
    const res = await POST(req(3))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('Quedan 2 entradas disponibles')
    expect(m.insert).not.toHaveBeenCalled()
  })

  it('409 "No quedan entradas disponibles" con el evento agotado', async () => {
    m.orders = [{ cantidad: 10 }]
    const res = await POST(req(1))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('No quedan entradas disponibles')
  })

  it('crea la orden si entra justo en el cupo', async () => {
    const res = await POST(req(2))
    expect(res.status).toBe(200)
    expect(m.insert).toHaveBeenCalledTimes(1)
  })

  it('sin max_entradas no bloquea', async () => {
    m.event = { ...m.event, max_entradas: null }
    m.orders = [{ cantidad: 999 }]
    const res = await POST(req(5))
    expect(res.status).toBe(200)
  })

  it('409 claro cuando otro usuario ya tiene una solicitud activa con ese teléfono', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    m.insertError = { code: '23505', message: 'duplicate key value violates unique constraint "event_orders_telefono_event_active"' }
    const res = await POST(req(1))
    const body = await res.json()
    expect(res.status).toBe(409)
    expect(body.code).toBe('phone_active')
    expect(body.error).toMatch(/solicitud activa con este teléfono/)
    expect(JSON.stringify(body)).not.toContain('constraint')
  })
})
