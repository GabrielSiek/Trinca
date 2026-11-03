import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { db } from './db.ts';
import { Router, serveStatic } from './http.ts';
import { dayRoutes } from './routes/days.ts';
import { foodRoutes } from './routes/foods.ts';
import { planRoutes } from './routes/plan.ts';
import { progressRoutes } from './routes/progress.ts';
import { trainingRoutes } from './routes/training.ts';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';
const CLIENT_DIST = path.resolve(import.meta.dirname, '../../client/dist');

const router = new Router();
planRoutes(router);
dayRoutes(router);
foodRoutes(router);
trainingRoutes(router);
progressRoutes(router);

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname.startsWith('/api/')) return void router.handle(req, res, url);
    serveStatic(CLIENT_DIST, url.pathname, res);
  } catch {
    // A malformed URL must not take down a server that runs unattended.
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Requisição inválida');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Cutting rodando em http://localhost:${PORT}`);
  const addresses = Object.values(os.networkInterfaces()).flat().filter((a) => a?.family === 'IPv4' && !a.internal);
  for (const address of addresses) console.log(`  na rede: http://${address!.address}:${PORT}`);
});

// Closing flushes SQLite's write-ahead log, so a stopped server leaves one complete file to back up.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    db.close();
    process.exit(0);
  });
}
