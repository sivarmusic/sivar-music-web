// Contenedor único de página para /voces/admin/**. Ancho máximo ~1280px,
// mismo padding en todas las páginas — así el borde izquierdo del contenido
// queda alineado siempre en el mismo lugar, sea cual sea el ancho real de lo
// que hay adentro (una tabla angosta o una grilla ancha).
//
// Etapa 3 del rediseño del admin: reemplaza los distintos `max-w-xl` /
// `max-w-4xl` / `max-w-6xl mx-auto` que cada página traía por su cuenta.

export default function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }} className="px-6 py-8">
      <div className="max-w-[1280px] mx-auto">{children}</div>
    </main>
  );
}
