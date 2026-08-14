import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { at } from '../scripts/deploy-target';

export default defineConfig({
  base: at.compare.base,
  plugins: [react()],
  // The harness frames both complete systems, so it has to be told where they
  // are: two localhost origins on a local run, two paths on a deployed one.
  define: {
    __SHELL_ONE__: JSON.stringify(at.o1shell),
    __SHELL_TWO__: JSON.stringify(at.o2shell),
  },
  resolve: { dedupe: ['react', 'react-dom'] },
  // Deliberately not 5000: on macOS, AirPlay Receiver listens there.
  server: { port: 5100, strictPort: true },
  preview: { port: 5100, strictPort: true },
});
