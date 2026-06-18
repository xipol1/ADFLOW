import { product } from '../config/product';
import CTAButton from './CTAButton';
import Stars from './Stars';
import { useInView } from '../hooks/useInView';
import type { UTMParams } from '../hooks/useUTM';

/**
 * S6 — Social proof. Cream "paper tickets" slightly rotated over the dark
 * stage, plus the rating mass and a secondary CTA.
 */
export default function SocialProof({ utm }: { utm: UTMParams }) {
  const { trust, social } = product;
  const { ref, inView } = useInView<HTMLElement>(0.25);

  return (
    <section ref={ref} className="px-4 py-14 sm:py-16">
      <div className="mx-auto max-w-content text-center">
        <div className={`reveal ${inView ? 'in' : ''} flex flex-col items-center gap-2`}>
          <Stars rating={trust.rating} size={22} />
          <p className="text-ink">
            <span className="font-display text-3xl font-semibold">
              {trust.rating.toFixed(1).replace('.', ',')}
            </span>
            <span className="text-ink-soft">
              {' '}· {trust.reviews.toLocaleString('es-ES')} valoraciones en Amazon
            </span>
          </p>
          <p className="text-sm text-ink-soft -mt-1">Miles de cocinas ya la usan a diario.</p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 text-left">
          {social.testimonials.map((t, i) => (
            <blockquote
              key={t.text}
              className={`reveal ${inView ? 'in' : ''} bg-paper text-[#2b2b26] rounded-xl p-5 shadow-card`}
              style={{
                transitionDelay: `${160 + i * 140}ms`,
                transform: undefined,
                rotate: i % 2 === 0 ? '-1.2deg' : '1.4deg',
              }}
            >
              <Stars rating={5} size={14} />
              <p className="mt-2 italic leading-relaxed">“{t.text}”</p>
              <footer className="mt-2 text-xs font-semibold text-brand-deep">{t.who}</footer>
            </blockquote>
          ))}
        </div>

        <p className="mt-4 text-[11px] text-ink-soft/60">{social.footnote}</p>

        <div className="mt-7">
          <CTAButton utm={utm} location="social" variant="secondary" />
          <p className="mt-2.5 text-sm text-ink-soft">{product.cta.sub}</p>
        </div>
      </div>
    </section>
  );
}
