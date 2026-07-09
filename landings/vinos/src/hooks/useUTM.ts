import { useEffect, useState } from 'react';

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
}

const UTM_KEYS: (keyof UTMParams)[] = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];

/**
 * useUTM — reads utm_* from the landing URL into memory for the session.
 *
 * Intentionally EPHEMERAL (no localStorage): persisting UTM for measurement is
 * a non-essential purpose that, under the AEPD cookie guidance, requires prior
 * consent. This is a single-page site, so in-memory is enough; the values are
 * only attached to the tracking beacon, which itself only fires AFTER the user
 * accepts analytics in the cookie banner (see lib/track.ts).
 */
export function useUTM(): UTMParams {
  const [utm, setUtm] = useState<UTMParams>({});

  useEffect(() => {
    const out: UTMParams = {};
    try {
      const sp = new URLSearchParams(window.location.search);
      for (const k of UTM_KEYS) {
        const v = sp.get(k);
        if (v) out[k] = v.slice(0, 200);
      }
    } catch {
      /* no window → empty */
    }
    setUtm(out);
  }, []);

  return utm;
}
