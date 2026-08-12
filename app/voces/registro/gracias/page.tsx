"use client";
export default function RegistroGraciasPage() {
  return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }} className="px-4 py-16 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="rounded-[20px] p-10 flex flex-col items-center gap-6"
          style={{ background: "var(--color-bg-card)", border: "0.5px solid var(--color-border-default)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(232,76,43,0.12)", border: "0.5px solid rgba(232,76,43,0.25)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8" style={{ color: "var(--color-accent)" }}>
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h1 className="text-[26px] tracking-[-0.02em] mb-2"
              style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}>
              ¡Registro enviado!
            </h1>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              Recibimos tu información. El equipo de Sivar Music la revisará y te contactaremos pronto.
            </p>
          </div>
          <a href="/voces" className="ds-btn-secondary text-[13px] px-6 py-2.5">
            Volver al catálogo
          </a>
        </div>
      </div>
    </main>
  );
}
