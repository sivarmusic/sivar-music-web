"use client";
import type { ReactNode } from "react";
import { useOptionalPlayer } from "@/app/voces/components/PlayerContext";

export default function PageContent({ children }: { children: ReactNode }) {
  const player = useOptionalPlayer();
  const active = !!player?.current;
  return (
    <div className={active ? "pb-48 md:pb-40" : "pb-16 md:pb-0"}>{children}</div>
  );
}
