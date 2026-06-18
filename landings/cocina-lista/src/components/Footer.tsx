import { product } from '../config/product';

/** Footer — full affiliate disclosure, legal links, website operator. */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    // pb-24 on mobile keeps content clear of the fixed bottom CTA bar
    <footer className="px-4 pt-10 pb-24 sm:py-10 bg-bg border-t border-border">
      <div className="mx-auto max-w-content text-sm text-ink-soft">
        <p className="font-display text-lg font-semibold text-brand">{product.store.name}</p>

        <p className="mt-3 leading-relaxed">{product.disclosure.full}</p>

        <nav className="mt-5 flex flex-wrap gap-x-5 gap-y-2" aria-label="Enlaces legales">
          <a href="/legal/aviso-legal" className="underline hover:text-ink">
            Aviso legal
          </a>
          <a href="/legal/privacidad" className="underline hover:text-ink">
            Privacidad
          </a>
          <a href="/legal/cookies" className="underline hover:text-ink">
            Cookies
          </a>
        </nav>

        <p className="mt-5 text-xs text-ink-soft/80">
          © {year} {product.store.operator}. Amazon y el logotipo de Amazon son marcas de
          Amazon.com, Inc. o sus filiales.
        </p>
      </div>
    </footer>
  );
}
