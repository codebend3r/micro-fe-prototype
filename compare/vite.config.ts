import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  // Deliberately not 5000: on macOS, AirPlay Receiver listens there.
  server: { port: 5100, strictPort: true },
  preview: { port: 5100, strictPort: true },
});
