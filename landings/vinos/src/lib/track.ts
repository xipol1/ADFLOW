import { site } from '../config/site';
import { hasAnalyticsConsent } from './consent';
import type { UTMParams } from '../hooks/useUTM';

/**
 * track.ts — fire-and-forget measurement beacon, GATED by cookie consent.
 *
 * Nothing is sent unless the visitor accepted analytics in the cookie banner.
 * Reuses the ChannelAd public beacon endpoint (text/plain → no CORS preflight).
 */

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ||
  'https://channelad.io';

export type TrackEvent =
  | 'page_view'
  | 'age_gate_confirmed'
  | 'wine_view'
  | 'whatsapp_order_click'
  | 'cookie_consent';

export interface TrackPayload {
  utm?: UTMParams;
  cta_location?: string; // hero | scene | carta | sticky_bar | final_cta
  wineId?: string;
}

export function track(event: TrackEvent, payload: TrackPayload = {}): void {
  // Consent gate: no measurement without explicit opt-in.
  if (!hasAnalyticsConsent()) return;

  const utm = payload.utm ?? {};
  const body = JSON.stringify({
    event,
    utm_source: utm.utm_source ?? null,
    utm_medium: utm.utm_medium ?? null,
    utm_campaign: utm.utm_campaign ?? null,
    utm_content: utm.utm_content ?? null,
    cta_location: payload.cta_location ?? event,
    store: site.brandName,
    product: payload.wineId ?? null,
    ts: new Date().toISOString(),
  });

  const endpoint = `${API_BASE}/api/track/outbound-click`;
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'text/plain;charset=UTF-8' });
      if (navigator.sendBeacon(endpoint, blob)) return;
    }
  } catch {
    /* fall through */
  }
  try {
    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body,
      keepalive: true,
      mode: 'no-cors',
    });
  } catch {
    /* measurement is best-effort */
  }
}
