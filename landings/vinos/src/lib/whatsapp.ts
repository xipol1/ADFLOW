import { site } from '../config/site';
import type { Wine } from '../config/wines';
import { track } from './track';
import type { UTMParams } from '../hooks/useUTM';

/** Builds the prefilled message for a wine (or a generic enquiry). */
export function buildWhatsAppMessage(wine?: Wine): string {
  if (wine?.waMensaje) return wine.waMensaje;
  const anada = wine?.anada && wine.anada !== 's/a' ? ` (${wine.anada})` : '';
  return site.whatsappTemplate
    .replace('{{NOMBRE}}', wine?.nombre ?? 'vuestros vinos')
    .replace('{{ANADA}}', wine ? anada : '');
}

/** wa.me deep link with URL-encoded prefilled text. Number must be E.164 w/o '+'. */
export function buildWhatsAppUrl(wine?: Wine): string {
  const num = site.contact.whatsappNumber.replace(/[^\d]/g, '');
  return `https://wa.me/${num}?text=${encodeURIComponent(buildWhatsAppMessage(wine))}`;
}

/** True if the configured number still looks like the placeholder. */
export function isPlaceholderNumber(): boolean {
  return /^3460{6,}$/.test(site.contact.whatsappNumber.replace(/[^\d]/g, ''));
}

/**
 * The one action behind every order CTA: fire the (consent-gated) beacon, then
 * open WhatsApp. Falls back to same-tab navigation if the popup is blocked.
 */
export function handleOrderClick(
  opts: { wine?: Wine; location: string; utm: UTMParams },
): void {
  track('whatsapp_order_click', { wineId: opts.wine?.id, cta_location: opts.location, utm: opts.utm });
  const url = buildWhatsAppUrl(opts.wine);
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) window.location.href = url; // popup blocked → same-tab fallback
}
