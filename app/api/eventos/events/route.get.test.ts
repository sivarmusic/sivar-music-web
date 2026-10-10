import { describe, it, expect, vi } from 'vitest'
import { chain } from '@/test/chain'

const m = vi.hoisted(() => ({ orders: [] as unknown[] }))

vi.mock('@/lib/staff-auth', () => ({ verifyAdminSession: async () => null }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => {
        if (table === 'events') {
          return chain({
            data: [
              { id: 'e1', slug: 'a', nombre: 'A', max_entradas: 100, visible: true },
              { id: 'e2', slug: 'b', nombre: 'B', max_entradas: 10, visible: true },
              { id: 'e3', slug: 'c', nombre: 'C', max_entradas: null, visible: true },
            ], error: null,
          })
        }
        if (table === 'event_orders') return chain({ data: m.orders, error: null })
        return chain({ data: [], error: null })
      },
    }),
  },
}))

import { GET } from './route'
import { NextRequest } from 'next/server'

describe('GET /api/eventos/events (público)', () => {
  it('agrega soldOut/remaining sin exponer conteos de órdenes', async () => {
    const now = new Date().toISOString()
    m.orders = [
      { event_id: 'e1', cantidad: 95, status: 'confirmado', created_at: now },
      { event_id: 'e2', cantidad: 10, status: 'en_revision', created_at: now },
    ]
    const res = await GET({ url: 'http://x/api/eventos/events' } as unknown as NextRequest)
    const { events } = await res.json()
    const by = (id: string) => events.find((e: { id: string }) => e.id === id)
    expect(by('e1')).toMatchObject({ soldOut: false, remaining: 5 })
    expect(by('e2')).toMatchObject({ soldOut: true, remaining: null })
    expect(by('e3')).toMatchObject({ soldOut: false, remaining: null })
    expect(JSON.stringify(events)).not.toMatch(/event_orders|cantidad/)
  })
})
