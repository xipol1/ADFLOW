import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (process.env.VERCEL === '1' && mode === 'production' && env.NEXT_PUBLIC_API_URL && env.NEXT_PUBLIC_API_URL.includes('localhost')) {
    throw new Error('NEXT_PUBLIC_API_URL debe apuntar a un backend desplegado (no localhost)')
  }

  return {
    plugins: [react()],
    root: path.resolve(__dirname),
    base: '/',
    define: {
      'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(env.NEXT_PUBLIC_API_URL ?? ''),
    },
    optimizeDeps: {
      entries: [path.resolve(__dirname, 'index.html')],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
        '@components': path.resolve(__dirname, './components'),
        '@layouts': path.resolve(__dirname, './layouts'),
        '@styles': path.resolve(__dirname, './styles'),
        '@utils': path.resolve(__dirname, './utils'),
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
        input: path.resolve(__dirname, 'index.html'),
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
          },
        },
      },
    },
    css: {
      postcss: './postcss.config.js',
    },
  }
})
