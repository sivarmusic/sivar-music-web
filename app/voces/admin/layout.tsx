"use client";

// Layout compartido del panel admin. Aplica a todo lo que cuelga de
// app/voces/admin/** — sidebar persistente en desktop, oculto en mobile (el
// drawer mobile lo resuelve MobileNavBar, que ya es global al sitio y ahora
// también sabe mostrar esta misma navegación cuando corresponde).
//
// Etapa 2 del rediseño: esto establece el esqueleto (sidebar + columna de
// contenido). El ancho fijo del contenedor de contenido y el rediseño de
// tablas/formularios es la etapa 3 en adelante — cada página todavía trae
// su propio max-width interno por ahora, sin tocar.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/voces/components/AuthContext";
import AdminSidebar from "@/app/voces/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin) router.replace("/voces/login");
  }, [loading, isAdmin, router]);

  if (loading || !isAdmin) {
    return (
      <main className="p-6 text-[13px]" style={{ color: "var(--color-text-muted)" }}>
        Cargando…
      </main>
    );
  }

  return (
    <div className="flex items-start">
      <aside
        className="hidden md:block shrink-0 w-[220px] p-4 sticky top-0 h-screen overflow-y-auto"
        style={{ borderRight: "0.5px solid var(--color-border-default)" }}
      >
        <AdminSidebar />
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
