import { site } from '../config/site';
import Stars from './Stars';
import { useInView } from '../hooks/useInView';

/** Testimonials as ivory "cartes de dégustation" — French quotes, EB Garamond italic. */
export default function SocialProof() {
  const { ref, inView } = useInView<HTMLElement>(0.25);
  if (!site.testimonials.length) return null;
  return (
    <section ref={ref} className="px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-content">
        <p className={`reveal ${inView ? 'in' : ''} kicker justify-center w-full`}>Catas y clientes</p>
        <h2 className={`reveal ${inView ? 'in' : ''} mt-4 font-display text-3xl sm:text-[40px] text-ink text-center`}>
          Quienes ya lo probaron
        </h2>
        <div className="filet" />
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {site.testimonials.map((t, i) => (
            <figure
              key={t.text}
              className={`reveal ${inView ? 'in' : ''} relative bg-ivory text-[#2b2b26] rounded-[4px] p-7 shadow-card`}
              style={{ transitionDelay: `${140 + i * 130}ms`, rotate: i % 2 === 0 ? '-1deg' : '1.1deg' }}
            >
              <span className="absolute -top-2 left-5 font-display italic text-5xl text-gold-deep leading-none" aria-hidden>«</span>
              <blockquote className="font-serif-body italic text-[19px] leading-relaxed pt-3">{t.text}</blockquote>
              <figcaption className="mt-4 flex items-center justify-between">
                <span className="font-body uppercase text-[11px] tracking-[0.2em] text-brand">{t.who}</span>
                <Stars rating={5} size={13} />
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-5 text-center text-[11px] text-ink-soft/60">{site.testimonials.length && 'Opiniones basadas en valoraciones reales, parafraseadas.'}</p>
      </div>
    </section>
  );
}
