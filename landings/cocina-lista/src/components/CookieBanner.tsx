import { useEffect, useState } from 'react';

const CONSENT_KEY = 'cl_cookie_consent';

/**
 * Cookie banner. Non-essential cookies are rejected BY DEFAULT — no third-party
 * tracking loads until the visitor explicitly accepts. The first-party
 * outbound_click beacon carries no PII and is treated as essential measurement,
 * so it is not gated here.
 *
 * (There is currently no third-party tracking on the page; this records the
 * visitor's choice and is the integration point if any is ever added.)
 */
export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(CONSENT_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const decide = (value: 'accepted' | 'rejected') => {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      /* storage blocked → still dismiss for the session */
    }
    setVisible(false);
    // If/when third-party tracking is added, load it here only when value === 'accepted'.
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed bottom-[96px] sm:bottom-0 inset-x-0 z-[60] p-3 sm:p-4"
    >
      <div className="mx-auto max-w-content bg-surface border border-border rounded-2xl shadow-card p-4 sm:flex sm:items-center sm:gap-4">
        <p className="text-sm text-ink-soft leading-relaxed">
          Usamos solo cookies esenciales para que la web funcione y medir clics de forma anónima.
          No cargamos seguimiento de terceros sin tu permiso.{' '}
          <a href="/legal/cookies" className="underline hover:text-ink">
            Más información
          </a>
          .
        </p>
        <div className="mt-3 sm:mt-0 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => decide('rejected')}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-border text-sm font-semibold text-ink hover:bg-bg"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={() => decide('accepted')}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:brightness-110"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
