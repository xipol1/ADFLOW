/**
 * consent.ts — minimal cookie-consent state. Non-essential measurement
 * (tracking beacon + UTM) only runs when analytics === true. Default = denied.
 */
export interface Consent {
  analytics: boolean;
  ts: string;
}

const KEY = 'vino_consent';
const listeners = new Set<() => void>();

export function getConsent(): Consent | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Consent) : null;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  return getConsent()?.analytics === true;
}

export function setConsent(analytics: boolean): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ analytics, ts: new Date().toISOString() }));
  } catch {
    /* storage blocked → choice applies for this session only */
  }
  listeners.forEach((l) => l());
}

export function subscribeConsent(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
