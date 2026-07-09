import { useEffect, useState } from 'react';
import { getConsent, setConsent } from '../lib/consent';

/**
 * CookieBanner — non-essential measurement is OFF by default. The tracking
 * beacon (lib/track.ts) only fires after the visitor presses "Aceptar".
 * "Rechazar" is as easy as "Aceptar" (AEPD guidance). Shown AFTER the age gate.
 */
export default function CookieBanner({ onChange }: { onChange?: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsent() === null) setVisible(true);
  }, []);

  const decide = (analytics: boolean) => {
    setConsent(analytics);
    setVisible(false);
    onChange?.();
  };

  if (!visible) return null;

  return (
    <div role="dialog" aria-label="Aviso de cookies" className="fixed bottom-[84px] sm:bottom-0 inset-x-0 z-[70] p-3 sm:p-4">
      <div className="mx-auto max-w-content bg-surface border border-border rounded-2xl shadow-card p-4 sm:flex sm:items-center sm:gap-4">
        <p className="text-sm text-ink-soft leading-relaxed">
          Usamos almacenamiento técnico necesario (recordar tu edad) y, solo si lo aceptas, medición
          anónima de clics para saber qué funciona. Sin seguimiento de terceros.{' '}
          <a href="#cookies" className="underline hover:text-ink">Más información</a>.
        </p>
        <div className="mt-3 sm:mt-0 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => decide(false)}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-border text-sm font-semibold text-ink hover:bg-white/5"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={() => decide(true)}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-cta text-cta-ink text-sm font-semibold hover:brightness-105"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
