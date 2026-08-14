import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import { quietLogger, silenceEmptyChunks } from '../../scripts/vite-quiet';
import { at, remoteEntry } from '../../scripts/deploy-target';

const headers = { 'Timing-Allow-Origin': '*' };

export default defineConfig({
  base: at.o2shell.base,
  plugins: [
    react(),
    federation({
      name: 'shell',
      // No federated type generation; this repo keeps one tsconfig at the root.
      dts: false,
      remotes: {
        app1: {
          type: 'module',
          name: 'app1',
          entry: remoteEntry('o2app1'),
        },
        app2: {
          type: 'module',
          name: 'app2',
          entry: remoteEntry('o2app2'),
        },
      },
      // The defining choice of Option 2: nothing is shared. Every app carries
      // its own React, so the boundary cannot be a React component and has to
      // be a mount function operating on a plain DOM node.
      shared: {},
    }),
  ],
  // The Shell prints where each remote came from. That address is only known
  // at build time, so it is injected rather than hardcoded.
  define: {
    __REMOTE_APP1__: JSON.stringify(at.o2app1),
    __REMOTE_APP2__: JSON.stringify(at.o2app2),
  },
  resolve: { dedupe: ['react', 'react-dom'] },
  customLogger: quietLogger(),
  build: {
    target: 'chrome89',
    rollupOptions: { onwarn: silenceEmptyChunks },
  },
  server: { port: 5020, strictPort: true, cors: true, headers },
  preview: { port: 5020, strictPort: true, cors: true, headers },
});
