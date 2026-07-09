import { Grape, HeartHandshake, Truck, MessageCircle, type LucideIcon } from 'lucide-react';
import { site } from '../config/site';
import { useInView } from '../hooks/useInView';

const ICONS: Record<string, LucideIcon> = {
  grape: Grape,
  'heart-handshake': HeartHandshake,
  truck: Truck,
  'message-circle': MessageCircle,
};

/** Trust row — medallion icons + hairline glass cards. */
export default function Benefits() {
  const { ref, inView } = useInView<HTMLElement>(0.25);
  return (
    <section ref={ref} className="px-5 py-16 sm:py-20">
      <div className="mx-auto max-w-content grid gap-4 sm:grid-cols-3">
        {site.benefits.map((b, i) => {
          const Icon = ICONS[b.icon] ?? Grape;
          return (
            <div
              key={b.title}
              className={`reveal ${inView ? 'in' : ''} rounded-[4px] border border-hairline bg-surface px-6 py-8 text-center`}
              style={{ transitionDelay: `${100 + i * 110}ms` }}
            >
              <span className="inline-grid place-items-center w-12 h-12 rounded-full border border-hairline text-gold-soft">
                <Icon size={22} strokeWidth={1.25} aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-xl text-ink">{b.title}</h3>
              <span className="filet" />
              <p className="text-sm text-ink-soft leading-relaxed">{b.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
