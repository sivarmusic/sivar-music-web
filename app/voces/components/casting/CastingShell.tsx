import { Archivo } from "next/font/google";
import "./casting.css";
import "./casting-brand.css";

// Display del flujo de casting: solo se carga bajo /voces/c y /voces/cc.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-display",
  display: "swap",
});

/** Wrapper con el tema "casting" (papel + tinta). El navbar queda afuera. */
export default function CastingShell({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="casting" className={archivo.variable}>
      {children}
      <div className="cs-container">
        <p aria-hidden="true" className="cs-colophon cs-mono">SIVAR MUSIC GROUP — CASTING</p>
      </div>
    </div>
  );
}
