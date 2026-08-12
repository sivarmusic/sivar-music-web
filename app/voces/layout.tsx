import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./voces.css";
import { I18nProvider } from "@/app/voces/components/I18n";
import { AuthProvider } from "@/app/voces/components/AuthContext";
import { PlayerProvider } from "@/app/voces/components/PlayerContext";
import { MobileMenuProvider } from "@/app/voces/components/MobileMenuContext";
import HeaderBar from "@/app/voces/components/HeaderBar";
import QuickSideNav from "@/app/voces/components/QuickSideNav";
import PageContent from "@/app/voces/components/PageContent";
import StickyPlayer from "@/app/voces/components/StickyPlayer";
import MobileNavBar from "@/app/voces/components/MobileNavBar";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-dm-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sivar Voces",
  description: "Catálogo de locutores y cantantes de Sivar Music",
};

// This repo's root app/layout.tsx already provides <html>/<body>; this layout
// only adds the /voces section's own providers + chrome (ported from
// voces-bds's app/layout.tsx, minus the <html>/<body> tags).
export default function VocesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`${dmSans.variable} ${dmSerif.variable} voces-scope`}>
      <I18nProvider>
        <AuthProvider>
          <PlayerProvider>
            <MobileMenuProvider>
              <HeaderBar />
              <QuickSideNav />
              <PageContent>{children}</PageContent>
              <StickyPlayer />
              <MobileNavBar />
            </MobileMenuProvider>
          </PlayerProvider>
        </AuthProvider>
      </I18nProvider>
    </div>
  );
}
