import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import { quietLogger, silenceEmptyChunks } from '../scripts/vite-quiet';
import { at, remoteEntry } from '../scripts/deploy-target';

// Timing-Allow-Origin lets world read real transfer sizes for scripts that
// came from the remotes' origins, which is what the probe panel reports.
const headers = { 'Timing-Allow-Origin': '*' };

export default defineConfig({
  base: at.world.base,
  plugins: [
    react(),
    federation({
      name: 'world',
      // No federated type generation; this repo keeps one tsconfig at the root.
      dts: false,
      remotes: {
        rick: { type: 'module', name: 'rick', entry: remoteEntry('rick') },
        morty: { type: 'module', name: 'morty', entry: remoteEntry('morty') },
      },
      // Nothing is shared. Every app carries its own React 19 and its own
      // wouter, so the boundary cannot be a React component and has to be a
      // mount function operating on a plain DOM node.
      shared: {},
    }),
  ],
  // World prints where each remote came from. That address is only known at
  // build time, so it is injected rather than hardcoded.
  define: {
    __REMOTE_RICK__: JSON.stringify(at.rick),
    __REMOTE_MORTY__: JSON.stringify(at.morty),
  },
  resolve: { dedupe: ['react', 'react-dom', 'wouter'] },
  customLogger: quietLogger(),
  build: {
    target: 'chrome89',
    rollupOptions: { onwarn: silenceEmptyChunks },
  },
  // World routes on the path, so unknown paths must fall back to index.html.
  // That is Vite's default for dev and preview (`appType: 'spa'`).
  server: { port: 5100, strictPort: true, cors: true, headers },
  preview: { port: 5100, strictPort: true, cors: true, headers },
});
