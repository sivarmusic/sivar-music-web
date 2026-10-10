import type { MetadataRoute } from 'next'
import { listVisibleEventSlugs } from '@/lib/eventsPublic'

const SITE = 'https://sivarmusic.com'

// Siempre fresco: los eventos se publican/ocultan desde el admin.
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE}/eventos`, changeFrequency: 'daily', priority: 0.8 },
  ]
  try {
    const events = await listVisibleEventSlugs()
    for (const e of events) {
      entries.push({
        url: `${SITE}/eventos/${e.slug}`,
        ...(e.updated ? { lastModified: new Date(e.updated) } : {}),
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
  } catch {
    // Sin DB: se publica al menos el listado.
  }
  return entries
}
