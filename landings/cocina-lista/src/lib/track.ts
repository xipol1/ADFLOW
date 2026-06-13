import { product } from '../config/product';
import type { UTMParams } from '../hooks/useUTM';

/**
 * track.ts — the single, central place where every CTA click:
 *   1. Builds the Amazon URL (affiliate tag + ascsubtag carrying the channel).
 *   2. Fires a fire-and-forget `outbound_click` beacon to the ChannelAd API.
 *   3. Navigates the visitor to Amazon.
 *
 * Routing every CTA through here makes it impossible for a button to ship
 * without tracking, and keeps the affiliate-tag logic in one auditable spot.
 */

export type CtaLocation = 'sticky' | 'sticky_bottom' | 'hero' | 'social' | 'final';

// Allow a local-dev / QA override without editing the committed config.
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ||
  product.tracking.apiBaseUrl.replace(/\/+$/, '');

/**
 * Builds the Amazon destination URL with the affiliate tag and an `ascsubtag`
 * that encodes the originating channel for Amazon-side attribution.
 * ascsubtag is capped at 100 chars (Amazon allows up to ~255; we stay lean).
 */
export function buildAmazonUrl(utm: UTMParams, cta: CtaLocation): string {
  let url: URL;
  try {
    url = new URL(product.amazon.url);
  } catch {
    return product.amazon.url; // malformed config → fail open to raw URL
  }

  url.searchParams.set('tag', product.amazon.tag);

  const source = (utm.utm_source || 'direct').replace(/[^\w.-]/g, '').slice(0, 40);
  const ascsubtag = `chad-${source}-${cta}`.slice(0, 100);
  url.searchParams.set('ascsubtag', ascsubtag);

  return url.toString();
}

/**
 * Fires the outbound_click beacon. Uses navigator.sendBeacon when available
 * (survives the page unload that immediately follows on same-tab navigation);
 * falls back to fetch with keepalive. The body is text/plain JSON so the
 * cross-origin request stays "simple" (no CORS preflight).
 */
export function fireOutboundClick(utm: UTMParams, cta: CtaLocation): void {
  const payload = JSON.stringify({
    utm_source: utm.utm_source ?? null,
    utm_medium: utm.utm_medium ?? null,
    utm_campaign: utm.utm_campaign ?? null,
    utm_content: utm.utm_content ?? null,
    cta_location: cta,
    store: product.store.name,
    product: product.tracking.productKey,
    ts: new Date().toISOString(),
  });

  const endpoint = `${API_BASE}/api/track/outbound-click`;

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
      const ok = navigator.sendBeacon(endpoint, blob);
      if (ok) return;
    }
  } catch {
    /* fall through to fetch */
  }

  try {
    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: payload,
      keepalive: true,
      mode: 'no-cors',
    });
  } catch {
    /* analytics is best-effort — never block the click-out */
  }
}

/**
 * The one action every CTA performs: track, then go to Amazon.
 * Desktop opens a new tab (config); mobile navigates in the same tab to keep
 * the impulse flow tight.
 */
export function handleCtaClick(utm: UTMParams, cta: CtaLocation): void {
  fireOutboundClick(utm, cta);
  const dest = buildAmazonUrl(utm, cta);

  const isCoarse =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(pointer: coarse)').matches;

  if (product.amazon.newTabDesktop && !isCoarse) {
    window.open(dest, '_blank', 'noopener,noreferrer');
  } else {
    window.location.href = dest;
  }
}
