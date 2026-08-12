"use client";
import { useEffect, useRef, useState } from "react";
import LanguageToggle from "@/app/voces/components/LanguageToggle";
import { useI18n } from "@/app/voces/components/I18n";
import NotificationBell from "@/app/voces/components/NotificationBell";
import { useAuth } from "@/app/voces/components/AuthContext";
import { useMobileMenu } from "@/app/voces/components/MobileMenuContext";

const LOGO_SRC = encodeURI("/SIVAR MUSIC GROUP WHITE.svg");

export default function HeaderBar() {
  const { t } = useI18n();
  const { isAdmin, client } = useAuth();
  const { toggle: toggleMobileMenu } = useMobileMenu();
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!userOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!userRef.current?.contains(e.target as Node)) setUserOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setUserOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [userOpen]);

  const logout = async () => {
    try { await fetch("/api/voces/client/logout", { method: "POST" }); } catch {}
    location.reload();
  };

  const userInitial = client
    ? (client.name?.[0] || client.email?.[0] || "U").toUpperCase()
    : null;

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: "rgba(10,10,11,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "0.5px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="w-full px-4 md:px-8 h-[60px] flex items-center justify-between gap-4">
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggleMobileMenu}
            className="flex items-center justify-center w-9 h-9 rounded-[8px] shrink-0 transition-colors duration-150"
            style={{ background: "rgba(232,76,43,0.15)", border: "0.5px solid rgba(232,76,43,0.3)", color: "rgb(232,76,43)" }}
            aria-label="Menú"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
          <a href="/voces" aria-label="Inicio" className="flex items-center shrink-0">
            <img src={LOGO_SRC} alt="Sivar Music" className="h-7 w-auto" />
          </a>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="http://instagram.com/sivar.music"
            target="_blank"
            rel="noreferrer"
            className="hidden md:block text-[13px] transition-colors duration-200 hover:text-[#f0ede8] px-2 py-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {t("instagram")}
          </a>

          <NotificationBell />
          <LanguageToggle />

          {/* User section */}
          {client ? (
            <div ref={userRef} className="relative">
              <button
                onClick={() => setUserOpen((v) => !v)}
                aria-label="Cuenta"
                className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[13px] font-[500] transition-colors duration-200"
                style={{
                  background: userOpen ? "rgba(232,76,43,0.20)" : "rgba(232,76,43,0.12)",
                  border: "0.5px solid rgba(232,76,43,0.30)",
                  color: "var(--color-accent)",
                }}
              >
                {userInitial}
              </button>

              {userOpen && (
                <div
                  className="absolute right-0 mt-2 w-60 rounded-[14px] z-50"
                  style={{
                    background: "rgba(14,14,16,0.98)",
                    border: "0.5px solid var(--color-border-subtle)",
                  }}
                >
                  <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: "0.5px solid var(--color-border-default)" }}>
                    <div
                      className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[14px] font-[500]"
                      style={{ background: "rgba(232,76,43,0.12)", color: "var(--color-accent)" }}
                    >
                      {userInitial}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-[500] truncate" style={{ color: "var(--color-text-primary)" }}>
                        {client.name || "Usuario"}
                      </div>
                      <div className="text-[11px] truncate" style={{ color: "var(--color-text-muted)" }}>
                        {client.email}
                      </div>
                    </div>
                  </div>
                  <div className="px-3 pt-2 pb-1">
                    <a
                      href="/voces/configuracion"
                      className="flex items-center gap-2 px-3 py-2 rounded-[8px] text-[12px] transition-colors duration-150"
                      style={{ color: "var(--color-text-secondary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                      </svg>
                      Configuración
                    </a>
                  </div>
                  <div className="px-3 pb-2.5">
                    <button
                      onClick={logout}
                      className="ds-btn-secondary w-full text-[12px] py-1.5"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <a
              href="/voces/login"
              className="ds-btn-primary text-[12px] py-1.5 px-4"
            >
              {t("signIn")}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
