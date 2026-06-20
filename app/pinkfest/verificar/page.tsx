'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function VerificarPage() {
  const router = useRouter()
  const qrRef = useRef<unknown>(null)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(true)

  useEffect(() => {
    let stopped = false

    async function start() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        const qr = new Html5Qrcode('qr-reader-element')
        qrRef.current = qr

        await qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded: string) => {
            if (stopped) return
            stopped = true
            qr.stop().catch(() => {}).finally(() => {
              try {
                const url = new URL(decoded)
                const parts = url.pathname.split('/').filter(Boolean)
                const token = parts[parts.length - 1]
                router.push(`/pinkfest/verificar/${token}`)
              } catch {
                router.push(`/pinkfest/verificar/${decoded}`)
              }
            })
          },
          () => {}
        )
        setStarting(false)
      } catch (e) {
        setError(
          e instanceof Error && e.message.includes('Permission')
            ? 'Permiso de cámara denegado. Habilitalo en la configuración del navegador.'
            : 'No se pudo iniciar la cámara.'
        )
        setStarting(false)
      }
    }

    start()

    return () => {
      stopped = true
      if (qrRef.current) {
        (qrRef.current as { stop: () => Promise<void> }).stop().catch(() => {})
      }
    }
  }, [router])

  return (
    <div className="min-h-screen bg-[#0a0008] flex flex-col items-center px-4 pt-12 pb-10">
      <div className="text-center mb-8">
        <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase mb-2">Pink Fest</p>
        <h1 className="text-white text-2xl font-bold">Verificar entrada</h1>
        <p className="text-white/50 text-sm mt-1">Apuntá la cámara al QR del asistente</p>
      </div>

      {error ? (
        <div className="w-full max-w-sm rounded-2xl border border-red-400/25 bg-red-400/8 p-6 text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : (
        <div className="w-full max-w-sm">
          {starting && (
            <div className="rounded-2xl bg-white/5 border border-white/10 h-64 flex items-center justify-center mb-4">
              <p className="text-white/40 text-sm">Iniciando cámara...</p>
            </div>
          )}
          <div
            id="qr-reader-element"
            className={`w-full rounded-2xl overflow-hidden ${starting ? 'hidden' : ''}`}
          />
        </div>
      )}

      <div className="mt-8 flex gap-3">
        <button
          onClick={() => router.push('/pinkfest/admin')}
          className="text-white/35 hover:text-white text-xs uppercase tracking-wider transition"
        >
          ← Admin
        </button>
      </div>
    </div>
  )
}
