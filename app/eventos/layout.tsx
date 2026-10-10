import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { LanguageProvider } from '@/lib/i18n'
import EventosShell from './components/EventosShell'
import './styles/eventos.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://sivarmusic.com'),
  title: 'Eventos — Sivar Music',
  description: 'Compra tus entradas a los eventos de Sivar Music Group',
}

// Rótulo del sistema de diseño de Sivar Eventos. Solo se carga bajo /eventos.
// Geist y Geist Mono ya vienen del layout raíz (--font-geist-sans / --font-geist-mono).
const display = localFont({
  src: [
    { path: './fonts/BigShouldersDisplay-700.woff2', weight: '700', style: 'normal' },
    { path: './fonts/BigShouldersDisplay-800.woff2', weight: '800', style: 'normal' },
    { path: './fonts/BigShouldersDisplay-900.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-big-shoulders',
  display: 'swap',
})

export default function EventosLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <EventosShell fontClassName={display.variable}>{children}</EventosShell>
    </LanguageProvider>
  )
}
