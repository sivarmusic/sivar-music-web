"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/app/voces/components/AuthContext";

type DigestFreq = "off" | "daily" | "weekly" | "monthly";

type Prefs = {
  casting_cantante: boolean;
  casting_locutor: boolean;
  new_client: boolean;
  reel_request_freq: DigestFreq;
  new_locutor_freq: DigestFreq;
};

const DEFAULTS: Prefs = {
  casting_cantante: false,
  casting_locutor: false,
  new_client: false,
  reel_request_freq: "off",
  new_locutor_freq: "off",
};

const FREQ_OPTIONS: { value: DigestFreq; label: string }[] = [
  { value: "off", label: "Desactivado" },
  { value: "daily", label: "Resumen diario" },
  { value: "weekly", label: "Resumen semanal" },
  { value: "monthly", label: "Resumen mensual" },
];

const NAV = [
  {
    key: "cuenta",
    label: "Cuenta",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
  },
  {
    key: "notificaciones",
    label: "Notificaciones",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className="relative shrink-0 w-[44px] h-[24px] rounded-full transition-colors duration-200"
      style={{
        background: checked ? "rgb(232,76,43)" : "rgba(255,255,255,0.10)",
        border: "0.5px solid " + (checked ? "rgba(232,76,43,0.5)" : "rgba(255,255,255,0.08)"),
      }}
    >
      <span
        className="absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white transition-transform duration-200"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );
}

function FreqSelect({ value, onChange }: { value: DigestFreq; onChange: (v: DigestFreq) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as DigestFreq)}
      className="text-[13px] rounded-[8px] px-3 py-1.5 outline-none cursor-pointer"
      style={{
        background: "rgba(255,255,255,0.07)",
        border: "0.5px solid rgba(255,255,255,0.12)",
        color: value === "off" ? "var(--color-text-muted)" : "var(--color-text-primary)",
        minWidth: 160,
      }}
    >
      {FREQ_OPTIONS.map((o) => (
        <option key={o.value} value={o.value} style={{ background: "#1a1a1c" }}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{ border: "0.5px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)" }}
    >
      {children}
    </div>
  );
}

