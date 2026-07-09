import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { site } from '../config/site';
import { useInView } from '../hooks/useInView';

/** FAQ accordion — glass over the journey. WhatsApp flow, delivery zone, 18+. */
export default function FAQ() {
  const { ref, inView } = useInView<HTMLElement>(0.2);
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section ref={ref} className="px-5 py-16 sm:py-20">
      <div className="mx-auto max-w-content">
        <p className={`reveal ${inView ? 'in' : ''} kicker justify-center w-full`}>Antes de pedir</p>
        <h2 className={`reveal ${inView ? 'in' : ''} mt-4 font-display text-3xl sm:text-[40px] text-ink text-center`}>
          Preguntas frecuentes
        </h2>
        <div className="filet" />
        <div className="mt-6 divide-y divide-hairline border border-hairline rounded-[5px] bg-surface overflow-hidden">
          {site.faq.map((item, i) => {
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
                    <span className="font-display text-[19px] text-ink">{item.q}</span>
                    <ChevronDown size={20} className={`shrink-0 text-gold-soft transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
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
