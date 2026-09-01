import type { Metadata } from "next";
import ComingSoonPage from "../components/ComingSoonPage";

export const metadata: Metadata = {
  title: "News | Sivar Music",
};

export default function NewsPage() {
  return (
    <ComingSoonPage
      eyebrow="Sivar Music Entertainment"
      title="Noticias"
      description="Muy pronto vas a poder ver acá las últimas novedades y comunicados del sello."
    />
  );
}
