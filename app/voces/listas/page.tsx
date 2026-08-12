"use client";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/app/voces/components/I18n";

export default function ListasPage() {
  const { t } = useI18n();
  const [all, setAll] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [renameName, setRenameName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/voces/playlist/list", { cache: "no-store" });
        const j = await res.json().catch(() => null);
        if (res.ok && j?.ok) {
          setAll(j.playlists || []);
        } else {
          setError(j?.error || t("notAvailable"));
        }
      } catch {
        setError(t("notAvailable"));
      } finally {
        setLoaded(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!all.length) {
      if (activeId) setActiveId("");
      return;
    }
    if (!activeId || !all.some((p) => p.id === activeId)) {
      setActiveId(all[0].id);
    }
  }, [all, activeId]);

  const active = useMemo(() => all.find((p) => p.id === activeId) || null, [all, activeId]);

  useEffect(() => {
    if (active) {
      setRenameName(active.name || "");
    } else {
      setRenameName("");
    }
  }, [activeId, active?.name]);

  useEffect(() => {
    setShareUrl(null);
  }, [activeId]);

  const share = async () => {
    if (!active) return;
    setSharing(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/voces/playlist/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId: active.id }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setError(j?.error || t("notAvailable"));
        return;
      }
      setShareUrl(j.url);
    } catch {
      setError(t("notAvailable"));
    } finally {
      setSharing(false);
    }
  };

  async function createProject() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/voces/playlist/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setError(j?.error || t("notAvailable"));
        return;
      }
      const created = j.playlist;
      if (created) {
        setAll((prev) => [created, ...prev]);
        setActiveId(created.id);
        setRenameName(created.name || "");
      }
      setNewName("");
      setInfo(t("projectCreated"));
    } catch {
      setError(t("notAvailable"));
    } finally {
      setCreating(false);
    }
  }

  async function renameProject() {
    if (!active) return;
    const trimmed = renameName.trim();
    if (!trimmed || trimmed === active.name) return;
    setRenaming(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/voces/playlist/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId: active.id, name: trimmed }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setError(j?.error || t("notAvailable"));
        return;
      }
      const updated = j.playlist;
      if (updated) {
        setAll((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setRenameName(updated.name || "");
      }
      setInfo(t("projectRenamed"));
    } catch {
      setError(t("notAvailable"));
    } finally {
      setRenaming(false);
    }
  }

  async function deleteProject() {
    if (!active) return;
    if (typeof window !== "undefined" && !window.confirm(t("confirmDeleteProject"))) return;
    setDeleting(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/voces/playlist/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId: active.id }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setError(j?.error || t("notAvailable"));
        return;
      }
      setAll((prev) => prev.filter((p) => p.id !== active.id));
      setShareUrl(null);
      setInfo(t("projectDeleted"));
    } catch {
      setError(t("notAvailable"));
    } finally {
      setDeleting(false);
    }
  }

  async function removeItem(it: any, index: number) {
    if (!active) return;
    const key = it.id || `${index}`;
    setRemovingId(key);
    setError(null);
    setInfo(null);
    try {
      const payload: Record<string, unknown> = { playlistId: active.id };
      if (it.id) payload.itemId = it.id;
      else payload.index = index;
      const res = await fetch("/api/voces/playlist/remove-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setError(j?.error || t("notAvailable"));
        return;
      }
      const updated = j.playlist;
      if (updated) {
        setAll((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
      setInfo(t("removedFromProject"));
    } catch {
      setError(t("notAvailable"));
    } finally {
      setRemovingId(null);
    }
  }

  const canCreate = !!newName.trim();
  const canRename = !!renameName.trim() && !!active && renameName.trim() !== active.name;

  return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }}>
      <div className="relative overflow-hidden" style={{ borderBottom: "0.5px solid var(--color-border-default)" }}>
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <h1 className="text-[32px] md:text-[44px] leading-none tracking-[-0.02em]" style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}>
            {t("myList")}
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: "var(--color-text-muted)" }}>Tus proyectos guardados</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {error && (
          <p className="text-[13px] mb-5 px-4 py-3 rounded-[10px]" style={{ color: "var(--color-accent)", background: "rgba(232,76,43,0.08)", border: "0.5px solid rgba(232,76,43,0.20)" }}>
            {error}
          </p>
        )}
        {info && (
          <p className="text-[13px] mb-5 px-4 py-3 rounded-[10px]" style={{ color: "#4ade80", background: "rgba(74,222,128,0.06)", border: "0.5px solid rgba(74,222,128,0.20)" }}>
            {info}
          </p>
        )}

        {!loaded ? (
          <div className="flex items-center gap-3 py-16" style={{ color: "var(--color-text-muted)" }}>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-[13px]">{t("loading")}</span>
          </div>
        ) : all.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-[12px] flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid var(--color-border-default)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--color-text-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-[14px]" style={{ color: "var(--color-text-muted)" }}>{t("noProjects")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {all.map((p: any, idx: number) => (
              <a
                key={p.id}
                href={`/voces/proyecto/${p.id}`}
                className="group ds-card overflow-hidden card-enter block"
                style={{ animationDelay: `${Math.min(idx * 60, 400)}ms` }}
              >
                <div
                  className="h-[120px] flex items-center justify-center"
                  style={{ background: "linear-gradient(to bottom, rgba(232,76,43,0.06), rgba(255,255,255,0.02))", borderBottom: "0.5px solid var(--color-border-default)" }}
                >
                  <img src="/SMG PNG.png" alt="Sivar Music" className="h-9 w-auto opacity-30 group-hover:opacity-50 transition-opacity" />
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <span className="text-[14px] font-[500] truncate" style={{ color: "var(--color-text-primary)" }}>
                    {p.name || "Proyecto"}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--color-text-muted)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
