import { Star } from 'lucide-react';

/** Rating stars, display-only. */
export default function Stars({ rating = 5, size = 16 }: { rating?: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} de 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.round(rating) ? 'text-star' : 'text-border'}
          fill="currentColor"
          strokeWidth={0}
        />
      ))}
    </span>
  );
}
