import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

const headers = { 'Timing-Allow-Origin': '*' };

export default defineConfig({
  base: 'http://localhost:5022/',
  plugins: [
    react(),
    federation({
      name: 'app2',
      // No federated type generation; this repo keeps one tsconfig at the root.
      dts: false,
      filename: 'remoteEntry.js',
      exposes: {
        './mount': './src/mount.tsx',
      },
      // Nothing shared. This app is on React 19 while app1 is still on 18.
      shared: {},
    }),
  ],
  resolve: { dedupe: ['react', 'react-dom'] },
  build: { target: 'chrome89' },
  server: { port: 5022, strictPort: true, cors: true, headers, origin: 'http://localhost:5022' },
  preview: { port: 5022, strictPort: true, cors: true, headers },
});
