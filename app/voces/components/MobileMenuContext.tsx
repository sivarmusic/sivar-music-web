"use client";
import { createContext, useContext, useState, type ReactNode } from "react";

type Ctx = { open: boolean; toggle: () => void; close: () => void };
const MobileMenuCtx = createContext<Ctx>({ open: false, toggle: () => {}, close: () => {} });

export function MobileMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileMenuCtx.Provider value={{ open, toggle: () => setOpen((v) => !v), close: () => setOpen(false) }}>
      {children}
    </MobileMenuCtx.Provider>
  );
}

export function useMobileMenu() { return useContext(MobileMenuCtx); }
