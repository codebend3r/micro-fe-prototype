import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import { quietLogger, silenceEmptyChunks } from '../scripts/vite-quiet';
import { at } from '../scripts/deploy-target';

const headers = { 'Timing-Allow-Origin': '*' };

export default defineConfig({
  // An origin locally, a path prefix when deployed. Either way it is absolute,
  // because world resolves these chunks from a page it serves itself.
  base: at.morty.base,
  plugins: [
    react(),
    federation({
      name: 'morty',
      // No federated type generation; this repo keeps one tsconfig at the root.
      dts: false,
      filename: 'remoteEntry.js',
      // Not a component. An imperative contract that any framework could
      // implement.
      exposes: {
        './mount': './src/mount.tsx',
      },
      // Nothing shared. This app owns its React 19 and its wouter outright.
      shared: {},
    }),
  ],
  resolve: { dedupe: ['react', 'react-dom', 'wouter'] },
  customLogger: quietLogger(),
  build: {
    target: 'chrome89',
    rollupOptions: { onwarn: silenceEmptyChunks },
  },
  server: { port: 5102, strictPort: true, cors: true, headers, origin: 'http://localhost:5102' },
  preview: { port: 5102, strictPort: true, cors: true, headers },
});
