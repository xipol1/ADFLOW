import { useEffect } from 'react';
import type { Wine } from '../config/wines';
import { site } from '../config/site';
import Bottle from './Bottle';
import OrderButton from './OrderButton';
import { useInView } from '../hooks/useInView';
import { track } from '../lib/track';
import type { UTMParams } from '../hooks/useUTM';

/** S3..Sn — one cinematic zigzag scene per wine with full legal data + CTA. */
export default function WineScene({ wine, index, utm, flip = false }: { wine: Wine; index: number; utm: UTMParams; flip?: boolean }) {
  const { ref, inView } = useInView<HTMLElement>(0.4, false);

  // wine_view (consent-gated inside track), once per wine when ≥40% visible.
  useEffect(() => {
    if (inView) track('wine_view', { wineId: wine.id, cta_location: 'scene', utm });
  }, [inView, wine.id, utm]);

  const disponible = wine.disponible !== false;

  return (
    <section
      ref={ref}
      id={`vino-${wine.id}`}
      className="px-5 py-16 sm:py-24 overflow-hidden scroll-mt-20"
    >
      <div className={`mx-auto max-w-5xl flex flex-col gap-8 lg:gap-14 lg:flex-row lg:items-center ${flip ? 'lg:flex-row-reverse' : ''}`}>
        {/* Bottle */}
        <div className={`reveal ${inView ? 'in' : ''} lg:w-[40%] flex justify-center`} style={{ transitionDelay: '80ms' }}>
          {wine.imagen ? (
            <div className="overflow-hidden rounded-2xl shadow-card border border-border w-full max-w-[320px]">
              <img
                src={wine.imagen}
                alt={wine.nombre}
                className="w-full h-[380px] sm:h-[460px] object-cover"
                width={320}
                height={460}
                loading="lazy"
                decoding="async"
              />
            </div>
          ) : (
            <Bottle wine={wine} className="h-[320px] sm:h-[420px]" />
          )}
        </div>

        {/* Detail */}
        <div className="lg:w-[60%] min-w-0 text-center lg:text-left">
          <p className="font-body uppercase text-[11px] tracking-[0.28em] text-gold-soft">{wine.tipo} · {wine.denominacion}</p>
          <h2 className={`reveal-word ${inView ? 'in' : ''} mt-3 font-display text-[40px] sm:text-[52px] text-ink leading-[1.0]`}>
            {wine.nombre}
          </h2>

          {/* Metadata row */}
          <dl className="mt-4 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-sm">
            <div><dt className="text-ink-soft inline">Añada </dt><dd className="text-ink inline nums-oldstyle font-medium">{wine.anada}</dd></div>
            <div><dt className="text-ink-soft inline">Uvas </dt><dd className="text-ink inline font-medium">{wine.uvas}</dd></div>
            <div><dt className="text-ink-soft inline">Graduación </dt><dd className="text-ink inline font-medium">{wine.graduacion}</dd></div>
            {wine.temperatura && <div><dt className="text-ink-soft inline">Servir a </dt><dd className="text-ink inline font-medium">{wine.temperatura}</dd></div>}
          </dl>

          <p className={`reveal font-serif-body ${inView ? 'in' : ''} mt-5 text-ink-soft text-[18px] leading-[1.7]`} style={{ transitionDelay: '120ms' }}>
            {wine.notasCata}
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            <span className="text-ink font-medium">Marida con:</span> {wine.maridaje}
          </p>

          {wine.premios && (
            <p className="mt-3 text-sm text-cta font-semibold">★ {wine.premios}</p>
          )}

          {/* Mandatory legal per-wine notices */}
          <p className="mt-4 text-xs text-ink-soft/80">
            {wine.contieneSulfitos && <>Contiene sulfitos · </>}{wine.graduacion} · {wine.volumen ?? '75 cl'}
            {wine.infoProductoUrl && <> · <a href={wine.infoProductoUrl} className="underline" target="_blank" rel="noopener">Información del producto</a></>}
          </p>

          <div className="mt-6">
            {disponible ? (
              <>
                <OrderButton utm={utm} location={`scene_${index}`} wine={wine} variant="secondary" />
                <p className="mt-2.5 text-xs text-ink-soft/70 max-w-[46ch] mx-auto lg:mx-0">{site.ctaMicrocopy}</p>
              </>
            ) : (
              <span className="inline-flex items-center px-6 py-3 rounded-2xl border border-border text-ink-soft font-semibold">
                Consultar disponibilidad
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
