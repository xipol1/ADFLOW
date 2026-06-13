import { useInView } from '../hooks/useInView';
import { product } from '../config/product';

/**
 * S4 — The 10 pre-written labels fan out like a deck of cards as the section
 * scrolls in. Pure DOM/CSS 3D (rotate + translate per index, staggered delays).
 */
export default function LabelsFan() {
  const { ref, inView } = useInView<HTMLElement>(0.35);
  const { labels } = product;
  const n = labels.items.length;

  return (
    <section ref={ref} className="px-4 py-14 sm:py-20 text-center overflow-hidden">
      <div className="mx-auto max-w-content">
        <h2 className={`reveal ${inView ? 'in' : ''} font-display text-3xl sm:text-4xl font-semibold text-ink`}>
          {labels.title}
        </h2>
        <p className={`reveal ${inView ? 'in' : ''} mt-3 text-ink-soft`} style={{ transitionDelay: '120ms' }}>
          {labels.sub}
        </p>

        <ul
          className="mt-10 relative h-48 sm:h-52 [perspective:900px]"
          aria-label="Etiquetas incluidas"
        >
          {labels.items.map((name, i) => {
            const mid = (n - 1) / 2;
            const off = i - mid; // -4.5 … 4.5
            const open = inView;
            return (
              <li
                key={name}
                className="absolute left-1/2 top-1/2 w-[92px] h-[124px] rounded-lg bg-[#181613] border border-border shadow-card
                           flex flex-col items-center justify-center gap-1 select-none
                           transition-transform duration-700 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  transitionDelay: `${i * 45}ms`,
                  transform: open
                    ? `translate(-50%,-50%) translateX(${off * 34}px) rotate(${off * 7}deg) translateY(${Math.abs(off) * 9}px)`
                    : 'translate(-50%,-50%) rotate(0deg)',
                  zIndex: i,
                }}
              >
                <span className="text-[9px] tracking-[0.18em] text-ink-soft/70 uppercase">Sweet View</span>
                <span className="font-display text-[13px] text-paper leading-tight px-1">{name}</span>
                <span className="text-[8px] text-ink-soft/60">470 ml</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
