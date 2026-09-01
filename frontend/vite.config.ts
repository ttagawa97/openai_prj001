import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  const apiTarget = env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:3000';

  return {
    server: { host: '127.0.0.1', port: 5173, proxy: { '/api': { target: apiTarget } } },
    preview: { host: '127.0.0.1', port: 4173 },
  };
});
