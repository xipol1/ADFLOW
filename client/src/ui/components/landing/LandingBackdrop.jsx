import React from 'react'

/**
 * LandingBackdrop — fixed, full-viewport living background for the home.
 *
 * Codex-style: near-monochrome, three very soft gradient blobs drifting
 * slowly in different directions, plus a fine static grain for the matte
 * "expensive" feel. Content scrolls over it (position: fixed), which is
 * what reads as "dynamic" without anything actually moving fast.
 *
 * Cost/safety:
 *  - Only `transform` animates (GPU-composited) — no layout, no paint, no
 *    CLS. The grain is a static tiled SVG.
 *  - pointer-events: none and aria-hidden — invisible to interaction and AT.
 *  - prefers-reduced-motion freezes the drift entirely.
 *  - z-index:-1 inside the page's isolated stacking context (isolation:
 *    isolate on the root) paints it above the root's own var(--bg) but
 *    behind every normal-flow section — without leaking behind the page.
 */
export default function LandingBackdrop() {
  return (
    <div className="lp-backdrop" aria-hidden="true">
      <div className="lp-backdrop__blob lp-backdrop__blob--a" />
      <div className="lp-backdrop__blob lp-backdrop__blob--b" />
      <div className="lp-backdrop__blob lp-backdrop__blob--c" />
      <div className="lp-backdrop__grain" />

      <style>{`
        .lp-backdrop {
          position: fixed;
          inset: 0;
          z-index: -1;
          overflow: hidden;
          pointer-events: none;
          /* Base fill so the page never flashes the body background through
             the blob transparency. */
          background: var(--bg);
        }

        .lp-backdrop__blob {
          position: absolute;
          width: 70vw;
          height: 70vw;
          max-width: 900px;
          max-height: 900px;
          border-radius: 50%;
          will-change: transform;
          /* radial-gradient soft falloff = no filter:blur needed (cheaper). */
        }

        /* ── Light theme: present but professional. Tuned to read clearly
           on the #F8FAFB base without tipping into "decorative". ── */
        .lp-backdrop__blob--a {
          top: -16vw;
          left: -10vw;
          background: radial-gradient(circle at center,
            rgba(124, 58, 237, 0.16) 0%,
            rgba(124, 58, 237, 0.06) 38%,
            transparent 68%);
          animation: lp-drift-a 34s ease-in-out infinite alternate;
        }
        .lp-backdrop__blob--b {
          top: -8vw;
          right: -14vw;
          background: radial-gradient(circle at center,
            rgba(99, 102, 241, 0.15) 0%,
            rgba(99, 102, 241, 0.05) 40%,
            transparent 70%);
          animation: lp-drift-b 42s ease-in-out infinite alternate;
        }
        .lp-backdrop__blob--c {
          bottom: -22vw;
          left: 26vw;
          background: radial-gradient(circle at center,
            rgba(56, 189, 248, 0.10) 0%,
            rgba(56, 189, 248, 0.03) 42%,
            transparent 70%);
          animation: lp-drift-c 38s ease-in-out infinite alternate;
        }

        /* ── Dark theme: deeper glows on the near-black bg ── */
        [data-theme="dark"] .lp-backdrop__blob--a {
          background: radial-gradient(circle at center,
            rgba(139, 92, 246, 0.18) 0%,
            rgba(139, 92, 246, 0.06) 40%,
            transparent 70%);
        }
        [data-theme="dark"] .lp-backdrop__blob--b {
          background: radial-gradient(circle at center,
            rgba(99, 102, 241, 0.15) 0%,
            rgba(99, 102, 241, 0.05) 42%,
            transparent 72%);
        }
        [data-theme="dark"] .lp-backdrop__blob--c {
          background: radial-gradient(circle at center,
            rgba(37, 211, 102, 0.06) 0%,
            transparent 66%);
        }

        /* Fine grain — tiny tiled feTurbulence, near-invisible, kills the
           flat "digital" look and reads as matte print. */
        .lp-backdrop__grain {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity: 0.035;
          mix-blend-mode: multiply;
        }
        [data-theme="dark"] .lp-backdrop__grain {
          opacity: 0.05;
          mix-blend-mode: overlay;
        }

        @keyframes lp-drift-a {
          0%   { transform: translate3d(0, 0, 0) scale(1); }
          100% { transform: translate3d(7vw, 5vw, 0) scale(1.12); }
        }
        @keyframes lp-drift-b {
          0%   { transform: translate3d(0, 0, 0) scale(1.08); }
          100% { transform: translate3d(-6vw, 7vw, 0) scale(1); }
        }
        @keyframes lp-drift-c {
          0%   { transform: translate3d(0, 0, 0) scale(1); }
          100% { transform: translate3d(4vw, -6vw, 0) scale(1.15); }
        }

        @media (prefers-reduced-motion: reduce) {
          .lp-backdrop__blob { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
