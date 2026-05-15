import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [
    react(),
  ],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host ? {
      protocol: "ws",
      host,
      port: 5174,
    } : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        overlay: resolve(__dirname, 'overlay.html'),
        'settings-window': resolve(__dirname, 'settings-window.html'),
        'mods-browser-window': resolve(__dirname, 'mods-browser-window.html'),
        'launch-log-window': resolve(__dirname, 'launch-log-window.html'),
        'map-preview-window': resolve(__dirname, 'map-preview-window.html'),
      },
    },
  },
})
