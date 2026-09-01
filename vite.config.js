import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Injects config/analytics-tag.html (Consent Mode v2 defaults + GTM loader +
// consent-gated Ahrefs) into the SPA shell. scripts/build-blog.js injects the
// very same file into the static blog, so the tag is defined once and cannot
// drift between the two surfaces — it silently did, and the whole blog shipped
// with no analytics at all. Read per-transform so edits show up without a
// dev-server restart; fails the build loudly rather than shipping untagged HTML.
function injectAnalyticsTag(rootDir) {
  const tagPath = path.resolve(rootDir, 'config', 'analytics-tag.html')
  return {
    name: 'inject-analytics-tag',
    transformIndexHtml(html) {
      if (!html.includes('<!--ANALYTICS_TAG-->')) {
        throw new Error('client/index.html lost its <!--ANALYTICS_TAG--> placeholder — the SPA would ship untagged')
      }
      return html.replace('<!--ANALYTICS_TAG-->', fs.readFileSync(tagPath, 'utf-8'))
    },
  }
}

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
    plugins: [react(), injectAnalyticsTag(__dirname)],
    root: clientRoot,
    base: '/',
    // Vite would otherwise look for publicDir at <root>/public (i.e.
    // client/public, which does not exist). Point it at the project's
    // /public folder where build-blog.js writes the static blog,
    // sitemap.xml, robots.txt, manifest.json, sw.js and logos. Without
    // this, Vercel served the SPA shell as text/html for /sitemap.xml,
    // /robots.txt and /manifest.json — which broke Google Search Console
    // sitemap discovery and PWA install.
    publicDir: path.resolve(__dirname, 'public'),
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
            motion: ['framer-motion'],
            charts: ['recharts'],
          },
        },
      },
    },
    css: {
      postcss: path.resolve(__dirname, 'postcss.config.js'),
    },
  }
})
