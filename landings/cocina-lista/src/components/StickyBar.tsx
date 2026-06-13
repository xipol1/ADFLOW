import { useEffect, useState } from 'react';
import { product } from '../config/product';
import CTAButton from './CTAButton';
import Stars from './Stars';
import type { UTMParams } from '../hooks/useUTM';

/**
 * Persistent CTA, two layers:
 *  - Top bar (desktop + mobile): appears after first scroll. On mobile it shows
 *    brand + rating only (the CTA lives in the bottom bar to avoid duplication).
 *  - Bottom bar (mobile only): visible FROM LOAD in the thumb zone — the page
 *    can sell in second 1 without any scroll. Curiosity CTA ("Ver precio…").
 */
export default function StickyBar({ utm }: { utm: UTMParams }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* Top bar */}
      <div
        className={`fixed top-0 inset-x-0 z-50 transition-transform duration-200 ${
          scrolled ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="bg-surface/95 backdrop-blur border-b border-border shadow-sm">
          <div className="mx-auto max-w-content px-4 h-14 flex items-center justify-between gap-3">
            <span className="font-display text-lg font-semibold text-brand truncate">
              {product.store.name}
            </span>
            <span className="sm:hidden flex items-center gap-1.5 text-xs text-ink-soft">
              <Stars rating={product.trust.rating} size={13} />
              <span className="font-semibold text-ink">
                {product.trust.rating.toFixed(1).replace('.', ',')}
              </span>
            </span>
            <span className="hidden sm:block">
              <CTAButton utm={utm} location="sticky" variant="sticky" />
            </span>
          </div>
        </div>
      </div>

      {/* Bottom bar — mobile thumb zone, visible from load */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-surface/95 backdrop-blur border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,.08)] pb-[env(safe-area-inset-bottom)]">
        <div className="px-3 py-2.5 flex items-center gap-3">
          <span className="flex flex-col items-center leading-none shrink-0">
            <Stars rating={product.trust.rating} size={12} />
            <span className="mt-1 text-[11px] text-ink-soft font-medium">
              {product.trust.reviewsLabel}
            </span>
          </span>
          <CTAButton
            utm={utm}
            location="sticky_bottom"
            variant="secondary"
            label={product.cta.bottomLabel}
            className="flex-1 !text-base !py-3"
          />
        </div>
      </div>
    </>
  );
}
