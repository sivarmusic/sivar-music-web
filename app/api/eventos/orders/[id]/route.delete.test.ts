import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chain } from '@/test/chain'

const m = vi.hoisted(() => ({ admin: true as boolean, order: null as null | Record<string, unknown>, deleted: vi.fn() }))

vi.mock('@/lib/staff-auth', () => ({
  verifyAdminSession: async () => (m.admin ? { id: 'a' } : null),
  verifyStaffSession: async () => ({ id: 's' }),
}))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: { from: () => ({ remove: async () => ({}) }) },
    from: () => ({
      select: () => chain({ data: m.order, error: null }),
      delete: () => { m.deleted(); return chain({ error: null }) },
    }),
  },
}))

vi.mock('@/lib/email', () => ({ sendTicketConfirmed: vi.fn() }))

import { DELETE } from './route'
import { NextRequest } from 'next/server'

const call = () => DELETE({} as NextRequest, { params: Promise.resolve({ id: 'o1' }) })

beforeEach(() => { m.admin = true; m.order = { status: 'rechazado', comprobante_path: null }; m.deleted.mockReset() })

describe('DELETE /api/eventos/orders/[id]', () => {
  it('409 si la orden está confirmada y no borra', async () => {
    m.order = { status: 'confirmado', comprobante_path: 'eventos/SM-1/c.jpg' }
    expect((await call()).status).toBe(409)
    expect(m.deleted).not.toHaveBeenCalled()
  })
  it('borra órdenes no confirmadas', async () => {
    expect((await call()).status).toBe(200)
    expect(m.deleted).toHaveBeenCalled()
  })
})
