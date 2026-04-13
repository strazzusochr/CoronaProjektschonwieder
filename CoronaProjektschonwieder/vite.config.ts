import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['host.docker.internal', 'localhost', '127.0.0.1'],
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            },
            {
              name: 'three-core',
              test: /[\\/]node_modules[\\/]three[\\/]/,
            },
            {
              name: 'three-helpers',
              test: /[\\/]node_modules[\\/](three-stdlib|camera-controls|maath|meshline|meshoptimizer|draco3d|stats-gl|troika-three-text|troika-three-utils|troika-worker-utils|webgl-constants|webgl-sdf-generator)[\\/]/,
            },
            {
              name: 'fiber-vendor',
              test: /[\\/]node_modules[\\/]@react-three[\\/]fiber[\\/]/,
            },
            {
              name: 'drei-vendor',
              test: /[\\/]node_modules[\\/]@react-three[\\/]drei[\\/]/,
            },
          ],
        },
      },
    },
  },
});