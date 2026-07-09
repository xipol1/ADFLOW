import { site } from '../config/site';
import OrderButton from './OrderButton';
import { useInView } from '../hooks/useInView';
import type { UTMParams } from '../hooks/useUTM';

/**
 * Cap 4 · "La copa" — closing chapter over a full-bleed toast photo (pinned,
 * Ken Burns, grain). Strong LOCAL scrim behind the CTA only, so the photo
 * breathes while the button + legal notices stay legible.
 */
export default function FinalCTA({ utm }: { utm: UTMParams }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  return (
    <section id="cap-copa" className="relative" style={{ minHeight: '150vh' }} aria-label="La copa">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <img
          src="/assets/photos/toast.webp"
          alt="Brindis con copas de vino."
          loading="lazy"
          decoding="async"
          className="kenburns absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'contrast(1.06) saturate(1.08) brightness(1.0)' }}
        />
        <span className="grain-layer" aria-hidden />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgb(var(--bg)/0.5) 0%, transparent 30%, rgb(var(--bg)/0.55) 70%, rgb(var(--bg)) 100%)' }} aria-hidden />

        <div ref={ref} className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 50% at 50% 55%, rgb(var(--bg)/0.7) 0%, transparent 72%)' }} aria-hidden />
          <p className={`reveal ${inView ? 'in' : ''} kicker relative`}>Salud</p>
          <h2 className={`reveal ${inView ? 'in' : ''} relative mt-4 font-display text-[clamp(2.75rem,9vw,5rem)] leading-[1.0] text-ink text-balance drop-shadow-[0_3px_24px_rgba(0,0,0,0.75)]`}>
            {site.finalCta.headline}
          </h2>
          <p className={`reveal font-serif-body ${inView ? 'in' : ''} relative mt-4 text-lg sm:text-xl text-ink/90 max-w-[44ch] drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]`} style={{ transitionDelay: '120ms' }}>
            {site.finalCta.sub}
          </p>
          <div className={`reveal ${inView ? 'in' : ''} relative mt-9`} style={{ transitionDelay: '240ms' }}>
            <OrderButton utm={utm} location="final_cta" variant="primary" />
            <p className="mt-3 text-xs text-ink/80 max-w-[46ch] mx-auto drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">{site.ctaMicrocopy}</p>
          </div>
          <p className="relative mt-7 text-xs text-ink/80 drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">+18 · {site.legalNotices.edad} {site.legalNotices.salud}</p>
        </div>
      </div>
    </section>
  );
}
