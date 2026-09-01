"use client";

// Sidebar persistente del panel admin (desktop). El equivalente para mobile
// es MobileNavBar, que ya existe a nivel de sitio y ahora también sabe
// mostrar esta misma estructura cuando el pathname empieza con
// /voces/admin — mismo hamburger, mismo drawer, contenido distinto según
// la sección.

import { usePathname } from "next/navigation";

const IconClients = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconMic = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0M12 19v3M8 22h8" />
  </svg>
);

const IconCastings = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M7 8h10M7 12h10M7 16h6" />
  </svg>
);

const IconTrash = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
  </svg>
);

const IconReports = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="M18 17V9M13 17V5M8 17v-4" />
  </svg>
);

type SubItem = { href: string; label: string };
type Item = { href: string; label: string; icon: React.ReactNode; children?: SubItem[] };

export const ADMIN_NAV_ITEMS: Item[] = [
  { href: "/voces/admin/clientes", label: "Clientes", icon: <IconClients /> },
  {
    href: "/voces/admin/locutores",
    label: "Locutores",
    icon: <IconMic />,
    children: [{ href: "/voces/admin/locutores/solicitudes", label: "Solicitudes" }],
  },
  {
    href: "/voces/admin/castings",
    label: "Castings",
    icon: <IconCastings />,
    children: [
      { href: "/voces/admin/castings/locutores", label: "Locutores" },
      { href: "/voces/admin/castings/cantantes", label: "Cantantes" },
    ],
  },
  { href: "/voces/admin/papelera", label: "Papelera", icon: <IconTrash /> },
  { href: "/voces/admin/reportes", label: "Reportes", icon: <IconReports /> },
];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 w-full">
      {ADMIN_NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const childActive = item.children?.some((c) => isActive(pathname, c.href));
        return (
          <div key={item.href}>
            <a
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] transition-colors duration-150"
              style={{
                background: active || childActive ? "var(--color-accent-bg)" : "transparent",
                borderLeft: active || childActive ? "2px solid var(--color-accent)" : "2px solid transparent",
                color: active || childActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                fontWeight: active || childActive ? 500 : 400,
                textDecoration: "none",
              }}
            >
              <span style={{ opacity: active || childActive ? 1 : 0.65, color: active || childActive ? "var(--color-accent)" : "inherit" }}>
                {item.icon}
              </span>
              {item.label}
            </a>
            {item.children && (active || childActive) && (
              <div className="ml-8 mt-0.5 mb-1 flex flex-col gap-0.5">
                {item.children.map((child) => {
                  const cActive = isActive(pathname, child.href);
                  return (
                    <a
                      key={child.href}
                      href={child.href}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-[12.5px] transition-colors duration-150"
                      style={{
                        color: cActive ? "var(--color-accent)" : "var(--color-text-muted)",
                        background: cActive ? "var(--color-accent-bg)" : "transparent",
                        textDecoration: "none",
                      }}
                    >
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
  );
}
