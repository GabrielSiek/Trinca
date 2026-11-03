import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface Ctx {
  params: Record<string, string>;
  query: URLSearchParams;
  body: any;
}

type Handler = (ctx: Ctx) => unknown | Promise<unknown>;

interface Route {
  method: string;
  regex: RegExp;
  keys: string[];
  handler: Handler;
}

const MAX_BODY = 1024 * 1024;

export class Router {
  routes: Route[] = [];

  add(method: string, pattern: string, handler: Handler) {
    const keys: string[] = [];
    const source = pattern.replace(/:(\w+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    });
    this.routes.push({ method, regex: new RegExp(`^${source}$`), keys, handler });
  }

  get(pattern: string, handler: Handler) { this.add('GET', pattern, handler); }
  post(pattern: string, handler: Handler) { this.add('POST', pattern, handler); }
  put(pattern: string, handler: Handler) { this.add('PUT', pattern, handler); }
  patch(pattern: string, handler: Handler) { this.add('PATCH', pattern, handler); }
  delete(pattern: string, handler: Handler) { this.add('DELETE', pattern, handler); }

  async handle(req: IncomingMessage, res: ServerResponse, url: URL) {
    try {
      const route = this.routes.find((r) => r.method === req.method && r.regex.test(url.pathname));
      if (!route) throw new HttpError(404, 'Rota não encontrada');
      const match = route.regex.exec(url.pathname)!;
      const params: Record<string, string> = {};
      route.keys.forEach((key, i) => { params[key] = decodeURIComponent(match[i + 1]); });
      const body = req.method === 'GET' ? undefined : await readJson(req);
      sendJson(res, 200, (await route.handler({ params, query: url.searchParams, body })) ?? { ok: true });
    } catch (err) {
      if (err instanceof HttpError) return sendJson(res, err.status, { error: err.message });
      console.error(err);
      sendJson(res, 500, { error: 'Erro interno do servidor' });
    }
  }
}

async function readJson(req: IncomingMessage) {
  // There is no login on this LAN app. Requiring JSON forces a CORS preflight, which
  // this server never approves, so random websites cannot post to it from a browser.
  if (!req.headers['content-type']?.startsWith('application/json')) {
    throw new HttpError(415, 'Envie application/json');
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, 'Corpo da requisição muito grande');
    chunks.push(chunk);
  }
  if (!size) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'JSON inválido');
  }
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

/** Serves the built client, falling back to index.html for client-side routes. */
export function serveStatic(root: string, pathname: string, res: ServerResponse) {
  const index = path.join(root, 'index.html');
  if (!fs.existsSync(index)) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Cliente não compilado. Rode "yarn build" primeiro.');
  }
  let file = path.normalize(path.join(root, decodeURIComponent(pathname)));
  const insideRoot = file === root || file.startsWith(root + path.sep);
  if (!insideRoot || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = index;
  const hashed = file.includes(`${path.sep}assets${path.sep}`);
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
    'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
}

export function badRequest(message: string): never {
  throw new HttpError(400, message);
}

export function requireDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) badRequest('Data inválida');
  return value;
}

export function requireId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) badRequest('Identificador inválido');
  return id;
}

export function requireNumber(value: unknown, field: string, min = 0, max = 100000): number {
  const n = Number(value);
  if (value === null || value === '' || !Number.isFinite(n) || n < min || n > max) badRequest(`Valor inválido: ${field}`);
  return n;
}

export function optionalNumber(value: unknown, field: string, max = 1000): number | null {
  return value === null || value === undefined || value === '' ? null : requireNumber(value, field, 0, max);
}

export function requireText(value: unknown, field: string, max = 200): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > max) badRequest(`Texto inválido: ${field}`);
  return text;
}
