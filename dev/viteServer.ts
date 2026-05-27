import fs from 'fs';
import path from 'path';
import type { ServerOptions } from 'vite';

const certDir = path.resolve(__dirname, '../certs');
const keyPath = path.join(certDir, 'dev-key.pem');
const certPath = path.join(certDir, 'dev-cert.pem');

function devHttps(): ServerOptions['https'] | undefined {
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) return undefined;
  return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
}

const backend = process.env.VITE_DEV_BACKEND ?? 'http://127.0.0.1:3001';

export function viteDevServer(port: number): ServerOptions {
  return {
    port,
    host: true,
    https: devHttps(),
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/socket.io': { target: backend, ws: true, changeOrigin: true },
      '/uploads': { target: backend, changeOrigin: true },
    },
  };
}
