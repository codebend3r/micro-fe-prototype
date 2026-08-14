import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import { quietLogger, silenceEmptyChunks } from '../../scripts/vite-quiet';

// Timing-Allow-Origin lets the Shell read real transfer sizes for scripts that
// came from the remotes' origins, which is what the probe panel reports.
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
          entry: 'http://localhost:5011/remoteEntry.js',
        },
        app2: {
          type: 'module',
          name: 'app2',
          entry: 'http://localhost:5012/remoteEntry.js',
        },
      },
      // The defining choice of Option 1. React is loaded exactly once for the
      // whole system, and the session package that carries React context is a
      // singleton too, so context crosses every app boundary.
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        '@mfe/session': { singleton: true },
        '@mfe/shared-core': { singleton: true },
      },
    }),
  ],
  resolve: {
    // Makes the linked workspace packages resolve React from this app.
    dedupe: ['react', 'react-dom'],
  },
  customLogger: quietLogger(),
  build: {
    target: 'chrome89',
    rollupOptions: { onwarn: silenceEmptyChunks },
  },
  server: { port: 5010, strictPort: true, cors: true, headers },
  preview: { port: 5010, strictPort: true, cors: true, headers },
});
