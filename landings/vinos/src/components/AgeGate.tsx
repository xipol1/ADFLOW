import { useEffect, useRef, useState } from 'react';
import { site } from '../config/site';
import WineGlass from './WineGlass';
import VineyardBG from './VineyardBG';

const KEY = 'vinos_age_ok';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

function alreadyVerified(): boolean {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return false;
    const { ts } = JSON.parse(raw) as { v: number; ts: string };
    return Date.now() - new Date(ts).getTime() < MAX_AGE_MS;
  } catch {
    return false;
  }
}

/** Decorative gold corner squares (grand cru label frame). */
function Corners() {
  const c = 'absolute w-4 h-4 border-gold-soft/60';
  return (
    <>
      <span className={`${c} left-3 top-3 border-l border-t`} aria-hidden />
      <span className={`${c} right-3 top-3 border-r border-t`} aria-hidden />
      <span className={`${c} left-3 bottom-3 border-l border-b`} aria-hidden />
      <span className={`${c} right-3 bottom-3 border-r border-b`} aria-hidden />
    </>
  );
}

/**
 * AgeGate — château frontispiece. Visual redesign ONLY; the legal flow is
 * unchanged: fail-closed (.age-ok), 30-day localStorage, role=dialog + aria,
 * focus-trap, Escape blocked, body scroll lock, focus on the primary button.
 */
export default function AgeGate({ onConfirm }: { onConfirm: () => void }) {
  const [rejected, setRejected] = useState(false);
  const [open, setOpen] = useState(true);
  const yesRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (alreadyVerified()) {
      document.documentElement.classList.add('age-ok');
      setOpen(false);
      onConfirm();
    }
  }, [onConfirm]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    yesRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') e.preventDefault();
      if (e.key !== 'Tab') return;
      const f = dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href]');
      if (!f || f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const confirm = () => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ v: 1, ts: new Date().toISOString() }));
    } catch { /* session-only */ }
    document.documentElement.classList.add('age-ok');
    document.body.style.overflow = '';
    setOpen(false);
    onConfirm();
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-title"
      aria-describedby="age-desc"
      className="fixed inset-0 z-[9999] grid place-items-center px-5 overflow-hidden"
    >
      {/* Layered, non-flat château-at-dusk background */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 80% at 50% 18%, #3E0912 0%, #160810 55%, #0B0508 100%)' }}
        aria-hidden
      />
      <VineyardBG className="absolute inset-0 w-full h-full object-cover opacity-30" />
      <div className="absolute inset-x-0 top-[26%] h-px bg-gradient-to-r from-transparent via-gold-soft/40 to-transparent" aria-hidden />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 60% at 50% 45%, transparent 40%, rgba(11,5,8,.7) 100%)' }} aria-hidden />

      {/* Dialog card with gold hairline frame */}
      <div className="relative w-full max-w-md text-center border border-hairline rounded-[4px] px-7 py-10 sm:px-10 sm:py-12 bg-bg/30 backdrop-blur-[2px]">
        <Corners />

        {/* Monogram */}
        <span className="inline-grid place-items-center w-20 h-20 rounded-full border border-hairline">
          <WineGlass className="w-12 h-14" />
        </span>

        {!rejected ? (
          <>
            <p className="kicker mt-6 justify-center">Bodega · Selección</p>
            <p className="mt-3 font-display text-2xl text-gold-soft tracking-wide">{site.brandName}</p>
            <div className="filet" />

            <h1 id="age-title" className="font-display text-[40px] sm:text-[52px] leading-[1.0] text-ink">
              ¿Eres <em className="italic text-gold-soft">mayor</em> de 18 años?
            </h1>
            <p id="age-desc" className="mt-5 text-ink-soft leading-relaxed text-[15px]">
              Esta web muestra bebidas alcohólicas. La venta y el suministro de alcohol a menores de
              18 años están prohibidos (Ley 6/2025). En la entrega podremos solicitarte un documento
              que acredite tu edad.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                ref={yesRef}
                type="button"
                onClick={confirm}
                className="cta-sweep rounded-[3px] bg-cta text-cta-ink px-8 py-4 font-body uppercase text-[13px] tracking-[0.18em] font-semibold ring-1 ring-gold-deep shadow-gold transition-transform duration-300 hover:-translate-y-px active:scale-[.99]"
              >
                Sí, soy mayor de edad
              </button>
              <button
                type="button"
                onClick={() => setRejected(true)}
                className="rounded-[3px] px-8 py-4 font-body uppercase text-[13px] tracking-[0.18em] text-ink border border-hairline transition-colors duration-300 hover:border-gold-soft hover:text-gold-soft"
              >
                No
              </button>
            </div>
            <p className="mt-7 text-xs text-ink-soft/80">{site.legalNotices.salud}</p>
          </>
        ) : (
          <>
            <div className="filet" />
            <h1 className="font-display text-3xl sm:text-4xl leading-tight text-ink">
              Vuelve cuando seas <em className="italic text-gold-soft">mayor</em> de edad
            </h1>
            <p className="mt-4 text-ink-soft">
              Lo sentimos, debes ser mayor de 18 años para acceder a este sitio.
            </p>
            <button
              type="button"
              onClick={() => { window.location.href = 'https://www.google.com'; }}
              className="mt-7 rounded-[3px] px-8 py-4 font-body uppercase text-[13px] tracking-[0.18em] text-ink border border-hairline transition-colors duration-300 hover:border-gold-soft hover:text-gold-soft"
            >
              Salir
            </button>
          </>
        )}
      </div>
    </div>
  );
}
