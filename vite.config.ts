import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173
    }
  },
  define: {
    // Define globals for browser compatibility with Node.js modules
    global: 'globalThis',
    'process.env.NODE_ENV': '"production"',
    'process.platform': '"browser"',
    'process.version': '"v16.0.0"',
  },
  optimizeDeps: {
    include: ['antlr4ts'],
    esbuildOptions: {
      // Define global for esbuild
      define: {
        global: 'globalThis',
      },
    },
  },
  // Override externalized modules with our polyfills
  resolve: {
    alias: {
      'util': new URL('./src/polyfills/util.ts', import.meta.url).pathname,
      'assert': new URL('./src/polyfills/assert.ts', import.meta.url).pathname
    }
  }
})