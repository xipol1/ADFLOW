import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (process.env.VERCEL === '1' && mode === 'production' && env.NEXT_PUBLIC_API_URL && env.NEXT_PUBLIC_API_URL.includes('localhost')) {
    throw new Error('NEXT_PUBLIC_API_URL debe apuntar a un backend desplegado (no localhost)')
  }

  // Frontend lives under /client (index.html + src + styles).
  // Build output stays at the project root in /dist so Vercel keeps using
  // outputDirectory: "dist" without changes.
  const clientRoot = path.resolve(__dirname, 'client')

  return {
    plugins: [react()],
    root: clientRoot,
    base: '/',
    define: {
      'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(env.NEXT_PUBLIC_API_URL ?? ''),
    },
    optimizeDeps: {
      entries: [path.resolve(clientRoot, 'index.html')],
    },
    resolve: {
      alias: {
        '@': path.resolve(clientRoot, 'src'),
        '@styles': path.resolve(clientRoot, 'styles'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      port: parseInt(process.env.PORT || '3000'),
      host: true,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      sourcemap: mode !== 'production',
      rollupOptions: {
        input: path.resolve(clientRoot, 'index.html'),
        output: {
          // Anonymize chunk names to avoid exposing library names in production
          chunkFileNames: 'assets/c-[hash].js',
          entryFileNames: 'assets/e-[hash].js',
          assetFileNames: 'assets/a-[hash].[ext]',
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
          },
        },
      },
    },
    css: {
      postcss: path.resolve(__dirname, 'postcss.config.js'),
    },
  }
})
