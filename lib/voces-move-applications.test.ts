import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, unknown>
const state = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }))

// Fake mínimo de supabase sobre un arreglo en memoria (una sola tabla).
vi.mock('@/lib/supabase', () => {
  const from = () => {
    let mode: 'select' | 'update' | 'insert' = 'select'
    let patch: Row = {}
    const exec = (col: string, vals: unknown[]) => {
      if (mode === 'update') {
        state.rows.forEach((r) => { if (vals.includes(r[col])) Object.assign(r, patch) })
        return Promise.resolve({ error: null })
      }
      return Promise.resolve({ data: state.rows.filter((r) => vals.includes(r[col])).map((r) => ({ ...r })), error: null })
    }
    const q = {
      select: () => q,
      update: (p: Row) => { mode = 'update'; patch = p; return q },
      insert: (row: Row) => { state.rows.push({ ...row }); return Promise.resolve({ error: null }) },
      in: (col: string, vals: unknown[]) => exec(col, vals),
      eq: (col: string, val: unknown) => exec(col, [val]),
    }
    return q
  }
  return { supabase: { from } }
})

import { moveApplicationsInTable } from './voces-move-applications'

const target = { id: 'cas_T', shareId: 'shareT' }
const app = (id: string, email: string, over: Row = {}): Row => ({
  id, email, casting_id: 'cas_S', share_id: 'shareS', first_name: id, last_name: 'X',
  phone: '1', country: 'AR', gender: 'Female', home_studio: true, online_sessions: false,
  audio_url: `https://x.supabase.co/storage/v1/object/public/voces-casting-files/${id}.mp3`,
  audio_link_original: 'https://orig', selected: true, selected_at: '2026-01-01', hidden: true,
  created_at: '2026-01-01T00:00:00Z', ...over,
})
const copyOpts = { keepOriginal: true, idPrefix: 'cap' }
const moveOpts = { keepOriginal: false, idPrefix: 'cap' }

beforeEach(() => { state.rows = [] })

describe('moveApplicationsInTable - copiar', () => {
  it('crea fila nueva en el destino y deja el original intacto', async () => {
    state.rows = [app('a', 'a@x.com')]
    const before = JSON.stringify(state.rows[0])
    const r = await moveApplicationsInTable('t', ['a'], target, copyOpts)
    expect(r.moved).toEqual(['a'])
    expect(state.rows).toHaveLength(2)
    expect(JSON.stringify(state.rows[0])).toBe(before)
    const copy = state.rows[1]
    expect(copy.id).toMatch(/^cap_/)
    expect(copy.id).not.toBe('a')
    expect(copy).toMatchObject({
      casting_id: 'cas_T', share_id: 'shareT', selected: false, selected_at: null, hidden: true,
      first_name: 'a', email: 'a@x.com', phone: '1', country: 'AR', gender: 'Female', home_studio: true,
      audio_url: state.rows[0].audio_url, audio_link_original: 'https://orig', created_at: '2026-01-01T00:00:00Z',
    })
  })

  it('omite (sin insertar) si el email ya postuló en el destino', async () => {
    state.rows = [app('a', ' ANA@x.com '), app('d', 'ana@x.com', { casting_id: 'cas_T', share_id: 'shareT' })]
    const r = await moveApplicationsInTable('t', ['a'], target, copyOpts)
    expect(r.moved).toEqual([])
    expect(r.skipped).toHaveLength(1)
    expect(state.rows).toHaveLength(2)
  })

  it('ids repetidos copian una vez; duplicado de email en el lote se omite; inexistentes y ya-en-destino se ignoran', async () => {
    state.rows = [app('a', 'a@x.com'), app('b', 'A@x.com'), app('c', 'c@x.com', { casting_id: 'cas_T', share_id: 'shareT' })]
    const r = await moveApplicationsInTable('t', ['a', 'a', 'b', 'zzz', 'c'], target, copyOpts)
    expect(r.moved).toEqual(['a'])
    expect(r.skipped.map((s) => s.id)).toEqual(['b'])
    expect(r.ignored).toBe(2)
    expect(state.rows).toHaveLength(4)
  })
})

describe('moveApplicationsInTable - mover', () => {
  it('actualiza casting_id/share_id, resetea selected y conserva hidden', async () => {
    state.rows = [app('a', 'a@x.com')]
    const r = await moveApplicationsInTable('t', ['a'], target, moveOpts)
    expect(r.moved).toEqual(['a'])
    expect(state.rows).toHaveLength(1)
    expect(state.rows[0]).toMatchObject({ casting_id: 'cas_T', share_id: 'shareT', selected: false, selected_at: null, hidden: true })
  })

  it('omite por email duplicado en el destino', async () => {
    state.rows = [app('a', 'a@x.com'), app('d', 'a@x.com', { casting_id: 'cas_T', share_id: 'shareT' })]
    const r = await moveApplicationsInTable('t', ['a'], target, moveOpts)
    expect(r.skipped).toHaveLength(1)
    expect(state.rows[0].casting_id).toBe('cas_S')
  })
})
