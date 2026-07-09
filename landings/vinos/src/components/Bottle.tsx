import type { Wine } from '../config/wines';

/**
 * Parametric SVG wine bottle — no photo needed, never broken. Glass colour,
 * label colour and the wine name come from config. If a real photo is added
 * (wine.imagen) the caller swaps in an <img>; this is the default.
 */
export default function Bottle({ wine, className = '' }: { wine: Wine; className?: string }) {
  const gid = `b-${wine.id}`;
  return (
    <svg
      viewBox="0 0 120 360"
      className={className}
      role="img"
      aria-label={`Botella de ${wine.nombre}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${gid}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={wine.colorVidrio} />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="0.6" stopColor={wine.colorVidrio} />
          <stop offset="1" stopColor="#000000" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id={`${gid}-foil`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9cf8f" />
          <stop offset="1" stopColor="#b07f2e" />
        </linearGradient>
      </defs>

      {/* shadow */}
      <ellipse cx="60" cy="350" rx="34" ry="7" fill="#000" opacity="0.45" />

      {/* body + neck as one silhouette */}
      <path
        d="M44 70 q0 -10 4 -16 l0 -34 q0 -6 8 -6 l8 0 q8 0 8 6 l0 34 q4 6 4 16
           q14 18 14 60 l0 150 q0 18 -18 18 l-40 0 q-18 0 -18 -18 l0 -150 q0 -42 14 -60 z"
        fill={`url(#${gid}-glass)`}
        stroke="#000"
        strokeOpacity="0.25"
      />
      {/* capsule / foil */}
      <path d="M52 14 l16 0 l0 44 q-8 4 -16 0 z" fill={`url(#${gid}-foil)`} />

      {/* label */}
      <rect x="34" y="180" width="52" height="92" rx="4" fill={wine.colorEtiqueta} />
      <rect x="34" y="180" width="52" height="92" rx="4" fill="#000" opacity="0.06" />
      <line x1="40" y1="196" x2="80" y2="196" stroke="#fff" strokeOpacity="0.45" strokeWidth="0.8" />
      <text
        x="60"
        y="216"
        textAnchor="middle"
        fontFamily="'Fraunces Variable', Georgia, serif"
        fontSize="9"
        fill="#fff"
        fillOpacity="0.95"
      >
        {wine.nombre.split(' ').slice(0, 2).join(' ')}
      </text>
      <text x="60" y="246" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="7" fill="#fff" fillOpacity="0.7">
        {wine.anada}
      </text>
      <line x1="40" y1="258" x2="80" y2="258" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.6" />
    </svg>
  );
}
