import { Star } from 'lucide-react';

/** Renders a rating as filled/partial stars. Display-only (never a price). */
export default function Stars({ rating, size = 18 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.25 && rating - full < 0.75;
  const total = 5;

  return (
    <span
      className="inline-flex items-center"
      role="img"
      aria-label={`${rating.toFixed(1).replace('.', ',')} de 5 estrellas`}
    >
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < full;
        const half = i === full && hasHalf;
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="text-border" fill="currentColor" strokeWidth={0} />
            {(filled || half) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: half ? size / 2 : size }}
              >
                <Star
                  size={size}
                  className="text-star"
                  fill="currentColor"
                  strokeWidth={0}
                />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
