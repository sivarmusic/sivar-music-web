import { redirect } from "next/navigation";

// Ported from voces-bds's app/admin/notifications/page.tsx: this route was
// itself already a redirect stub pointing at the (non-admin) notifications
// page; carried over as-is with the /voces prefix.
export default function OldNotificationsPage() {
  redirect("/voces/notificaciones");
}
