import { product } from '../config/product';
import CTAButton from './CTAButton';
import { useInView } from '../hooks/useInView';
import type { UTMParams } from '../hooks/useUTM';

/** S8 — Cinematic close. Deep-olive block, headline, heartbeat CTA, risk reversal. */
export default function FinalCTA({ utm }: { utm: UTMParams }) {
  const { ref, inView } = useInView<HTMLElement>(0.3);

  return (
    <section ref={ref} className="px-4 py-16 sm:py-20 bg-brand-deep">
      <div className="mx-auto max-w-content text-center">
        <h2 className={`reveal ${inView ? 'in' : ''} font-display text-3xl sm:text-5xl font-semibold text-paper text-balance`}>
          {product.finalCta.headline}
        </h2>
        <p className={`reveal ${inView ? 'in' : ''} mt-3 text-paper/80 text-lg`} style={{ transitionDelay: '140ms' }}>
          {product.finalCta.sub}
        </p>
        <div className={`reveal ${inView ? 'in' : ''} mt-8`} style={{ transitionDelay: '260ms' }}>
          <CTAButton utm={utm} location="final" variant="primary" className="pulse-cta" />
        </div>
        <p className={`reveal ${inView ? 'in' : ''} mt-4 text-sm text-paper/70`} style={{ transitionDelay: '360ms' }}>
          {product.finalCta.riskReversal}
        </p>
      </div>
    </section>
  );
}
