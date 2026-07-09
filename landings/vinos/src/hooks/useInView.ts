import { useEffect, useRef, useState } from 'react';

/**
 * useInView — IntersectionObserver wrapper driving scroll-reveals and media
 * play/pause. `once` keeps reveals revealed; pass once=false for videos so they
 * pause again off-screen (battery + decode budget).
 */
export function useInView<T extends HTMLElement>(threshold = 0.25, once = true) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, once]);

  return { ref, inView };
}

/** True when the user prefers reduced motion (checked once per mount). */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
