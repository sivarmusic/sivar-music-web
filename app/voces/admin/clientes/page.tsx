"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/app/voces/components/I18n";
import { useAuth } from "@/app/voces/components/AuthContext";

// Etapa 2 del rediseño del admin: split de app/voces/admin/clients/page.tsx
// en dos páginas independientes. Esta se queda con la creación de clientes y
// la tabla de clientes — el panel "Perfiles de locutores" que vivía acá
// también se movió a su propia página, app/voces/admin/locutores/page.tsx.
// Contenido y lógica sin cambios, solo la ubicación.

export default function AdminClientesPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/voces/login");
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) refreshClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function refreshClients() {
    setClientsLoading(true);
    try {
      const res = await fetch("/api/voces/client/list", { cache: "no-store" });
      const j = await res.json();
      if (j?.ok) setClients(j.clients || []);
    } finally { setClientsLoading(false); }
  }

  async function del(id: string) {
    if (!confirm("Delete client?")) return;
    const r = await fetch("/api/voces/client/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const j = await r.json();
    if (j?.ok) refreshClients();
  }

  async function resetPassword(id: string) {
    const p = prompt("New password");
    if (!p) return;
    const r = await fetch("/api/voces/client/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, password: p }) });
    const j = await r.json();
    if (j?.ok) alert("Password updated");
  }

  const createClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/voces/client/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name, password }) });
    const j = await res.json();
    setMsg(j?.ok ? "Cliente creado" : (j?.error || "Error"));
    if (j?.ok) refreshClients();
  };

  if (authLoading || !isAdmin) return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }}>
      <p className="p-6 text-[13px]" style={{ color: "var(--color-text-muted)" }}>{t("adminOnly")}</p>
    </main>
  );

  const sectionClass = "rounded-[16px] p-6";
  const sectionStyle = { background: "var(--color-bg-card)", border: "0.5px solid var(--color-border-default)" };
  const thClass = "py-2 pr-4 text-[11px] font-[600] uppercase tracking-wider";
  const thStyle = { color: "var(--color-text-muted)" };

  return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }} className="px-4 py-8">

      {/* Create client */}
      <div className={`max-w-xl mx-auto ${sectionClass}`} style={sectionStyle}>
        <h1 className="text-[18px] font-[500] mb-5" style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}>
          {t("adminCreateClient")}
        </h1>
        {msg && (
          <p className="text-[13px] mb-4 px-3 py-2.5 rounded-[8px]"
            style={msg === "Cliente creado"
              ? { color: "#4ade80", background: "rgba(74,222,128,0.06)", border: "0.5px solid rgba(74,222,128,0.20)" }
              : { color: "var(--color-accent)", background: "rgba(232,76,43,0.08)", border: "0.5px solid rgba(232,76,43,0.20)" }
            }>
            {msg}
          </p>
        )}
        <form onSubmit={createClient} className="space-y-3">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("email")} className="ds-input [color-scheme:dark]" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("nameOptional")} className="ds-input [color-scheme:dark]" />
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("password")}
              className="ds-input pr-14 [color-scheme:dark]"
            />
            <button type="button" onClick={() => setShowPass((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-[500]"
              style={{ color: "var(--color-text-muted)" }}>
              {showPass ? "Hide" : "Show"}
            </button>
          </div>
          <button type="submit" className="ds-btn-primary text-[13px] py-2 px-5">{t("create")}</button>
        </form>
      </div>

      {/* Clients table */}
      <div className={`max-w-4xl mx-auto mt-6 ${sectionClass}`} style={sectionStyle}>
        <h2 className="text-[15px] font-[500] mb-5" style={{ color: "var(--color-text-primary)" }}>{t("clientsTitle")}</h2>
        {clientsLoading ? (
          <div className="flex items-center gap-2 text-[13px]" style={{ color: "var(--color-text-muted)" }}>
            <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            {t("loading")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr>
                  <th className={thClass} style={thStyle}>{t("email")}</th>
                  <th className={thClass} style={thStyle}>{t("name")}</th>
                  <th className={thClass} style={thStyle}>{t("created")}</th>
                  <th className={thClass} style={thStyle}>Admin</th>
                  <th className={thClass} style={thStyle}>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
                    <td className="py-3 pr-4" style={{ color: "var(--color-text-primary)" }}>{c.email}</td>
                    <td className="py-3 pr-4" style={{ color: "var(--color-text-secondary)" }}>{c.name || ""}</td>
                    <td className="py-3 pr-4 whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>{c.createdAt?.slice(0, 10) || ""}</td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-[500]"
                        style={c.isAdmin
                          ? { background: "rgba(74,222,128,0.08)", border: "0.5px solid rgba(74,222,128,0.20)", color: "#4ade80" }
                          : { background: "var(--color-bg-subtle)", border: "0.5px solid var(--color-border-default)", color: "var(--color-text-muted)" }
                        }>
                        {c.isAdmin ? "Sí" : "No"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/voces/client/set-admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, isAdmin: !c.isAdmin }) });
                              const j = await res.json();
                              if (res.ok && j?.ok) setClients((prev) => prev.map((x) => x.id === c.id ? { ...x, isAdmin: !c.isAdmin } : x));
                            } catch {}
                          }}
                          className="ds-btn-secondary text-[11px] py-0.5 px-2.5"
                        >
                          {c.isAdmin ? "Quitar admin" : "Hacer admin"}
                        </button>
                        <button onClick={() => resetPassword(c.id)} className="ds-btn-secondary text-[11px] py-0.5 px-2.5">
                          {t("resetPass")}
                        </button>
                        <button onClick={() => del(c.id)} className="ds-btn-secondary text-[11px] py-0.5 px-2.5"
                          style={{ color: "var(--color-accent)", borderColor: "rgba(232,76,43,0.25)" }}>
                          {t("delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[13px]" style={{ color: "var(--color-text-muted)" }}>{t("noClients")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
