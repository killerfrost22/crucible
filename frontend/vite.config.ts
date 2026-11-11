import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { replaysPlugin } from './replaysPlugin.ts'

// Port 5173 is the origin the backend's CORS allow-list expects.
export default defineConfig(({ command, mode }) => {
  // A build without the API URL would ship `http://localhost:8000` (src/lib/api.ts) and point every visitor's live
  // meetings at their own machine. Dev keeps that default.
  if (command === 'build' && !loadEnv(mode, import.meta.dirname, 'VITE_').VITE_API_BASE) {
    throw new Error('VITE_API_BASE is not set. Set it to the backend URL (see frontend/.env.example) before building.')
  }
  return {
    plugins: [react(), replaysPlugin()],
    server: { port: 5173, strictPort: true },
  }
})
