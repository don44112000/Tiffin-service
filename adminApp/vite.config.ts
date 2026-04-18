import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'http'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const GOOGLE_URL = env.API_BASE_URL;
  const SECRET = env.API_SECRET;

  return {
    plugins: [
      react(),
      {
        name: 'local-auth',
        configureServer(server) {
          // Mirror netlify/functions/auth.ts
          server.middlewares.use('/api/auth', (req: IncomingMessage, res: ServerResponse) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end('Method Not Allowed');
              return;
            }
            let body = '';
            req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
            req.on('end', () => {
              try {
                const { password } = JSON.parse(body);
                const success = password === env.ADMIN_PASSWORD;
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = success ? 200 : 401;
                res.end(JSON.stringify({ success }));
              } catch {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false }));
              }
            });
          });

          // Mirror netlify/functions/proxy.ts
          server.middlewares.use('/api/proxy', (req: IncomingMessage, res: ServerResponse) => {
            if (!GOOGLE_URL || !SECRET) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, message: 'Backend configuration missing' }));
              return;
            }

            const respond = (data: unknown) => {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(data));
            };

            const fail = (msg: string) => {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, message: msg }));
            };

            if (req.method === 'GET') {
              const qs = req.url?.split('?')[1] ?? '';
              const params = new URLSearchParams(qs);
              params.append('secret', SECRET);
              fetch(`${GOOGLE_URL}?${params.toString()}`)
                .then(r => r.json())
                .then(respond)
                .catch(() => fail('Internal Server Error'));

            } else if (req.method === 'POST') {
              let body = '';
              req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
              req.on('end', () => {
                let parsed: Record<string, unknown> = {};
                try { parsed = JSON.parse(body); } catch { /* ignore */ }
                fetch(GOOGLE_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify({ ...parsed, secret: SECRET }),
                })
                  .then(r => r.json())
                  .then(respond)
                  .catch(() => fail('Internal Server Error'));
              });

            } else {
              res.statusCode = 405;
              res.end('Method Not Allowed');
            }
          });
        },
      },
    ],
  }
})

