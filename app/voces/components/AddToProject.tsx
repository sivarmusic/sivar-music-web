"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/app/voces/components/I18n";

type ProjectItem = {
  type?: "locutor" | "cantante";
  cantanteId?: string;
  nombre: string;
  idioma: string;
  genero: string;
  estilo: string;
  edad?: string;
  demo: string;
  pais?: string;
};

const AVATAR_PLACEHOLDER = "/avatar-placeholder.svg";

export default function AddToProject({
  item,
  category = "locutor",
  align = "right",
}: {
  item: ProjectItem;
  category?: "locutor" | "cantante";
  align?: "left" | "right";
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [client, setClient] = useState<any | null>(null);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const [dropPos, setDropPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (dropRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onEsc(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  async function ensureLoaded() {
    if (client === undefined) return;
    setLoading(true);
    setError(null);
    try {
      const resMe = await fetch("/api/voces/client/me", { cache: "no-store" });
      const jMe = await resMe.json();
      setClient(jMe?.client || null);
      if (jMe?.client) {
        const res = await fetch(`/api/voces/playlist/list?category=${category}`, { cache: "no-store" });
        const j = await res.json().catch(() => null);
        if (res.ok && j?.ok) setPlaylists(j.playlists || []);
      }
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function addTo(playlistId?: string): Promise<boolean> {
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/voces/playlist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistId,
          item: {
            type: item.type ?? category,
            cantanteId: item.cantanteId,
            nombre: item.nombre, idioma: item.idioma, genero: item.genero,
            estilo: item.estilo, edad: item.edad ?? "", foto: AVATAR_PLACEHOLDER,
            demo: item.demo, pais: item.pais || "",
          },
        }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) { setError(j?.error || "No se pudo agregar"); return false; }
      setInfo(t("addedToProject"));
      setOpen(false);
      return true;
    } catch {
      setError("No se pudo agregar");
      return false;
    }
  }

  async function createProject() {
    const name = newName.trim();
    if (!name) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/voces/playlist/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) { setError(j?.error || "No se pudo crear"); return; }
      setPlaylists((prev) => [j.playlist, ...prev]);
      setNewName("");
      try { await addTo(j.playlist?.id); } catch {}
    } catch {
      setError("No se pudo crear");
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
  }

  const dropdown = open && mounted ? createPortal(
    <div
      ref={dropRef}
      className="w-72 rounded-[14px] p-3"
      style={{
        position: "fixed",
        top: dropPos.top,
        right: dropPos.right,
        zIndex: 9999,
        background: "rgba(14,14,16,0.98)",
        border: "0.5px solid rgba(255,255,255,0.10)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div
        className="text-[13px] font-[500] mb-3"
        style={{ color: "var(--color-text-primary)" }}
      >
        {t("addToProject")}
      </div>

      {loading ? (
        <div className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>{t("loading")}</div>
      ) : !client ? (
        <div className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
          <p className="mb-3">{t("signInToAdd")}</p>
          <a href="/voces/login" className="ds-btn-primary block text-center">{t("signIn")}</a>
        </div>
      ) : (
        <>
          {playlists.length > 0 ? (
            <ul className="mb-3 max-h-48 overflow-auto">
              {playlists.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => addTo(p.id)}
                    className="w-full text-left rounded-[8px] px-3 py-2 text-[13px] transition-colors duration-200 hover:bg-white/[0.06]"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] mb-3" style={{ color: "var(--color-text-muted)" }}>{t("noProjects")}</p>
          )}

          <div className="pt-3" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
            <div className="text-[11px] font-[500] mb-2" style={{ color: "var(--color-text-muted)" }}>
              {t("newProject")}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("projectNamePlaceholder")}
                className="flex-1 rounded-[8px] px-2.5 py-1.5 text-[13px] focus:outline-none transition-colors [color-scheme:dark]"
                style={{
                  background: "var(--color-bg-subtle)",
                  border: "0.5px solid var(--color-border-subtle)",
                  color: "var(--color-text-primary)",
                }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createProject(); } }}
              />
              <button
                onClick={createProject}
                disabled={loading}
                className="ds-btn-secondary shrink-0 text-[12px] py-1.5 px-3"
              >
                {t("create")}
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-2 text-[11px]" style={{ color: "var(--color-accent)" }}>{error}</p>
          )}
          {info && (
            <p className="mt-2 text-[11px]" style={{ color: "#4ade80" }}>{info}</p>
          )}
        </>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div className={`absolute top-3 z-10 ${align === "left" ? "left-3" : "right-3"}`}>
      <button
        ref={btnRef}
        aria-label={t("addToProject")}
        onClick={async () => {
          handleOpen();
          const next = !open;
          setOpen(next);
          if (next) await ensureLoaded();
        }}
        className="rounded-full p-2 transition-colors duration-200 hover:bg-white/[0.08]"
        style={{
          background: "rgba(10,10,11,0.70)",
          border: "0.5px solid rgba(255,255,255,0.10)",
          color: "var(--color-text-muted)",
        }}
        title={t("addToProject")}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
      {dropdown}
    </div>
  );
}
