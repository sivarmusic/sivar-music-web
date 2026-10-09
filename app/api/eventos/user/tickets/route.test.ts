import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), or: vi.fn() }))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({ or: (f: string) => ({ order: () => { mocks.or(f); return Promise.resolve({ data: [] }) } }) }),
      update: () => ({ in: () => Promise.resolve({}) }),
    }),
  },
}))

import { GET } from './route'
import { NextRequest } from 'next/server'

const req = () => new NextRequest('http://localhost/api/eventos/user/tickets', { headers: { authorization: 'Bearer t' } })

beforeEach(() => { mocks.getUser.mockReset(); mocks.or.mockReset() })

describe('GET /api/eventos/user/tickets', () => {
  it('matches by email only when the email is verified', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'u', email: 'a@x.com', email_confirmed_at: '2026-01-01' } }, error: null })
    await GET(req())
    expect(mocks.or).toHaveBeenCalledWith('user_id.eq.u,email.eq.a@x.com')
  })

  it('uses user_id only when the email is not verified', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'u', email: 'a@x.com', email_confirmed_at: null } }, error: null })
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(mocks.or).toHaveBeenCalledWith('user_id.eq.u')
  })
})
