"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/app/voces/components/I18n";
import { useAuth } from "@/app/voces/components/AuthContext";
import PageContainer from "@/app/voces/components/admin/PageContainer";
import PageHeader from "@/app/voces/components/admin/PageHeader";
import RowActionsMenu from "@/app/voces/components/admin/RowActionsMenu";
import RoleBadge from "@/app/voces/components/admin/RoleBadge";

// Etapa 3 del rediseño del admin: contenedor único de ancho fijo, header
// consistente, tabla con filas de ~52px y hairlines, columna de rol como
// badge (antes: "Sí"/"No" en todas las filas), acciones de fila a un menú de
// tres puntos con la acción destructiva separada y en rojo (antes: 3
// botones por fila). Lógica, fetch calls y endpoints sin cambios.
//
// El formulario "Crear cliente" sigue embebido en la página por ahora — su
// salida a modal es la etapa 4, no esta.

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

  async function toggleAdmin(id: string, nextIsAdmin: boolean) {
    try {
      const res = await fetch("/api/voces/client/set-admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isAdmin: nextIsAdmin }) });
      const j = await res.json();
      if (res.ok && j?.ok) setClients((prev) => prev.map((x) => x.id === id ? { ...x, isAdmin: nextIsAdmin } : x));
    } catch {}
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
    <PageContainer>
      <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>{t("adminOnly")}</p>
    </PageContainer>
  );

  const thClass = "py-3 px-4 text-[11px] font-[600] uppercase tracking-wider text-left";
  const thStyle = { color: "var(--color-text-muted)" };
  const tdClass = "px-4";

  return (
    <PageContainer>
      <PageHeader title="Clientes" count={clients.length} countLabel={clients.length === 1 ? "cliente" : "clientes"} />

      {/* Create client — se queda embebido acá hasta la etapa 4 (modal) */}
      <div className="ds-card p-5 max-w-md mb-6">
        <h2 className="text-[14px] font-[500] mb-4" style={{ color: "var(--color-text-primary)" }}>
          {t("adminCreateClient")}
        </h2>
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
      <div className="ds-card overflow-hidden">
        {clientsLoading ? (
          <div className="flex items-center gap-2 text-[13px] p-5" style={{ color: "var(--color-text-muted)" }}>
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
                <tr style={{ borderBottom: "0.5px solid var(--color-border-default)" }}>
                  <th className={thClass} style={thStyle}>{t("email")}</th>
                  <th className={thClass} style={thStyle}>{t("name")}</th>
                  <th className={thClass} style={thStyle}>{t("created")}</th>
                  <th className={thClass} style={thStyle}>Rol</th>
                  <th className={thClass} style={{ ...thStyle, textAlign: "right" }}>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="h-[52px]" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
                    <td className={tdClass} style={{ color: "var(--color-text-primary)" }}>{c.email}</td>
                    <td className={tdClass} style={{ color: "var(--color-text-secondary)" }}>{c.name || ""}</td>
                    <td className={`${tdClass} whitespace-nowrap`} style={{ color: "var(--color-text-muted)" }}>{c.createdAt?.slice(0, 10) || ""}</td>
                    <td className={tdClass}>
                      <RoleBadge isAdmin={!!c.isAdmin} />
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <RowActionsMenu
                        actions={[
                          { label: c.isAdmin ? "Quitar admin" : "Hacer admin", onClick: () => toggleAdmin(c.id, !c.isAdmin) },
                          { label: t("resetPass"), onClick: () => resetPassword(c.id) },
                          { label: t("delete"), onClick: () => del(c.id), destructive: true },
                        ]}
                      />
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
    </PageContainer>
  );
}
