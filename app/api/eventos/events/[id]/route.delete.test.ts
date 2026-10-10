import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chain } from '@/test/chain'

const m = vi.hoisted(() => ({ admin: true as boolean, count: 0, deleted: vi.fn(), eqs: [] as unknown[][] }))

vi.mock('@/lib/staff-auth', () => ({ verifyAdminSession: async () => (m.admin ? { id: 'a' } : null) }))
vi.mock('@/lib/supabase', () => ({
  supabase: { from: (table: string) => ({
    select: () => chain({ count: m.count, error: null }),
    delete: () => { m.deleted(table); return chain({ error: null }) },
  }) },
}))

import { DELETE } from './route'
import { NextRequest } from 'next/server'

const call = () => DELETE({} as NextRequest, { params: Promise.resolve({ id: 'e1' }) })

beforeEach(() => { m.admin = true; m.count = 0; m.deleted.mockReset() })

describe('DELETE /api/eventos/events/[id]', () => {
  it('409 si hay órdenes confirmadas y no borra', async () => {
    m.count = 3
    const res = await call()
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/ocultalo/)
    expect(m.deleted).not.toHaveBeenCalled()
  })

  it('borra si no hay órdenes confirmadas', async () => {
    const res = await call()
    expect(res.status).toBe(200)
    expect(m.deleted).toHaveBeenCalledWith('events')
  })
})
