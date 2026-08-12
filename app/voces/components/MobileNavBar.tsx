"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/voces/components/AuthContext";
import { useMobileMenu } from "@/app/voces/components/MobileMenuContext";

type Child = { href: string; label: string };
type Item = {
  href: string;
  label: string;
  icon: React.ReactNode;
  children?: Child[];
  adminOnly?: boolean;
  clientOnly?: boolean;
};

const IconMic = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="12" rx="3"/>
    <path d="M5 10a7 7 0 0 0 14 0M12 19v3M8 22h8"/>
  </svg>
);

const IconMusic = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"/>
    <circle cx="6" cy="18" r="3"/>
    <circle cx="18" cy="16" r="3"/>
  </svg>
);

const IconFolder = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
  </svg>
);

const IconPanel = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);

const IconChevron = ({ open }: { open: boolean }) => (
  <svg
    width="14" height="14" viewBox="0 0 14 14" fill="none"
    style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", opacity: 0.5 }}
  >
    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function MobileNavBar() {
  const pathname = usePathname();
  const { isAdmin, client } = useAuth();
  const { open, close } = useMobileMenu();
  const [expanded, setExpanded] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);

  const openItem = useCallback((key: string) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setExpanded(key);
  }, []);

  const closeItem = useCallback(() => {
    closeTimer.current = window.setTimeout(() => setExpanded(null), 150);
  }, []);

  useEffect(() => { if (open) document.body.style.overflow = "hidden"; else document.body.style.overflow = ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  useEffect(() => { if (open) close(); }, [pathname]);

  const items: Item[] = [
    {
      href: "/voces",
      label: "Locutores",
      icon: <IconMic />,
      children: isAdmin ? [{ href: "/voces/admin/casting", label: "Castings" }] : undefined,
    },
    {
      href: "/voces/cantantes",
      label: "Cantantes",
      icon: <IconMusic />,
      children: isAdmin ? [{ href: "/voces/admin/cantantes/casting", label: "Castings Cantantes" }] : undefined,
    },
    { href: "/voces/listas", label: "Proyectos Locutores", icon: <IconFolder />, clientOnly: true },
    { href: "/voces/cantantes/proyectos", label: "Proyectos Cantantes", icon: <IconFolder />, clientOnly: true },
    {
      href: "/voces/admin/clients",
      label: "Panel",
      icon: <IconPanel />,
      adminOnly: true,
      children: isAdmin ? [{ href: "/voces/admin/reportes", label: "Reportes" }, { href: "/voces/notificaciones", label: "Notificaciones" }] : undefined,
    },
  ].filter((it) => {
    if (it.adminOnly && !isAdmin) return false;
    if (it.clientOnly && !client) return false;
    return true;
  });

  return (
    <div>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[80]"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
          onClick={close}
        />
      )}

      {/* Drawer */}
      <aside
        className="fixed top-0 left-0 h-full z-[90] w-[280px] flex flex-col"
        style={{
          background: "rgba(14,15,18,0.99)",
          borderRight: "0.5px solid rgba(255,255,255,0.08)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 h-[60px] shrink-0"
          style={{ borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2.5" style={{ color: "rgba(255,255,255,0.85)" }}>
            <span style={{ color: "rgb(232,76,43)" }}><IconMic /></span>
            <span className="text-[15px] font-[500] tracking-[0.06em]">Sivar Voces</span>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-150"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
            aria-label="Cerrar menú"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {items.map((it) => {
            const active = pathname === it.href || (it.href !== "/voces" && pathname?.startsWith(it.href));
            const childActive = it.children?.some((c) => pathname === c.href || pathname?.startsWith(c.href));
            const hasChildren = !!it.children?.length;
            const isExpanded = expanded === it.href;

            return (
              <div
                key={it.href}
                onMouseEnter={() => hasChildren && openItem(it.href)}
                onMouseLeave={() => hasChildren && closeItem()}
              >
                <div
                  className="flex items-center rounded-[10px] overflow-hidden mb-0.5"
                  style={{
                    background: active || childActive ? "rgba(232,76,43,0.08)" : "transparent",
                    borderLeft: active || childActive ? "2px solid rgb(232,76,43)" : "2px solid transparent",
                  }}
                >
                  <a
                    href={it.href}
                    className="flex items-center gap-3 flex-1 px-3 py-3 text-[14px] transition-colors duration-150"
                    style={{
                      color: active || childActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)",
                      fontWeight: active || childActive ? 500 : 400,
                      textDecoration: "none",
                    }}
                  >
                    <span style={{ opacity: active || childActive ? 1 : 0.6 }}>{it.icon}</span>
                    <span>{it.label}</span>
                  </a>
                  {hasChildren && (
                    <button
                      onClick={() => setExpanded(isExpanded ? null : it.href)}
                      className="py-3 pl-2 pr-4 transition-colors duration-150"
                      style={{ color: "rgba(255,255,255,0.35)", minWidth: 44 }}
                      aria-label={isExpanded ? "Colapsar" : "Expandir"}
                    >
                      <IconChevron open={isExpanded} />
                    </button>
                  )}
                </div>

                {/* Sub-items */}
                {hasChildren && isExpanded && (
                  <div
                    className="ml-4 mb-1"
                    onMouseEnter={() => openItem(it.href)}
                    onMouseLeave={() => closeItem()}
                  >
                    {it.children!.map((child) => {
                      const cActive = pathname === child.href || pathname?.startsWith(child.href);
                      return (
                        <a
                          key={child.href}
                          href={child.href}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-[8px] text-[13px] transition-colors duration-150 mb-0.5"
                          style={{
                            color: cActive ? "rgb(232,76,43)" : "rgba(255,255,255,0.4)",
                            background: cActive ? "rgba(232,76,43,0.08)" : "transparent",
                          }}
                        >
                          <span
                            className="w-1 h-1 rounded-full shrink-0"
                            style={{ background: cActive ? "rgb(232,76,43)" : "rgba(255,255,255,0.25)" }}
                          />
                          {child.label}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
