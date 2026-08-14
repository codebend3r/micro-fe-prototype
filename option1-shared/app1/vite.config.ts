import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import { quietLogger, silenceEmptyChunks } from '../../scripts/vite-quiet';

const headers = { 'Timing-Allow-Origin': '*' };

export default defineConfig({
  base: 'http://localhost:5011/',
  plugins: [
    react(),
    federation({
      name: 'app1',
      // No federated type generation; this repo keeps one tsconfig at the root.
      dts: false,
      filename: 'remoteEntry.js',
      // A plain React component. The Shell imports it like any other module.
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
  server: { port: 5011, strictPort: true, cors: true, headers, origin: 'http://localhost:5011' },
  preview: { port: 5011, strictPort: true, cors: true, headers },
});
