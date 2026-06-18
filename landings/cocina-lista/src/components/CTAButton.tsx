import { product } from '../config/product';
import { handleCtaClick, type CtaLocation } from '../lib/track';
import type { UTMParams } from '../hooks/useUTM';

type Variant = 'primary' | 'secondary' | 'sticky';

interface Props {
  utm: UTMParams;
  location: CtaLocation;
  variant?: Variant;
  label?: string;
  className?: string;
}

const base =
  'inline-flex items-center justify-center gap-2 font-body font-semibold rounded-2xl ' +
  'transition-transform duration-150 active:scale-[.98] focus-visible:outline-none ' +
  'select-none cursor-pointer';

const variants: Record<Variant, string> = {
  primary:
    'bg-cta text-cta-ink text-lg px-8 py-4 w-full sm:w-auto shadow-card hover:brightness-[1.03]',
  secondary:
    'bg-cta text-cta-ink text-base px-6 py-3 hover:brightness-[1.03]',
  sticky:
    'bg-cta text-cta-ink text-sm px-4 py-2 hover:brightness-[1.03]',
};

/**
 * The ONLY CTA component on the page. Every "Ver en Amazon" button routes
 * through here → tracking can never be forgotten. It renders an <a> with the
 * real Amazon href (good for accessibility, middle-click, SEO/crawlers) but
 * intercepts the click to fire the beacon and apply open behavior.
 */
export default function CTAButton({ utm, location, variant = 'primary', label, className = '' }: Props) {
  const text = label ?? (variant === 'sticky' ? product.cta.stickyLabel : product.cta.label);

  return (
    <a
      href={product.amazon.url}
      rel="sponsored nofollow noopener"
      onClick={(e) => {
        e.preventDefault();
        handleCtaClick(utm, location);
      }}
      className={`${base} ${variants[variant]} ${className}`}
      aria-label={`${text} (se abre en Amazon)`}
    >
      {text}
    </a>
  );
}
