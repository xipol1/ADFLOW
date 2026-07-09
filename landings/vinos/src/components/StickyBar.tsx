import { useEffect, useState } from 'react';
import { wines } from '../config/wines';
import OrderButton from './OrderButton';
import type { UTMParams } from '../hooks/useUTM';

/**
 * Sticky order bar — visible from the start (after the age gate) in the mobile
 * thumb zone. Tracks the wine currently in view so the CTA orders THAT wine;
 * falls back to a generic enquiry when no wine is centred.
 */
export default function StickyBar({ utm }: { utm: UTMParams }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const sections = wines
      .map((w) => document.getElementById(`vino-${w.id}`))
      .filter((el): el is HTMLElement => !!el);
    if (!sections.length || typeof IntersectionObserver === 'undefined') return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveId(visible.target.id.replace('vino-', ''));
      },
      { threshold: [0.4, 0.6], rootMargin: '-20% 0px -40% 0px' },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  const activeWine = wines.find((w) => w.id === activeId && w.disponible !== false);

  return (
    <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-surface/95 backdrop-blur border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,.5)] pb-[env(safe-area-inset-bottom)]">
      <div className="px-3 py-2.5">
        <OrderButton
          utm={utm}
          location="sticky_bar"
          wine={activeWine}
          variant="sticky"
          label={activeWine ? `Pedir «${activeWine.nombre.split(' ')[0]}…»` : 'Pídelo por WhatsApp'}
        />
      </div>
    </div>
  );
}
