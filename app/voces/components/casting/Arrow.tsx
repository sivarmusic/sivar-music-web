export default function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="square" d="M4 12h15m-6-6 6 6-6 6" />
    </svg>
  );
}
