import { useEffect, useRef } from 'react';
import { site } from '../config/site';
import OrderButton from './OrderButton';
import { prefersReducedMotion } from '../hooks/useInView';
import type { UTMParams } from '../hooks/useUTM';

const VIDEO = '/assets/photos/hero-pour.mp4';
const POSTER = '/assets/photos/hero-poster.webp';

/** S1 — Cinematic hero: real "pour" video background + parallax + headline + CTA. */
export default function Hero({ utm }: { utm: UTMParams }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reduced = prefersReducedMotion();

  // Robust muted autoplay (React doesn't render the muted attribute).
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
    document.addEventListener('visibilitychange', kick);
    return () => {
      v.removeEventListener('canplay', kick);
      window.removeEventListener('scroll', kick);
      window.removeEventListener('pointerdown', kick);
      document.removeEventListener('visibilitychange', kick);
    };
  }, [reduced]);

  // Parallax.
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = Math.min(window.scrollY, 700);
        if (bgRef.current) bgRef.current.style.transform = `translateY(${y * 0.15}px) scale(1.06)`;
        if (contentRef.current) contentRef.current.style.transform = `translateY(${y * -0.12}px)`;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [reduced]);

  return (
    <section id="cap-hero" className="relative min-h-[92svh] flex items-center justify-center overflow-hidden">
      <div ref={bgRef} className="absolute inset-0 will-change-transform" style={{ transform: 'scale(1.06)' }}>
        {reduced ? (
          <img src={POSTER} alt="" aria-hidden className="w-full h-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            src={VIDEO}
            poster={POSTER}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden
          />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-bg/70 via-bg/45 to-bg" aria-hidden />

      <div ref={contentRef} className="relative z-10 px-5 py-20 text-center mx-auto max-w-content will-change-transform">
        <p className="kicker justify-center w-full">{site.brandName}</p>
        <h1 className="mt-5 font-display text-[clamp(2.75rem,9vw,4.75rem)] leading-[1.02] text-ink text-balance drop-shadow-[0_2px_18px_rgba(0,0,0,0.75)]">
          {site.hero.h1}
        </h1>
        <p className="mt-5 font-serif-body text-xl sm:text-2xl text-ink-soft max-w-[42ch] mx-auto leading-relaxed">{site.hero.sub}</p>
        <div className="mt-8">
          <OrderButton utm={utm} location="hero" variant="primary" />
          <p className="mt-3 text-xs text-ink-soft/80 max-w-[46ch] mx-auto">{site.ctaMicrocopy}</p>
        </div>
        <p className="mt-6 inline-block px-3 py-1 rounded-full border border-cta/40 text-cta text-xs font-semibold">
          +18 · {site.legalNotices.salud}
        </p>
      </div>
    </section>
  );
}
