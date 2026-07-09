/** Brand mark / age-gate motif: a stylised wine glass in line-art + wine fill. */
export default function WineGlass({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 140" className={className} aria-hidden xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wg-wine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a1c30" />
          <stop offset="1" stopColor="#4a0a16" />
        </linearGradient>
      </defs>
      {/* bowl */}
      <path d="M30 12 q30 -6 60 0 q0 40 -30 52 q-30 -12 -30 -52 z" fill="none" stroke="rgb(var(--accent))" strokeWidth="2" />
      {/* wine */}
      <path d="M35 26 q25 -4 50 0 q-3 28 -25 38 q-22 -10 -25 -38 z" fill="url(#wg-wine)" />
      <ellipse cx="60" cy="27" rx="25" ry="4" fill="#b8455a" opacity="0.7" />
      {/* stem + foot */}
      <line x1="60" y1="64" x2="60" y2="116" stroke="rgb(var(--accent))" strokeWidth="2" />
      <path d="M38 124 q22 -10 44 0" fill="none" stroke="rgb(var(--accent))" strokeWidth="2" />
    </svg>
  );
}
