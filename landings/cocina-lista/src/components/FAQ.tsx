import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { product } from '../config/product';

/** S5 — FAQ accordion (4 questions). */
export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="px-4 py-8">
      <div className="mx-auto max-w-content">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink text-center">
          Preguntas frecuentes
        </h2>

        <div className="mt-6 divide-y divide-border border border-border rounded-2xl bg-surface overflow-hidden">
          {product.faq.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="font-body font-semibold text-ink">{item.q}</span>
                    <ChevronDown
                      size={20}
                      className={`shrink-0 text-ink-soft transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                  </button>
                </h3>
                {isOpen && <p className="px-5 pb-4 -mt-1 text-ink-soft leading-relaxed">{item.a}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
