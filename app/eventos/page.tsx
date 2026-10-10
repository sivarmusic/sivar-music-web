import type { Metadata } from 'next'
import EventosClient from './EventosClient'

const TITLE = 'Eventos — Sivar Music'
const DESCRIPTION = 'Conciertos y eventos de Sivar Music Group. Reservá tus entradas en línea.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/eventos' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/eventos',
    siteName: 'Sivar Music',
    type: 'website',
    locale: 'es_SV',
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

export default function EventosPage() {
  return <EventosClient />
}
