'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Páginas de gestión completa (eventos, cortesías, artistas) son solo para role: 'admin'.
// El verificador nunca debe poder cargarlas, aunque algún endpoint de datos públicos no 401ee.
export function useRequireAdmin() {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/pinkfest/auth/session')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { router.push('/eventos/admin/login'); return }
        if (data.role !== 'admin') { router.push('/eventos/admin'); return }
      })
  }, [router])
}
