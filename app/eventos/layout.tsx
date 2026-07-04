import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Eventos — Sivar Music',
  description: 'Compra tus entradas a los eventos de Sivar Music Group',
}

export default function EventosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
