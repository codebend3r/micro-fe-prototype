import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import { quietLogger, silenceEmptyChunks } from '../../scripts/vite-quiet';
import { at } from '../../scripts/deploy-target';

const headers = { 'Timing-Allow-Origin': '*' };

export default defineConfig({
  // An origin locally, a path prefix when deployed. Either way it is absolute,
  // because the Shell resolves these chunks from a page it serves itself.
  base: at.o1app2.base,
  plugins: [
    react(),
    federation({
      name: 'app2',
      // No federated type generation; this repo keeps one tsconfig at the root.
      dts: false,
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        '@mfe/session': { singleton: true },
        '@mfe/shared-core': { singleton: true },
      },
    }),
  ],
  resolve: { dedupe: ['react', 'react-dom'] },
  customLogger: quietLogger(),
  build: {
    target: 'chrome89',
    rollupOptions: { onwarn: silenceEmptyChunks },
  },
  server: { port: 5012, strictPort: true, cors: true, headers, origin: 'http://localhost:5012' },
  preview: { port: 5012, strictPort: true, cors: true, headers },
});
