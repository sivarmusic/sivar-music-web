import { describe, it, expect } from 'vitest'
import { toEventIso, toEventDatetimeLocal, formatEventDateTime, EVENT_TZ } from './eventDate'

describe('toEventIso', () => {
  it('datetime-local sin zona = hora de El Salvador (UTC-6)', () => {
    expect(toEventIso('2026-12-01T20:00')).toBe('2026-12-01T20:00:00-06:00')
    expect(new Date(toEventIso('2026-12-01T20:00')).toISOString()).toBe('2026-12-02T02:00:00.000Z')
    expect(toEventIso('2026-12-01T20:00:30')).toBe('2026-12-01T20:00:30-06:00')
  })
  it('respeta zona explícita', () => {
    expect(toEventIso('2026-12-02T02:00:00Z')).toBe('2026-12-02T02:00:00Z')
    expect(toEventIso('2026-12-01T20:00:00-06:00')).toBe('2026-12-01T20:00:00-06:00')
    expect(toEventIso('2026-12-01T20:00:00+01:00')).toBe('2026-12-01T20:00:00+01:00')
  })
  it('fecha sola = medianoche de El Salvador', () => {
    expect(toEventIso('2026-12-01')).toBe('2026-12-01T00:00:00-06:00')
  })
})

describe('toEventDatetimeLocal / formatEventDateTime', () => {
  it('ida y vuelta consistente, independiente de la TZ del proceso', () => {
    const iso = toEventIso('2026-12-01T20:00')
    expect(toEventDatetimeLocal(iso)).toBe('2026-12-01T20:00')
    expect(toEventDatetimeLocal('2026-12-02T02:00:00Z')).toBe('2026-12-01T20:00')
  })
  it('el correo muestra la hora de El Salvador aunque el servidor esté en UTC', () => {
    const s = formatEventDateTime('2026-12-02T02:00:00Z')
    expect(s).toMatch(/(20:00|8:00)/)
    expect(EVENT_TZ).toBe('America/El_Salvador')
  })
  it('valor inválido devuelve vacío', () => {
    expect(toEventDatetimeLocal('x')).toBe('')
  })
})
