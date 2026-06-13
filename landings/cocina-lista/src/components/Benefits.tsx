import { Leaf, Flame, Droplet, type LucideIcon } from 'lucide-react';
import { product } from '../config/product';
import { useInView } from '../hooks/useInView';

const ICONS: Record<string, LucideIcon> = { leaf: Leaf, flame: Flame, droplet: Droplet };

/** S5 — Three benefit cards (dark glass) + the kcal stat band. */
export default function Benefits() {
  const { ref, inView } = useInView<HTMLElement>(0.25);

  return (
    <section ref={ref} className="px-4 py-14 sm:py-16">
      <div className="mx-auto max-w-content">
        <h2 className={`reveal ${inView ? 'in' : ''} font-display text-3xl sm:text-4xl font-semibold text-ink text-center`}>
          Por qué te va a encantar
        </h2>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {product.benefits.map((b, i) => {
            const Icon = ICONS[b.icon] ?? Leaf;
            return (
              <div
                key={b.title}
                className={`reveal ${inView ? 'in' : ''} bg-surface border border-border rounded-2xl p-5 text-center sm:text-left`}
                style={{ transitionDelay: `${120 + i * 110}ms` }}
              >
                <span className="inline-grid place-items-center w-11 h-11 rounded-xl bg-brand/15 text-brand">
                  <Icon size={22} aria-hidden />
                </span>
                <h3 className="mt-3 font-display text-lg font-semibold text-ink">{b.title}</h3>
                <p className="mt-1 text-sm text-ink-soft leading-relaxed">{b.body}</p>
              </div>
            );
          })}
        </div>

        <p
          className={`reveal ${inView ? 'in' : ''} mt-6 mx-auto block w-fit px-5 py-3 rounded-xl bg-brand/10 border border-brand/25 text-accent font-semibold text-sm sm:text-base text-center`}
          style={{ transitionDelay: '420ms' }}
        >
          {product.stat}
        </p>
      </div>
    </section>
  );
}
