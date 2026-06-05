import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleConfigRequest } from './server/config.js';
import { handleIpInfoRequest, writeJsonResponse } from './server/ipinfo.js';
import { handleNumverifyRequest } from './server/numverify.js';
import { handleTestTrafficRecordRequest } from './server/trafficRecords.js';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: 'secure-ipinfo-api',
      configureServer(server) {
        const serverEnv = { ...process.env, ...loadEnv(mode, process.cwd(), '') };
        server.middlewares.use('/api/ipinfo', async (req, res) => {
          const result = await handleIpInfoRequest({
            url: `/api/ipinfo${req.url === '/' ? '' : req.url}`,
            env: serverEnv
          });
          await writeJsonResponse(res, result);
        });
        server.middlewares.use('/api/numverify', async (req, res) => {
          const result = await handleNumverifyRequest({
            url: `/api/numverify${req.url === '/' ? '' : req.url}`,
            env: serverEnv
          });
          await writeJsonResponse(res, result);
        });
        server.middlewares.use('/api/config', async (_req, res) => {
          const result = await handleConfigRequest({
            env: { ...process.env, ...loadEnv(mode, process.cwd(), '') }
          });
          await writeJsonResponse(res, result);
        });
        server.middlewares.use('/api/test-traffic-record', async (req, res) => {
          const result = await handleTestTrafficRecordRequest({
            method: req.method,
            req,
            env: serverEnv
          });
          await writeJsonResponse(res, result);
        });
      }
    }
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true
  }
}));
