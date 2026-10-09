import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({ verifyStaffSession: vi.fn(), maybeSingle: vi.fn() }))

vi.mock('@/lib/pinkfest-auth', () => ({ verifyStaffSession: mocks.verifyStaffSession }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) }),
  },
}))

import { GET } from './route'
import { NextRequest } from 'next/server'

const call = () =>
  GET(new NextRequest('http://localhost/api/pinkfest/verify-code/PF-0001'), {
    params: Promise.resolve({ code: 'PF-0001' }),
  })

beforeEach(() => {
  mocks.verifyStaffSession.mockReset()
  mocks.maybeSingle.mockReset()
})

describe('GET /api/pinkfest/verify-code/[code]', () => {
  it('returns 401 without staff session and never queries the database', async () => {
    mocks.verifyStaffSession.mockResolvedValueOnce(null)
    const res = await call()
    expect(res.status).toBe(401)
    expect(mocks.maybeSingle).not.toHaveBeenCalled()
  })

  it('returns tickets for a staff session', async () => {
    mocks.verifyStaffSession.mockResolvedValueOnce({ id: 's' })
    mocks.maybeSingle.mockResolvedValueOnce({
      error: null,
      data: {
        order_code: 'PF-0001', nombre: 'Ana', cantidad: 1, status: 'confirmado',
        pinkfest_tickets: [{ ticket_number: 1, qr_token: 'tok', check_in_at: null }],
      },
    })
    const res = await call()
    expect(res.status).toBe(200)
    expect((await res.json()).tickets[0].qr_token).toBe('tok')
  })
})
