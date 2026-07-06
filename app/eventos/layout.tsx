import type { Metadata } from 'next'
import { LanguageProvider } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Eventos — Sivar Music',
  description: 'Compra tus entradas a los eventos de Sivar Music Group',
}

export default function EventosLayout({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}
