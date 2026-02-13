/* eslint-env node */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const DEV_PORT = env.VITE_DEV_PORT ? Number(env.VITE_DEV_PORT) : 5173;
  // Backend port should match server.js (default 5000, or PORT env var)
  // Extract from VITE_API_URL if available, otherwise default to 5000


  const HMR_PROTOCOL = env.VITE_HMR_PROTOCOL || 'ws';
  const HMR_HOST = env.VITE_HMR_HOST;

  return {
    plugins: [react()],
    server: {
      host: true, // Bind to 0.0.0.0 to allow network access
      port: DEV_PORT,
      strictPort: true,
      hmr: {
        protocol: HMR_PROTOCOL,
        // Only set host if explicitly configured, otherwise let Vite auto-detect
        ...(HMR_HOST && HMR_HOST !== 'localhost' ? { host: HMR_HOST } : {}),
        // port: HMR_PORT,
        // When host is true, client should connect to the same port
        // ...(isNetworkMode ? { clientPort: HMR_PORT } : {}),
      },
      watch: {
        usePolling: false,
      },
      proxy: {
        '/socket.io': {
          target: 'http://localhost:5003',
          changeOrigin: true,
          ws: true,
        },
        '/api': {
          target: 'http://localhost:5003',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
    define: {
      global: 'window',
    },
    optimizeDeps: {
      include: [
        '@tiptap/react',
        '@tiptap/starter-kit',
        '@tiptap/extension-image',
        '@tiptap/extension-text-align',
        '@tiptap/extension-underline',
        '@tiptap/extension-link',
        '@tiptap/extension-placeholder',
      ],
    },
  };
});
