/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        paper: 'rgb(var(--paper) / <alpha-value>)',
        ivory: 'rgb(var(--ivory) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--ink-soft) / <alpha-value>)',
        brand: 'rgb(var(--brand) / <alpha-value>)',
        'brand-deep': 'rgb(var(--brand-deep) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        cta: 'rgb(var(--cta) / <alpha-value>)',
        'cta-ink': 'rgb(var(--cta-ink) / <alpha-value>)',
        gold: 'rgb(var(--gold) / <alpha-value>)',
        'gold-soft': 'rgb(var(--gold-soft) / <alpha-value>)',
        'gold-deep': 'rgb(var(--gold-deep) / <alpha-value>)',
        star: 'rgb(var(--star) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        // fixed translucent gold hairline (champagne gold @ 22%)
        hairline: 'rgb(var(--gold-soft) / 0.22)',
      },
      fontFamily: {
        // French Didone display now leads; Inter stays for system/UI.
        display: ['"Cormorant Garamond Variable"', '"Cormorant Garamond"', 'Garamond', 'Georgia', 'serif'],
        serif: ['"EB Garamond Variable"', '"EB Garamond"', 'Garamond', 'Georgia', 'serif'],
        body: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '4px', xl: '6px', '2xl': '8px' },
      boxShadow: {
        card: '0 20px 50px -28px rgba(0,0,0,.7)',
        gold: '0 1px 0 rgba(255,255,255,.25) inset, 0 12px 34px -12px rgba(199,162,74,.55)',
      },
      maxWidth: { content: '720px' },
    },
  },
  plugins: [],
};
