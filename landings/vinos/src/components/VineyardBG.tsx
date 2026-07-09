/**
 * Vineyard-at-dusk background, 100% SVG (gradient sky + converging vine rows +
 * grain + vignette). No image asset → scales to any viewport, zero load weight.
 * Swap for a real <video>/<img> later without touching consumers.
 */
export default function VineyardBG({ className = '' }: { className?: string }) {
  const rows = Array.from({ length: 9 });
  return (
    <svg
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="vb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a0d16" />
          <stop offset="0.5" stopColor="#1a0b10" />
          <stop offset="1" stopColor="#0c0608" />
        </linearGradient>
        <radialGradient id="vb-sun" cx="50%" cy="38%" r="40%">
          <stop offset="0" stopColor="#7a1224" stopOpacity="0.55" />
          <stop offset="1" stopColor="#7a1224" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="vb-vig" cx="50%" cy="50%" r="75%">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
      </defs>

      <rect width="1200" height="800" fill="url(#vb-sky)" />
      <rect width="1200" height="800" fill="url(#vb-sun)" />

      {/* converging vine rows toward a vanishing point at the horizon */}
      <g stroke="#3a1c25" strokeWidth="2" opacity="0.7">
        {rows.map((_, i) => {
          const spread = (i - 4) / 4; // -1 … 1
          const xBottom = 600 + spread * 900;
          return <line key={i} x1={600} y1={430} x2={xBottom} y2={800} />;
        })}
      </g>
      {/* horizon haze */}
      <rect x="0" y="412" width="1200" height="40" fill="#7a1224" opacity="0.18" />

      <rect width="1200" height="800" fill="url(#vb-vig)" />
    </svg>
  );
}
