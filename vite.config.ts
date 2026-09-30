import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import dotenv from 'dotenv';
import { handleApiRoute } from './src/server/middleware';

dotenv.config();

function apiServerPlugin(): Plugin {
  return {
    name: 'ai-insight-engine-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const handled = await handleApiRoute(req, res);
        if (!handled) {
          next();
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