function Row({ label, description, right, last }: {
  label: string; description?: string; right: React.ReactNode; last?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-5 py-4"
      style={{ borderBottom: last ? "none" : "0.5px solid rgba(255,255,255,0.05)" }}
    >
      <div className="min-w-0">
        <div className="text-[14px] font-[450]" style={{ color: "var(--color-text-primary)" }}>{label}</div>
        {description && (
          <div className="text-[12px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{description}</div>
        )}
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-[600] mb-2" style={{ color: "var(--color-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
      {children}
    </p>
  );
}

function ConfiguracionInner() {
  const { client, isAdmin, loading: authLoading } = useAuth();
  const params = useSearchParams();
  const [section, setSection] = useState(params.get("section") ?? "cuenta");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (authLoading || !client) { setLoadingPrefs(false); return; }
    fetch("/api/voces/user/notification-prefs")
      .then((r) => r.json())
      .then((j) => { if (j.ok && j.prefs) setPrefs({ ...DEFAULTS, ...j.prefs }); })
      .finally(() => setLoadingPrefs(false));
  }, [client, authLoading]);

  const setToggle = (key: "casting_cantante" | "casting_locutor" | "new_client") => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  };

  const setFreq = (key: "reel_request_freq" | "new_locutor_freq", val: DigestFreq) => {
    setPrefs((p) => ({ ...p, [key]: val }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const r = await fetch("/api/voces/user/notification-prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (r.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <span className="text-[14px]" style={{ color: "var(--color-text-muted)" }}>Cargando…</span>
      </main>
    );
  }

  if (!client) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[15px] mb-4" style={{ color: "var(--color-text-secondary)" }}>
            Necesitás iniciar sesión para acceder a la configuración.
          </p>
          <a href="/voces/login" className="ds-btn-primary px-6">Iniciar sesión</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 md:px-8 py-10" style={{ color: "var(--color-text-primary)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-[22px] font-[600]">Configuración</h1>
        </div>

        <div className="flex gap-6 items-start">
          {/* Sidebar */}
          <nav
            className="w-[180px] shrink-0 rounded-[14px] overflow-hidden sticky top-[80px]"
            style={{ border: "0.5px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
          >
            {NAV.map((item) => {
              const active = section === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setSection(item.key)}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] text-left transition-colors duration-150"
                  style={{
                    color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    background: active ? "rgba(232,76,43,0.10)" : "transparent",
                    borderLeft: active ? "2px solid rgb(232,76,43)" : "2px solid transparent",
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  <span style={{ opacity: active ? 1 : 0.6 }}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">

            {/* ── Cuenta ── */}
            {section === "cuenta" && (
              <>
                <SectionLabel>Tu cuenta</SectionLabel>
                <SectionCard>
                  <Row label="Nombre" right={
                    <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>{client.name || "—"}</span>
                  } />
                  <Row label="Email" description="Las notificaciones se envían a este email" right={
                    <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>{client.email}</span>
                  } />
                  <Row label="Rol" last right={
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-[500]"
                      style={{
                        background: isAdmin ? "rgba(232,76,43,0.12)" : "rgba(255,255,255,0.07)",
                        color: isAdmin ? "rgb(232,76,43)" : "var(--color-text-secondary)",
                        border: isAdmin ? "0.5px solid rgba(232,76,43,0.3)" : "0.5px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {isAdmin ? "Admin" : "Cliente"}
                    </span>
                  } />
                </SectionCard>
              </>
            )}

            {/* ── Notificaciones ── */}
            {section === "notificaciones" && (
              <>
                {loadingPrefs ? (
                  <div className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>Cargando…</div>
                ) : !isAdmin ? (
                  <div
                    className="rounded-[12px] px-5 py-4 text-[13px]"
                    style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)", color: "var(--color-text-muted)" }}
                  >
                    No hay notificaciones disponibles para tu cuenta.
                  </div>
                ) : (
                  <>
                    {/* Instant */}
                    <div>
                      <SectionLabel>Inmediatas</SectionLabel>
                      <p className="text-[12px] mb-3" style={{ color: "var(--color-text-muted)" }}>
                        Se envía un email en el momento en que ocurre el evento.
                      </p>
                      <SectionCard>
                        <Row
                          label="Postulaciones de cantantes"
                          description="Cuando un cantante envía su audio de casting"
                          right={<Toggle checked={prefs.casting_cantante} onChange={() => setToggle("casting_cantante")} />}
                        />
                        <Row
                          label="Postulaciones de locutores"
                          description="Cuando un locutor envía su audio de casting"
                          right={<Toggle checked={prefs.casting_locutor} onChange={() => setToggle("casting_locutor")} />}
                        />
                        <Row
                          label="Nuevos clientes"
                          description="Cuando se registra un nuevo cliente"
                          last
                          right={<Toggle checked={prefs.new_client} onChange={() => setToggle("new_client")} />}
                        />
                      </SectionCard>
                    </div>

                    {/* Digest */}
                    <div>
                      <SectionLabel>Resúmenes agrupados</SectionLabel>
                      <p className="text-[12px] mb-3" style={{ color: "var(--color-text-muted)" }}>
                        Se acumulan y llegan en un solo email. Si dos tipos tienen la misma frecuencia, se combinan en un único correo.
                      </p>
                      <SectionCard>
                        <Row
                          label="Solicitudes de actualización de reel"
                          description="Cuando un locutor pide cambiar su demo"
                          right={
                            <FreqSelect
                              value={prefs.reel_request_freq}
                              onChange={(v) => setFreq("reel_request_freq", v)}
                            />
                          }
                        />
                        <Row
                          label="Solicitudes de alta de locutores"
                          description="Cuando un locutor envía su formulario para darse de alta"
                          last
                          right={
                            <FreqSelect
                              value={prefs.new_locutor_freq}
                              onChange={(v) => setFreq("new_locutor_freq", v)}
                            />
                          }
                        />
                      </SectionCard>

                      {/* Visual hint when both have same freq */}
                      {prefs.reel_request_freq !== "off" &&
                        prefs.reel_request_freq === prefs.new_locutor_freq && (
                        <div
                          className="mt-3 rounded-[10px] px-4 py-2.5 text-[12px] flex items-center gap-2"
                          style={{ background: "rgba(232,76,43,0.07)", border: "0.5px solid rgba(232,76,43,0.15)", color: "rgba(255,255,255,0.5)" }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgb(232,76,43)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                          Ambos tipos tienen la misma frecuencia — llegarán en un único email combinado.
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button onClick={save} disabled={saving} className="ds-btn-primary px-6">
                        {saving ? "Guardando…" : "Guardar"}
                      </button>
                      {saved && (
                        <span className="text-[13px]" style={{ color: "rgb(74,222,128)" }}>Guardado</span>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ConfiguracionPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <span className="text-[14px]" style={{ color: "var(--color-text-muted)" }}>Cargando…</span>
      </main>
    }>
      <ConfiguracionInner />
    </Suspense>
  );
}
