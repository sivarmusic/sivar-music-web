export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

// Reubicado a /voces/admin/castings/cantantes/results (etapa 2 del
// rediseño del admin). Queda este redirect para no romper links viejos
// (emails, marcadores).
export default function AdminCantantesCastingResultsRedirect() {
  redirect("/voces/admin/castings/cantantes/results");
}
