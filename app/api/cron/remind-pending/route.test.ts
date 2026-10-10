import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chain } from '@/test/chain'

const m = vi.hoisted(() => ({ send: vi.fn(), updates: [] as unknown[], admin: vi.fn() }))
vi.mock('@/lib/staff-auth', () => ({ verifyAdminSession: m.admin }))
vi.mock('@/lib/email', () => ({ sendAbandonedCartReminder: m.send }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => chain({
        data: [{ id: 'o1', order_code: 'SM-1', nombre: 'Ana', email: 'a@x.com', created_at: 'x', events: { nombre: 'S', slug: 's' } }],
      }),
      update: (row: unknown) => { m.updates.push(row); return chain({ error: null }) },
    }),
  },
}))

import { GET } from './route'
import { NextRequest } from 'next/server'

const req = (auth?: string) => ({ headers: new Headers(auth ? { authorization: auth } : {}) }) as unknown as NextRequest

beforeEach(() => {
  m.send.mockReset(); m.updates = []; m.admin.mockReset(); m.admin.mockResolvedValue(null)
  process.env.CRON_SECRET = 'cron-secret'
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('GET /api/cron/remind-pending', () => {
  it('401 sin secreto ni admin', async () => {
    expect((await GET(req())).status).toBe(401)
  })

  it('marca reminder_sent_at cuando el correo sale', async () => {
    m.send.mockResolvedValueOnce({ error: null })
    const res = await GET(req('Bearer cron-secret'))
    expect((await res.json()).sent).toBe(1)
    expect(m.updates).toHaveLength(1)
  })

  it('NO marca reminder_sent_at si Resend devuelve error', async () => {
    m.send.mockResolvedValueOnce({ error: { name: 'quota', message: 'limit' } })
    const res = await GET(req('Bearer cron-secret'))
    expect((await res.json()).sent).toBe(0)
    expect(m.updates).toHaveLength(0)
  })
})
