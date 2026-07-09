import { MessageCircle } from 'lucide-react';
import type { Wine } from '../config/wines';
import type { UTMParams } from '../hooks/useUTM';
import { buildWhatsAppUrl, handleOrderClick } from '../lib/whatsapp';

type Variant = 'primary' | 'secondary' | 'sticky';

interface Props {
  utm: UTMParams;
  location: string;
  wine?: Wine;
  variant?: Variant;
  label?: string;
  className?: string;
}

// French luxury: low radius (struck label, not pill), small-caps tracking,
// gold treated as metal (bevel + ring + warm shadow + light sweep), not flat fill.
const baseLabel = 'font-body uppercase text-[13px] tracking-[0.18em] font-semibold';

const variants: Record<Variant, string> = {
  primary:
    `cta-sweep inline-flex items-center justify-center gap-2.5 rounded-[3px] bg-cta text-cta-ink ` +
    `px-8 py-4 ${baseLabel} ring-1 ring-gold-deep shadow-gold ` +
    `transition-[transform,box-shadow] duration-300 active:scale-[.99] ` +
    `hover:-translate-y-px hover:shadow-[0_1px_0_rgba(255,255,255,.35)_inset,0_16px_44px_-12px_rgba(199,162,74,.7)]`,
  secondary:
    `inline-flex items-center justify-center gap-2.5 rounded-[3px] bg-transparent text-ink ` +
    `px-8 py-4 ${baseLabel} border border-hairline ` +
    `transition-colors duration-300 hover:border-gold-soft hover:text-gold-soft`,
  sticky:
    `cta-sweep inline-flex items-center justify-center gap-2.5 rounded-[3px] bg-cta text-cta-ink w-full ` +
    `px-5 py-3.5 ${baseLabel} ring-1 ring-gold-deep`,
};

/**
 * The ONLY order CTA — routes through handleOrderClick so tracking (consent-gated)
 * can't be forgotten. Real <a> (accessible) with intercepted click + fallback.
 */
export default function OrderButton({ utm, location, wine, variant = 'primary', label, className = '' }: Props) {
  const text = label ?? (wine ? 'Pedir por WhatsApp' : 'Hablar por WhatsApp');
  return (
    <a
      href={buildWhatsAppUrl(wine)}
      rel="nofollow noopener"
      onClick={(e) => {
        e.preventDefault();
        handleOrderClick({ wine, location, utm });
      }}
      className={`${variants[variant]} ${className}`}
      aria-label={wine ? `Pedir ${wine.nombre} por WhatsApp` : 'Pedir por WhatsApp'}
    >
      <MessageCircle size={17} strokeWidth={1.6} aria-hidden />
      {text}
    </a>
  );
}
