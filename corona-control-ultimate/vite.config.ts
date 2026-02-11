import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 3000,
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('three')) return 'three-vendor';
            if (id.includes('react')) return 'react-vendor';
            return 'vendor';
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei', 'zustand', '@dimforge/rapier-3d-compat'],
  },
})
