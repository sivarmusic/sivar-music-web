import type { Metadata } from 'next'
import '../styles/admin.css'
import AdminChrome from './components/AdminChrome'

// Página privada/transaccional: no debe aparecer en buscadores.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminChrome>{children}</AdminChrome>
}
