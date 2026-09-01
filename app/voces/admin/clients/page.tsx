export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

// Reubicado a /voces/admin/clientes (etapa 2 del rediseño del admin). Queda
// este redirect para no romper links viejos (emails, marcadores).
export default function AdminClientsRedirect() {
  redirect("/voces/admin/clientes");
}
