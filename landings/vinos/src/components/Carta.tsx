import { wines } from '../config/wines';
import Bottle from './Bottle';
import { useInView } from '../hooks/useInView';

/** S2 — "La carta": château-label cards over the journey; each scrolls to its scene. */
export default function Carta() {
  const { ref, inView } = useInView<HTMLElement>(0.2);

  return (
    <section ref={ref} id="carta" className="px-5 py-20 sm:py-28">
      <div className="mx-auto max-w-content text-center">
        <p className={`reveal ${inView ? 'in' : ''} kicker justify-center w-full`}>La carta</p>
        <h2 className={`reveal ${inView ? 'in' : ''} mt-4 font-display text-3xl sm:text-[44px] text-ink`}>
          Nuestra selección
        </h2>
        <div className="filet" />
        <p className={`reveal ${inView ? 'in' : ''} text-ink-soft`} style={{ transitionDelay: '100ms' }}>
          {wines.length} vinos de producción corta. Toca uno para conocerlo.
        </p>

        <ul className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {wines.map((w, i) => (
            <li key={w.id} className={`reveal ${inView ? 'in' : ''}`} style={{ transitionDelay: `${120 + i * 90}ms` }}>
              {/* gold gradient hairline frame */}
              <div className="p-px rounded-[6px] bg-gradient-to-b from-gold-soft/40 via-border to-transparent">
                <a
                  href={`#vino-${w.id}`}
                  className="group relative block rounded-[5px] bg-surface p-5 transition-transform duration-500 hover:-translate-y-1 overflow-hidden"
                  aria-label={`Ver ${w.nombre}`}
                >
                  {/* corner squares */}
                  <span className="absolute left-2 top-2 w-3 h-3 border-l border-t border-gold-soft/50" aria-hidden />
                  <span className="absolute right-2 top-2 w-3 h-3 border-r border-t border-gold-soft/50" aria-hidden />
                  <span className="absolute left-2 bottom-2 w-3 h-3 border-l border-b border-gold-soft/50" aria-hidden />
                  <span className="absolute right-2 bottom-2 w-3 h-3 border-r border-b border-gold-soft/50" aria-hidden />

                  <Bottle wine={w} className="h-40 mx-auto drop-shadow-[0_12px_18px_rgba(0,0,0,0.5)] transition-transform group-hover:-translate-y-0.5" />
                  <p className="mt-4 font-display text-[18px] text-ink leading-tight">{w.nombre}</p>
                  <span className="filet !my-2" />
                  <p className="font-body uppercase text-[10px] tracking-[0.24em] text-gold-soft">{w.tipo}</p>
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
