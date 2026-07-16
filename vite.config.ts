import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [
      basicSsl(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'Stork.glb'],
        manifest: false, // Use our existing public/manifest.json file instead of generating one, to maintain full compliance!
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,glb,json}'],
          // vendor chunk can be ~2.6 MB minified (~773 kB gzipped); raise limit to 4 MiB
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            {
              urlPattern: /^https:\/\/raw\.githubusercontent\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'github-raw-assets',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.NODE_ENV': JSON.stringify(mode),
      'global': 'window',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'es2020',
      minify: 'esbuild',
      emptyOutDir: true,
      chunkSizeWarningLimit: 3000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'vendor-firebase';
              if (id.includes('@google/genai')) return 'vendor-ai';
              if (id.includes('three') || id.includes('@react-three')) return 'vendor-three';
              if (id.includes('jspdf') || id.includes('pdfjs-dist')) return 'vendor-pdf';
              if (id.includes('recharts')) return 'vendor-charts';
              if (id.includes('tesseract.js')) return 'vendor-ocr';
              if (id.includes('lucide-react')) return 'vendor-icons';
              // Allow Vite to handle the rest automatically
            }
          },
        },
      },
    },
    server: {
      watch: {
        ignored: ['**/android/**'],
      },
    },
    optimizeDeps: {
      exclude: ['@emotion/is-prop-valid'],
    },
  };
});
