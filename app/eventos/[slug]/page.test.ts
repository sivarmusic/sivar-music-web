import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({ ev: null as null | Record<string, unknown>, throws: false }))
vi.mock('@/lib/eventsPublic', () => ({
  getPublicEvent: async () => { if (m.throws) throw new Error('db'); return m.ev },
}))
vi.mock('./EventClient', () => ({ default: () => null }))

import { generateMetadata } from './page'

const run = () => generateMetadata({ params: Promise.resolve({ slug: 'show' }) })

beforeEach(() => { m.throws = false })

describe('generateMetadata /eventos/[slug]', () => {
  it('Open Graph y Twitter con la imagen del evento y canonical', async () => {
    m.ev = {
      slug: 'show', nombre: 'Gran Show', descripcion: 'Una noche única', venue: 'Teatro',
      fecha: '2026-12-02T02:00:00Z', imagen_url: 'https://x.supabase.co/storage/v1/object/public/event-images/show/cover.jpg',
    }
    const md = await run()
    expect(md.title).toBe('Gran Show — Sivar Music')
    expect(md.description).toBe('Una noche única')
    expect(md.alternates?.canonical).toBe('/eventos/show')
    expect(md.openGraph).toMatchObject({ title: 'Gran Show — Sivar Music', url: '/eventos/show' })
    expect((md.openGraph as { images: { url: string }[] }).images[0].url).toContain('cover.jpg')
    expect(md.twitter).toMatchObject({ card: 'summary_large_image' })
  })

  it('sin descripción usa fecha en hora de El Salvador y lugar; sin imagen card summary', async () => {
    m.ev = { slug: 'show', nombre: 'Show', descripcion: null, venue: 'Teatro', fecha: '2026-12-02T02:00:00Z', imagen_url: null }
    const md = await run()
    expect(String(md.description)).toContain('Teatro')
    expect(md.twitter).toMatchObject({ card: 'summary' })
  })

  it('evento inexistente u oculto: noindex', async () => {
    m.ev = null
    expect((await run()).robots).toMatchObject({ index: false })
  })

  it('si la DB falla no lanza', async () => {
    m.throws = true
    expect((await run()).robots).toMatchObject({ index: false })
  })
})
