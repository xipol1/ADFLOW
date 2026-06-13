import { useEffect, useRef } from 'react';
import { useInView, prefersReducedMotion } from '../hooks/useInView';
import type { SceneConfig } from '../config/product';

/**
 * S2/S3 — Cinematic scene: a big serif word + real product clip that plays
 * only while visible (pauses off-screen).
 *
 * Layout: stacked (word full-width, then video) up to `lg`; two-column zig-zag
 * from `lg` on a wide container. The word uses a fluid clamp() size so it ALWAYS
 * fits its column — never clipped by the section's overflow-hidden. `min-w-0`
 * lets the flex columns shrink instead of forcing horizontal overflow.
 */
export default function Scene({ scene, flip = false }: { scene: SceneConfig; flip?: boolean }) {
  const { ref, inView } = useInView<HTMLElement>(0.3, false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    const v = videoRef.current;
    if (!v || reduced) return;
    if (inView) {
      v.muted = true;
      v.setAttribute('muted', ''); // autoplay policy needs the attribute
      const kick = () => { if (v.paused) v.play().catch(() => {}); };
      kick();
      // Strict autoplay policies: retry on the next real interaction, and
      // when a hidden tab (where Chromium pauses video-only media) returns.
      window.addEventListener('scroll', kick, { passive: true, once: true });
      window.addEventListener('pointerdown', kick, { passive: true, once: true });
      document.addEventListener('visibilitychange', kick);
      return () => {
        window.removeEventListener('scroll', kick);
        window.removeEventListener('pointerdown', kick);
        document.removeEventListener('visibilitychange', kick);
      };
    }
    v.pause();
  }, [inView, reduced]);

  return (
    <section ref={ref} className="px-5 py-16 sm:py-24 overflow-hidden">
      <div
        className={`mx-auto max-w-5xl flex flex-col gap-7 lg:gap-12 lg:flex-row lg:items-center ${
          flip ? 'lg:flex-row-reverse' : ''
        }`}
      >
        <div className="lg:w-[45%] min-w-0 text-center lg:text-left">
          <h2
            className={`reveal-word ${inView ? 'in' : ''} font-display font-semibold text-ink leading-[0.95] text-[clamp(2.75rem,8vw,4.5rem)]`}
            style={{ overflowWrap: 'break-word', hyphens: 'none' }}
          >
            {scene.word}
          </h2>
          <p
            className={`reveal ${inView ? 'in' : ''} mt-5 text-ink-soft text-lg leading-relaxed max-w-[42ch] mx-auto lg:mx-0`}
            style={{ transitionDelay: '180ms' }}
          >
            {scene.caption}
          </p>
        </div>

        <div
          className={`reveal ${inView ? 'in' : ''} lg:w-[55%] min-w-0`}
          style={{ transitionDelay: '120ms' }}
        >
          <div className="overflow-hidden rounded-2xl shadow-card border border-border bg-surface">
            {reduced ? (
              <img src={scene.poster} alt={scene.caption} className="w-full block" width={1280} height={720} loading="lazy" />
            ) : (
              <video
                ref={videoRef}
                src={scene.video}
                poster={scene.poster}
                muted
                loop
                playsInline
                preload="none"
                className="w-full block"
                width={1280}
                height={720}
                aria-label={scene.caption}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
