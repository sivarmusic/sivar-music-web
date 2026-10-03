/** Sección con filete superior y número de pista (01, 02…). */
export default function Section({
  n,
  title,
  children,
}: {
  n?: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="cs-section" aria-label={title}>
      <div className="cs-section-head">
        {n ? <span className="cs-mono cs-section-n" aria-hidden="true">{String(n).padStart(2, "0")}</span> : null}
        <h2 className="cs-h2">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}
