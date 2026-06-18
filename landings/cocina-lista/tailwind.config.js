/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Design tokens — neutral store brand (NOT ChannelAd purple/green).
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        brand: 'var(--brand)',
        'brand-deep': 'var(--brand-deep)',
        paper: 'var(--paper)',
        accent: 'var(--accent)',
        cta: 'var(--cta)',
        'cta-ink': 'var(--cta-ink)',
        star: 'var(--star)',
        border: 'var(--border)',
      },
      fontFamily: {
        display: ['"Fraunces Variable"', 'Fraunces', 'Georgia', 'serif'],
        body: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '16px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        card: '0 6px 24px rgba(0,0,0,.08)',
      },
      maxWidth: {
        content: '680px',
      },
    },
  },
  plugins: [],
};
