import { describe, it, expect } from 'vitest'
import { chain } from '@/test/chain'
import {
  checkEventCapacity, holdsCapacity, PENDING_HOLD_MS, availabilityFor, getEventsAvailability, FEW_LEFT_THRESHOLD,
} from './eventCapacity'

const NOW = Date.parse('2026-12-10T12:00:00Z')
const ago = (ms: number) => new Date(NOW - ms).toISOString()

describe('holdsCapacity', () => {
  it('confirmado y en_revision siempre retienen cupo', () => {
    expect(holdsCapacity({ status: 'confirmado', created_at: ago(PENDING_HOLD_MS * 5) }, NOW)).toBe(true)
    expect(holdsCapacity({ status: 'en_revision', created_at: ago(PENDING_HOLD_MS * 5) }, NOW)).toBe(true)
  })
  it('pendiente_comprobante retiene hasta el plazo y luego libera', () => {
    expect(holdsCapacity({ status: 'pendiente_comprobante', created_at: ago(PENDING_HOLD_MS - 1000) }, NOW)).toBe(true)
    expect(holdsCapacity({ status: 'pendiente_comprobante', created_at: ago(PENDING_HOLD_MS + 1000) }, NOW)).toBe(false)
  })
  it('rechazado no retiene; pendiente sin fecha cuenta (falla cerrado)', () => {
    expect(holdsCapacity({ status: 'rechazado', created_at: ago(0) }, NOW)).toBe(false)
    expect(holdsCapacity({ status: 'pendiente_comprobante' }, NOW)).toBe(true)
  })
})

describe('checkEventCapacity', () => {
  const db = (rows: unknown[]) => ({ from: () => ({ select: () => chain({ data: rows, error: null }) }) }) as never

  it('ignora pendientes vencidas al sumar', async () => {
    const old = new Date(Date.now() - PENDING_HOLD_MS - 60_000).toISOString()
    const rows = [
      { cantidad: 5, status: 'confirmado', created_at: old },
      { cantidad: 4, status: 'pendiente_comprobante', created_at: old },
      { cantidad: 1, status: 'pendiente_comprobante', created_at: new Date().toISOString() },
    ]
    const r = await checkEventCapacity(db(rows), 'e1', 10, 4)
    expect(r.ok).toBe(true) // vendidas = 5 + 1 = 6, quedan 4
    const r2 = await checkEventCapacity(db(rows), 'e1', 10, 5)
    expect(r2).toMatchObject({ ok: false, remaining: 4 })
  })

  it('falla cerrado si la consulta da error', async () => {
    const bad = { from: () => ({ select: () => chain({ data: null, error: { message: 'x' } }) }) } as never
    expect(await checkEventCapacity(bad, 'e1', 10, 1)).toMatchObject({ ok: false, remaining: 0 })
  })
})

describe('availabilityFor', () => {
  it('sin aforo: abierto y sin conteo', () => {
    expect(availabilityFor(null, 500)).toEqual({ soldOut: false, remaining: null })
    expect(availabilityFor(0, 500)).toEqual({ soldOut: false, remaining: null })
  })
  it('quedan <= umbral: expone remaining; más: lo oculta', () => {
    expect(availabilityFor(100, 100 - FEW_LEFT_THRESHOLD)).toEqual({ soldOut: false, remaining: FEW_LEFT_THRESHOLD })
    expect(availabilityFor(100, 100 - FEW_LEFT_THRESHOLD - 1)).toEqual({ soldOut: false, remaining: null })
  })
  it('agotado: soldOut y remaining null (también si se sobrevendió)', () => {
    expect(availabilityFor(100, 100)).toEqual({ soldOut: true, remaining: null })
    expect(availabilityFor(100, 103)).toEqual({ soldOut: true, remaining: null })
  })
})

describe('getEventsAvailability', () => {
  const db = (rows: unknown[], error: unknown = null) =>
    ({ from: () => ({ select: () => chain({ data: error ? null : rows, error }) }) }) as never
  const fresh = new Date().toISOString()
  const old = new Date(Date.now() - PENDING_HOLD_MS - 60_000).toISOString()

  it('suma estados activos por evento, ignora pendientes vencidas y no consulta sin aforo', async () => {
    const rows = [
      { event_id: 'a', cantidad: 90, status: 'confirmado', created_at: old },
      { event_id: 'a', cantidad: 5, status: 'pendiente_comprobante', created_at: old },
      { event_id: 'a', cantidad: 2, status: 'en_revision', created_at: fresh },
      { event_id: 'b', cantidad: 10, status: 'confirmado', created_at: fresh },
    ]
    const r = await getEventsAvailability(db(rows), [
      { id: 'a', max_entradas: 100 }, { id: 'b', max_entradas: 10 }, { id: 'c', max_entradas: null },
    ])
    expect(r.get('a')).toEqual({ soldOut: false, remaining: 8 })
    expect(r.get('b')).toEqual({ soldOut: true, remaining: null })
    expect(r.get('c')).toEqual({ soldOut: false, remaining: null })
  })

  it('si la consulta falla no muestra chips (falla abierto en lo informativo)', async () => {
    const r = await getEventsAvailability(db([], { message: 'x' }), [{ id: 'a', max_entradas: 5 }])
    expect(r.get('a')).toEqual({ soldOut: false, remaining: null })
  })
})
