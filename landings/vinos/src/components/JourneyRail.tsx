import { useEffect, useState } from 'react';

export interface Stage { id: string; label: string }

/**
 * JourneyRail — makes the "life of wine" journey explicit and navigable. A fixed
 * vertical rail (desktop) / slim top progress (mobile) of named stages; one
 * IntersectionObserver marks the active chapter. Click scrolls to it.
 */
export default function JourneyRail({ stages }: { stages: Stage[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const els = stages.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (vis) {
          const i = stages.findIndex((s) => s.id === vis.target.id);
          if (i >= 0) setActive(i);
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0.01, 0.5] },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [stages]);

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <nav aria-label="Recorrido del vino" className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col gap-4">
      {stages.map((s, i) => {
        const on = i === active;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => go(s.id)}
            className="group flex items-center gap-3 justify-end"
            aria-current={on ? 'true' : undefined}
            aria-label={`Ir a ${s.label}`}
          >
            <span
              className={`font-body uppercase tracking-[0.22em] text-[10px] transition-all duration-300 ${
                on ? 'text-gold-soft opacity-100' : 'text-ink-soft opacity-0 group-hover:opacity-70'
              }`}
            >
              {s.label}
            </span>
            <span className={`block rounded-full transition-all duration-300 ${on ? 'w-2.5 h-2.5 bg-gold-soft' : 'w-1.5 h-1.5 bg-ink-soft/40 group-hover:bg-gold-soft/60'}`} />
          </button>
        );
      })}
    </nav>
  );
}
