export default function KiteLoader({ label = 'Loading…', full = false }) {
  return (
    <div role="status" className={`flex flex-col items-center justify-center gap-3 ${full ? 'min-h-screen' : 'py-16'}`}>
      <svg viewBox="0 0 80 112" className="w-14 animate-bob" aria-hidden="true">
        <polygon points="40,4 76,40 40,80 4,40" fill="#FFC20E" />
        <polygon points="40,4 76,40 40,40" fill="#D7263D" />
        <path className="animate-tail" d="M40 80 C34 90 46 96 38 108" stroke="#0E2A47" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
      <p className="text-sm text-ink/60">{label}</p>
    </div>
  );
}
