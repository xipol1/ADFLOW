import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standalone cinematic wine showcase. Static SPA; the only outbound action is a
// WhatsApp deep link + a fire-and-forget tracking beacon (see src/config).
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2018',
    cssCodeSplit: false,
  },
});
