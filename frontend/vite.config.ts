import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Port 5173 is the origin the backend's CORS allow-list expects.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
})
