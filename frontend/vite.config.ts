import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true, // Allow cloud preview
    allowedHosts: true, // Vite 5+ Security Bypass for Localtunnel
  },
  build: {
    target: 'esnext',
  },
})
