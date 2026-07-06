import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
      // Docker Desktop on Windows doesn't reliably forward native fs events
      // into Linux containers — polling is the standard workaround for HMR.
      usePolling: true,
    },
  },
});
