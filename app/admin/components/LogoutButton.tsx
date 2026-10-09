"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/staff/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="text-xs font-semibold uppercase tracking-[0.2em] px-4 py-2 rounded-xl text-red-400/70 transition hover:bg-red-500/10 hover:text-red-400"
    >
      Cerrar sesión
    </button>
  );
}
