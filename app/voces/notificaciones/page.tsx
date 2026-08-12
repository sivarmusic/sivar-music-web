import { redirect } from "next/navigation";
export default function NotificacionesPage() {
  redirect("/voces/configuracion?section=notificaciones");
}
