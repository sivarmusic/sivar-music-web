import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({
  apps: { voces_casting_applications: [] as { audio_url: string }[], voces_casting_cantante_applications: [] as { audio_url: string }[] },
  trash: [] as Record<string, unknown>[],
  fail: false,
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const q = {
        select: () => q,
        in: (_c: string, vals: string[]) =>
          Promise.resolve({
            data: (state.apps as Record<string, { audio_url: string }[]>)[table].filter((r) => vals.includes(r.audio_url)),
            error: state.fail ? { message: 'boom' } : null,
          }),
        neq: () => q,
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: state.trash, error: null }).then(res),
      }
      return q
    },
  },
}))

import { referencedUrls } from './voces-audio-refs'

beforeEach(() => {
  state.apps = { voces_casting_applications: [], voces_casting_cantante_applications: [] }
  state.trash = []
  state.fail = false
})

describe('referencedUrls', () => {
  it('detecta una URL usada por otra postulación', async () => {
    state.apps.voces_casting_applications = [{ audio_url: 'u1' }]
    expect([...(await referencedUrls(['u1', 'u2']))]).toEqual(['u1'])
  })
  it('detecta una URL usada por un ítem de papelera', async () => {
    state.trash = [{ files: ['u2'] }]
    expect([...(await referencedUrls(['u1', 'u2']))]).toEqual(['u2'])
  })
  it('fail-safe: ante un error de consulta considera todo referenciado', async () => {
    state.fail = true
    expect([...(await referencedUrls(['u1']))]).toEqual(['u1'])
  })
})
