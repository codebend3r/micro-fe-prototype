import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import { quietLogger, silenceEmptyChunks } from '../../scripts/vite-quiet';

const headers = { 'Timing-Allow-Origin': '*' };

export default defineConfig({
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
          entry: 'http://localhost:5021/remoteEntry.js',
        },
        app2: {
          type: 'module',
          name: 'app2',
          entry: 'http://localhost:5022/remoteEntry.js',
        },
      },
      // The defining choice of Option 2: nothing is shared. Every app carries
      // its own React, so the boundary cannot be a React component and has to
      // be a mount function operating on a plain DOM node.
      shared: {},
    }),
  ],
  resolve: { dedupe: ['react', 'react-dom'] },
  customLogger: quietLogger(),
  build: {
    target: 'chrome89',
    rollupOptions: { onwarn: silenceEmptyChunks },
  },
  server: { port: 5020, strictPort: true, cors: true, headers },
  preview: { port: 5020, strictPort: true, cors: true, headers },
});
