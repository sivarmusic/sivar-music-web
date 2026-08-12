"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type ClientUser = { id: string; email: string; name?: string; isAdmin?: boolean } | null;

type AuthCtx = {
  isAdmin: boolean;
  client: ClientUser;
  loading: boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [client, setClient] = useState<ClientUser>(null);
  const [loading, setLoading] = useState(true);

  // Note: the legacy master-password `/api/auth/me` endpoint from voces-bds
  // was dropped. isAdmin is derived from the client record's own isAdmin
  // flag (voces_clients.is_admin), returned by /api/voces/client/me.
  const refresh = useCallback(async () => {
    try {
      const cRes = await fetch("/api/voces/client/me", { cache: "no-store" });
      const cJ = await cRes.json().catch(() => null);
      const currentClient: ClientUser = cJ?.client || null;
      setClient(currentClient);
      setIsAdmin(!!currentClient?.isAdmin);
    } catch {
      setIsAdmin(false);
      setClient(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const onEvt = () => { refresh(); };
    window.addEventListener("voces-auth-changed", onEvt);
    return () => window.removeEventListener("voces-auth-changed", onEvt);
  }, [refresh]);

  const value = useMemo(() => ({ isAdmin, client, loading, refresh }), [isAdmin, client, loading, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("AuthProvider missing");
  return v;
}
