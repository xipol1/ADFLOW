import { useEffect, useState } from 'react';

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
}

const UTM_KEYS: (keyof UTMParams)[] = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
const STORAGE_KEY = 'cl_utm';

function readFromQuery(): UTMParams {
  const out: UTMParams = {};
  try {
    const sp = new URLSearchParams(window.location.search);
    for (const k of UTM_KEYS) {
      const v = sp.get(k);
      if (v) out[k] = v.slice(0, 200);
    }
  } catch {
    /* SSR / no window → empty */
  }
  return out;
}

function readFromStorage(): UTMParams {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UTMParams) : {};
  } catch {
    return {};
  }
}

/**
 * useUTM — captures utm_* from the landing URL on first load and persists them
 * to localStorage so they survive in-session navigation. URL params win over
 * stored ones (a fresh click from a channel should re-attribute). The result is
 * propagated to both the outbound_click beacon and Amazon's ascsubtag.
 *
 * (localStorage is intentional here: this is a real first-party page, not a
 * sandboxed artifact.)
 */
export function useUTM(): UTMParams {
  const [utm, setUtm] = useState<UTMParams>({});

  useEffect(() => {
    const fromQuery = readFromQuery();
    const merged = { ...readFromStorage(), ...fromQuery };
    if (Object.keys(fromQuery).length > 0) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        /* storage blocked → still usable in-memory */
      }
    }
    setUtm(merged);
  }, []);

  return utm;
}
