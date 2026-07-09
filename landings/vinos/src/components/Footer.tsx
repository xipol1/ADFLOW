import { site } from '../config/site';
import { legalDocs } from '../config/legal';

/** Footer — permanent alcohol notices + seller identity + legal docs (LSSI/RGPD). */
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="px-5 pt-12 pb-28 sm:pb-12 bg-bg border-t border-border">
      <div className="mx-auto max-w-content text-sm text-ink-soft">
        {/* Mandatory health/age warning — prominent, warning tone (not a slogan) */}
        <p className="font-display text-cta text-base font-semibold tracking-wide">
          +18 · {site.legalNotices.edad}
        </p>
        <p className="mt-1 text-ink-soft">
          {site.legalNotices.salud} {site.legalNotices.embarazo}
        </p>

        <p className="mt-6 font-display text-lg text-ink">{site.brandName}</p>
        <p className="mt-1">
          Contacto: {site.contact.email} · {site.contact.telefono}
        </p>
        <p className="mt-1 text-ink-soft/80">
          Reparto: {site.reparto.zona} · Pedido mínimo: {site.reparto.pedidoMinimo} · {site.reparto.plazo}
        </p>

        {/* Legal documents (LSSI art.10 + RGPD + cookies) */}
        <div className="mt-7 space-y-2">
          {legalDocs.map((doc) => (
            <details key={doc.id} id={doc.id} className="border border-border rounded-xl bg-surface/50 scroll-mt-24">
              <summary className="px-4 py-3 cursor-pointer font-semibold text-ink select-none">{doc.title}</summary>
              <div className="px-4 pb-4 text-ink-soft leading-relaxed whitespace-pre-line">{doc.body}</div>
            </details>
          ))}
        </div>

        <p className="mt-7 text-xs text-ink-soft/70">
          © {year} {site.brandName}. Bebe con conocimiento; no compartas alcohol con menores.
          Esta web no realiza ventas ni cobros: los pedidos se coordinan por WhatsApp.
        </p>
      </div>
    </footer>
  );
}
