'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useLanguage } from '@/lib/i18n'

const RESEND_WAIT = 60

function VerificarContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [seconds, setSeconds] = useState(RESEND_WAIT)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (seconds <= 0) return
    const id = setTimeout(() => setSeconds(s => s - 1), 1000)
    return () => clearTimeout(id)
  }, [seconds])

  async function handleResend() {
    if (!email || sending) return
    setSending(true); setError(''); setSent(false)
    try {
      const { error: err } = await supabaseBrowser.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/eventos/mi-cuenta/login` },
      })
      if (err) throw new Error(err.message)
      setSent(true)
      setSeconds(RESEND_WAIT)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('verify.errorResend'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0008] text-white flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm text-center space-y-6">

        <div>
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase mb-3">Sivar Events</p>
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-white text-2xl font-bold mb-3">{t('verify.title')}</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            {t('verify.body1')}{' '}
            {email && <strong className="text-white">{email}</strong>}.{' '}
            {t('verify.body2')}
          </p>
        </div>

        <div className="bg-white/4 border border-white/10 rounded-2xl p-5 text-left space-y-4">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">{t('verify.notReceived')}</p>
          <p className="text-white/50 text-sm leading-relaxed">
            {t('verify.checkSpam')}
          </p>

          {sent && !error && (
            <p className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-xl px-3 py-2 text-center">
              {t('verify.resent')}
            </p>
          )}
          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2 text-center">
              {error}
            </p>
          )}

          {seconds > 0 ? (
            <div className="flex items-center justify-between">
              <p className="text-white/30 text-sm">{t('verify.resend')}</p>
              <div className="flex items-center gap-2">
                <div className="relative w-8 h-8">
                  <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
                    <circle
                      cx="16" cy="16" r="13" fill="none"
                      stroke="#F472B6" strokeWidth="2.5"
                      strokeDasharray={`${2 * Math.PI * 13}`}
                      strokeDashoffset={`${2 * Math.PI * 13 * (1 - seconds / RESEND_WAIT)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-white/50 text-[10px] font-bold">
                    {seconds}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleResend}
              disabled={sending}
              className="w-full bg-white/8 hover:bg-[#F472B6]/20 hover:text-[#F472B6] disabled:opacity-50 text-white/70 text-sm font-semibold rounded-xl py-2.5 transition-all"
            >
              {sending ? t('verify.sending') : t('verify.resend')}
            </button>
          )}
        </div>

        <Link
          href="/eventos/mi-cuenta/login"
          className="block w-full bg-[#F472B6] hover:bg-[#ec4899] text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all text-center"
        >
          {t('verify.confirmed')}
        </Link>

        <Link href="/eventos" className="block text-white/25 hover:text-white text-xs transition">
          {t('verify.backToEvents')}
        </Link>
      </div>
    </div>
  )
}

export default function VerificarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0008] flex items-center justify-center">
        <p className="text-white/30 text-sm">Cargando...</p>
      </div>
    }>
      <VerificarContent />
    </Suspense>
  )
}
