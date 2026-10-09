import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({ staff: vi.fn(), checkedIn: null as string | null, claimed: false }))

vi.mock('@/lib/staff-auth', () => ({ verifyStaffSession: m.staff }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({
            data: { id: 't1', check_in_at: m.checkedIn, event_orders: { status: 'confirmado' } },
          }),
        }),
      }),
      update: () => ({
        eq: () => ({
          is: () => ({
            // Simula la condición atómica: solo el primer UPDATE gana la fila.
            select: () => {
              if (m.claimed) return Promise.resolve({ data: [], error: null })
              m.claimed = true
              return Promise.resolve({ data: [{ id: 't1' }], error: null })
            },
          }),
        }),
      }),
    }),
  },
}))

import { PATCH } from './route'
import { NextRequest } from 'next/server'

const call = () => PATCH(new NextRequest('http://localhost/x', { method: 'PATCH' }), { params: Promise.resolve({ token: 'tok' }) })

beforeEach(() => { m.staff.mockReset(); m.staff.mockResolvedValue({ id: 's' }); m.checkedIn = null; m.claimed = false })

describe('PATCH /api/eventos/verify/[token] — check-in atómico', () => {
  it('401 sin credencial de staff', async () => {
    m.staff.mockResolvedValueOnce(null)
    expect((await call()).status).toBe(401)
  })

  it('dos escaneos simultáneos: solo uno ok, el otro "ya ingresó"', async () => {
    const [a, b] = await Promise.all([call(), call()])
    const statuses = [a.status, b.status].sort()
    expect(statuses).toEqual([200, 409])
    const loser = a.status === 409 ? a : b
    expect((await loser.json()).alreadyUsed).toBe(true)
  })

  it('ticket ya usado devuelve 409 con la hora del primer ingreso', async () => {
    m.checkedIn = '2026-01-01T20:00:00Z'
    const res = await call()
    expect(res.status).toBe(409)
    expect((await res.json()).check_in_at).toBe('2026-01-01T20:00:00Z')
  })
})
