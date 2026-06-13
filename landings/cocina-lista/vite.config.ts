import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standalone bridge page. Static SPA, no API of its own — it only fires a
// fire-and-forget beacon to the ChannelAd tracking API (see src/config/product.ts).
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2018',
    cssCodeSplit: false,
  },
});
