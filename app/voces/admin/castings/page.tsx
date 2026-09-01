export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

// La sección "Castings" del sidebar no tiene contenido propio — siempre se
// entra por un modo (Locutores o Cantantes). Este redirect resuelve
// /voces/admin/castings (el link del ítem de sidebar) a su modo por defecto.
export default function AdminCastingsRootRedirect() {
  redirect("/voces/admin/castings/locutores");
}
