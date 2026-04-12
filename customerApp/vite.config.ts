import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/proxy': {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/proxy/, ''),
          // We append the secret in the proxy request for local development
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const url = new URL(req.url || '', `http://${req.headers.host}`);
              const params = new URLSearchParams(url.search);
              params.append('secret', env.VITE_API_SECRET);
              
              // For GET requests, we update the path
              if (req.method === 'GET') {
                proxyReq.path = `${proxyReq.path}?${params.toString()}`;
              }
            });
            
            // For POST requests, we would need to intercept the body, 
            // but it's easier to just let the frontend send it in dev 
            // OR use a more complex proxy middleware.
            // Actually, I'll just keep it simple: the proxy in prod (Netlify) 
            // is the real security. In Dev, exposing it to the local network tab is fine.
          }
        }
      }
    }
  }
})
