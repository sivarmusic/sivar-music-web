import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), eq: vi.fn(), or: vi.fn(), update: vi.fn(), rows: [] as unknown[],
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({
        eq: (...a: unknown[]) => { mocks.eq(...a); return { order: () => Promise.resolve({ data: mocks.rows }) } },
        or: (...a: unknown[]) => { mocks.or(...a); return { order: () => Promise.resolve({ data: mocks.rows }) } },
      }),
      update: (...a: unknown[]) => { mocks.update(...a); return { in: () => Promise.resolve({}) } },
    }),
  },
}))

import { GET } from './route'
import { NextRequest } from 'next/server'

const req = () => new NextRequest('http://localhost/api/eventos/user/tickets', { headers: { authorization: 'Bearer t' } })
const user = { id: 'u', email: 'a@x.com', email_confirmed_at: '2026-01-01' }

beforeEach(() => {
  Object.values(mocks).forEach(m => typeof m === 'function' && m.mockReset())
  mocks.rows = []
})

describe('GET /api/eventos/user/tickets', () => {
  it('returns 401 without a bearer token', async () => {
    const res = await GET(new NextRequest('http://localhost/api/eventos/user/tickets'))
    expect(res.status).toBe(401)
  })

  it('queries orders by user_id only, never by email', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user }, error: null })
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'u')
    expect(mocks.or).not.toHaveBeenCalled()
  })

  it('does not auto-link orders without user_id, even when the email matches', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user }, error: null })
    mocks.rows = [{ id: 'o1', user_id: null, email: 'a@x.com', created_at: '2026-01-01' }]
    await GET(req())
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
