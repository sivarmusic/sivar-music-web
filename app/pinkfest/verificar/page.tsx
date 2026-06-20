'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Phase = 'ready' | 'starting' | 'scanning' | 'error'

export default function VerificarPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('ready')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (phase !== 'starting') return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let qr: any = null
    let done = false

    ;(async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')

        // El div debe existir en el DOM y tener display visible antes de este punto.
        // Como useEffect corre después del render, aquí ya está visible.
        qr = new Html5Qrcode('qr-scanner-target')

        await qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          (decoded: string) => {
            if (done) return
            done = true
            qr?.stop().catch(() => {}).finally(() => {
              try {
                const url = new URL(decoded)
                const token = url.pathname.split('/').filter(Boolean).pop()
                router.push(`/pinkfest/verificar/${token}`)
              } catch {
                router.push(`/pinkfest/verificar/${decoded}`)
              }
            })
          },
          () => {}
        )

        if (!done) setPhase('scanning')
      } catch (e) {
        if (!done) {
          const msg = e instanceof Error ? e.message : ''
          setErrorMsg(
            msg.toLowerCase().includes('permission')
              ? 'Permiso de cámara denegado. Habilitalo en la configuración del navegador.'
              : 'No se pudo iniciar la cámara. Probá recargar la página.'
          )
          setPhase('error')
        }
      }
    })()

    return () => {
      done = true
      qr?.stop().catch(() => {})
    }
  }, [phase, router])

  return (
    <div className="min-h-screen bg-[#0a0008] flex flex-col items-center px-4 pt-10 pb-10">
      {/* Header */}
      <div className="text-center mb-8">
        <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase mb-2">Pink Fest</p>
        <h1 className="text-white text-2xl font-bold">Verificar entrada</h1>
        <p className="text-white/50 text-sm mt-1">
          {phase === 'scanning' ? 'Apuntá la cámara al QR del asistente' : 'Escáner de QR'}
        </p>
      </div>

      {/*
        Este div SIEMPRE está en el DOM cuando phase != 'ready'.
        Html5Qrcode lo necesita visible en el momento que corre el effect.
        Usamos display inline style para que la librería lo encuentre.
      */}
      <div
        id="qr-scanner-target"
        style={{
          width: '100%',
          maxWidth: 360,
          display: phase === 'ready' || phase === 'error' ? 'none' : 'block',
        }}
      />

      {/* Estado: listo para empezar */}
      {phase === 'ready' && (
        <div className="w-full max-w-sm space-y-4">
          <div className="rounded-3xl bg-white/5 border border-white/10 p-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#F472B6]/15 flex items-center justify-center text-3xl">
              📷
            </div>
            <p className="text-white/60 text-sm text-center">
              Activá la cámara para escanear el QR de la entrada del asistente
            </p>
          </div>
          <button
            onClick={() => setPhase('starting')}
            className="w-full bg-[#F472B6] hover:bg-[#ec4899] active:scale-[0.98] text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all"
          >
            Activar cámara
          </button>
        </div>
      )}

      {/* Estado: iniciando */}
      {phase === 'starting' && (
        <div className="w-full max-w-sm h-64 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <p className="text-white/40 text-sm">Iniciando cámara...</p>
        </div>
      )}

      {/* Estado: error */}
      {phase === 'error' && (
        <div className="w-full max-w-sm space-y-4">
          <div className="rounded-2xl border border-red-400/25 bg-red-400/8 p-6 text-center">
            <p className="text-red-400 text-sm leading-relaxed">{errorMsg}</p>
          </div>
          <button
            onClick={() => { setErrorMsg(''); setPhase('ready') }}
            className="w-full border border-white/15 text-white/60 hover:text-white rounded-2xl py-3 text-sm transition"
          >
            Reintentar
          </button>
        </div>
      )}

      <button
        onClick={() => router.push('/pinkfest/admin')}
        className="mt-10 text-white/30 hover:text-white text-sm transition"
      >
        ← Volver al admin
      </button>
    </div>
  )
}
