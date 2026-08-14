import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

const headers = { 'Timing-Allow-Origin': '*' };

export default defineConfig({
  base: 'http://localhost:5021/',
  plugins: [
    react(),
    federation({
      name: 'app1',
      // No federated type generation; this repo keeps one tsconfig at the root.
      dts: false,
      filename: 'remoteEntry.js',
      // Not a component. An imperative contract that any framework could
      // implement, and that a React 18 bundle can honour for a React 19 host.
      exposes: {
        './mount': './src/mount.tsx',
      },
      // Nothing shared. This app owns its React 18 outright.
      shared: {},
    }),
  ],
  resolve: { dedupe: ['react', 'react-dom'] },
  build: { target: 'chrome89' },
  server: { port: 5021, strictPort: true, cors: true, headers, origin: 'http://localhost:5021' },
  preview: { port: 5021, strictPort: true, cors: true, headers },
});
