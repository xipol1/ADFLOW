import { useEffect, useRef } from 'react';
import { product } from '../config/product';
import CTAButton from './CTAButton';
import Stars from './Stars';
import { prefersReducedMotion } from '../hooks/useInView';
import type { UTMParams } from '../hooks/useUTM';

/**
 * S1 — Cinematic hero. Full-bleed looping mist video (palindrome cut, no loop
 * jump) under a dark veil; headline + proof + chips + CTA float above with a
 * subtle scroll parallax (text rises slightly faster than the video scales).
 * Reduced-motion / data-saver: poster frame only.
 */
export default function Hero({ utm }: { utm: UTMParams }) {
  const { hero, trust, disclosure } = product;
  const videoRef = useRef<HTMLVideoElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reduced = prefersReducedMotion();

  // React doesn't render the `muted` ATTRIBUTE (only the property), which
  // autoplay policies require — force it, then kick playback with retries:
  // immediately, on canplay, and on the first scroll/touch (iOS low-power).
  useEffect(() => {
    const v = videoRef.current;
    if (!v || reduced) return;
    v.muted = true;
    v.setAttribute('muted', '');
    const kick = () => { if (v.paused) v.play().catch(() => {}); };
    kick();
    v.addEventListener('canplay', kick);
    window.addEventListener('scroll', kick, { passive: true, once: true });
    window.addEventListener('pointerdown', kick, { passive: true, once: true });
    // Chromium pauses video-only media in hidden tabs — resume on return.
    document.addEventListener('visibilitychange', kick);
    return () => {
      v.removeEventListener('canplay', kick);
      window.removeEventListener('scroll', kick);
      window.removeEventListener('pointerdown', kick);
      document.removeEventListener('visibilitychange', kick);
    };
  }, [reduced]);

  // One rAF-throttled scroll listener: video scale 1.08→1, content translateY.
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = Math.min(window.scrollY, 700);
        if (videoRef.current) {
          videoRef.current.style.transform = `scale(${1.08 - (y / 700) * 0.08})`;
        }
        if (contentRef.current) {
          contentRef.current.style.transform = `translateY(${y * -0.12}px)`;
        }
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <section className="relative min-h-[92svh] sm:min-h-[88vh] flex items-center justify-center overflow-hidden">
      {/* Layer 0: mist video (or poster when reduced motion) */}
      {reduced ? (
        <img
          src={hero.poster}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover will-change-transform"
          src={hero.video}
          poster={hero.poster}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
        />
      )}
      {/* Layer 1: dark veil + olive glow for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-bg/70 via-bg/40 to-bg" aria-hidden />
      <div className="absolute inset-0 hero-glow" aria-hidden />

      {/* Layer 2: content */}
      <div
        ref={contentRef}
        className="relative z-10 px-4 py-20 text-center mx-auto max-w-content will-change-transform"
      >
        <h1 className="font-display text-[clamp(2.5rem,9vw,3.75rem)] font-semibold leading-[1.05] text-ink text-balance drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
          {hero.h1}
        </h1>
        <p className="mt-4 text-lg sm:text-xl text-ink-soft max-w-[36ch] mx-auto">{hero.subhead}</p>

        <div className="mt-5 flex items-center justify-center gap-2 text-sm">
          <Stars rating={trust.rating} size={16} />
          <span className="font-semibold text-ink">{trust.rating.toFixed(1).replace('.', ',')}</span>
          <span className="text-ink-soft">· {trust.reviewsLabel} en Amazon</span>
        </div>

        <ul className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label="Características clave">
          {hero.chips.map((c) => (
            <li
              key={c}
              className="px-3 py-1.5 rounded-full border border-brand/40 bg-bg/50 backdrop-blur text-accent text-[13px] font-semibold"
            >
              {c}
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <CTAButton utm={utm} location="hero" variant="primary" />
          <p className="mt-2.5 text-sm text-ink-soft">{product.cta.sub}</p>
        </div>

        <p className="mt-5 text-xs text-ink-soft/70 max-w-[44ch] mx-auto">{disclosure.micro}</p>
      </div>
    </section>
  );
}
