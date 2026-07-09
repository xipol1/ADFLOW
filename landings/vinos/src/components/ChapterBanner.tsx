import { useInView } from '../hooks/useInView';

interface Props {
  id: string;
  kicker: string;
  title: string;
  subtitle?: string;
  src: string;
  alt: string;
  /** Static colour grade (applied once, never per-frame). */
  grade?: string;
  /** Section height drives how long the photo stays pinned. */
  height?: string;
  /** Focus point for object-position. */
  position?: string;
}

/**
 * ChapterBanner — a full-bleed cinematic "moment" of the wine journey. The photo
 * is the protagonist (full luminance, no flat veil): it pins (position:sticky)
 * while the chapter scrolls, with a slow Ken Burns (CSS scroll-timeline, static
 * fallback) + film grain. Legibility is a LOCAL scrim behind the title only, and
 * a bottom fade hands off to the next (dark) content section.
 */
export default function ChapterBanner({
  id, kicker, title, subtitle, src, alt, grade, height = '165vh', position = 'center',
}: Props) {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  return (
    <section id={id} className="relative" style={{ minHeight: height }} aria-label={title}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="kenburns absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: position, filter: grade ?? 'contrast(1.06) saturate(1.06) brightness(1.0)' }}
        />
        <span className="grain-layer" aria-hidden />
        {/* fusion: subtle top + strong bottom hand-off to dark content */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgb(var(--bg)/0.45) 0%, transparent 22%, transparent 55%, rgb(var(--bg)/0.85) 88%, rgb(var(--bg)) 100%)' }}
          aria-hidden
        />
        {/* local radial scrim behind the title only */}
        <div ref={ref} className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(60% 42% at 50% 50%, rgb(var(--bg)/0.6) 0%, transparent 70%)' }} aria-hidden />
          <p className={`reveal ${inView ? 'in' : ''} kicker relative`}>{kicker}</p>
          <h2 className={`reveal ${inView ? 'in' : ''} relative mt-5 font-display text-[clamp(3rem,11vw,6rem)] leading-[0.98] text-ink drop-shadow-[0_3px_24px_rgba(0,0,0,0.7)]`} style={{ transitionDelay: '90ms' }}>
            {title}
          </h2>
          {subtitle && (
            <p className={`reveal ${inView ? 'in' : ''} font-serif-body relative mt-4 text-lg sm:text-xl text-ink/90 max-w-[42ch] drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]`} style={{ transitionDelay: '180ms' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
