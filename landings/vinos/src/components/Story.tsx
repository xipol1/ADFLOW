import { site } from '../config/site';
import { useInView } from '../hooks/useInView';

/** Brand story — floats over the "cellar" stage of the journey, on a glass panel. */
export default function Story() {
  const { ref, inView } = useInView<HTMLElement>(0.3);
  return (
    <section ref={ref} className="px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-content text-center">
        <p className={`reveal ${inView ? 'in' : ''} kicker justify-center`}>Nuestra casa</p>
        <h2 className={`reveal ${inView ? 'in' : ''} mt-4 font-display text-3xl sm:text-[44px] text-ink`}>
          {site.story.title}
        </h2>
        <div className="filet" />
        <p className={`reveal font-serif-body ${inView ? 'in' : ''} mt-3 text-ink-soft text-[19px] leading-[1.7] max-w-[60ch] mx-auto`} style={{ transitionDelay: '120ms' }}>
          {site.story.body}
        </p>
      </div>
    </section>
  );
}
