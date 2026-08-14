import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import { quietLogger, silenceEmptyChunks } from '../../scripts/vite-quiet';
import { at } from '../../scripts/deploy-target';

const headers = { 'Timing-Allow-Origin': '*' };

export default defineConfig({
  // An origin locally, a path prefix when deployed. Either way it is absolute,
  // because the Shell resolves these chunks from a page it serves itself.
  base: at.o2app2.base,
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
  customLogger: quietLogger(),
  build: {
    target: 'chrome89',
    rollupOptions: { onwarn: silenceEmptyChunks },
  },
  server: { port: 5022, strictPort: true, cors: true, headers, origin: 'http://localhost:5022' },
  preview: { port: 5022, strictPort: true, cors: true, headers },
});
