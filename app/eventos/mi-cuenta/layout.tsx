import type { Metadata } from 'next'

// Página privada/transaccional: no debe aparecer en buscadores.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function NoIndexLayout({ children }: { children: React.ReactNode }) {
  return children
}
