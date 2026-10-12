import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { projectDirectory } from './build-site.mjs';

const root = path.join(projectDirectory, 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };
http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let filename = path.resolve(root, '.' + pathname);
    if (!filename.startsWith(root + path.sep) && filename !== root) { response.writeHead(403); response.end(); return; }
    try { if ((await fs.stat(filename)).isDirectory()) filename = path.join(filename, 'index.html'); }
    catch { response.writeHead(404); response.end(await fs.readFile(path.join(root, '404.html'))); return; }
    const body = await fs.readFile(filename);
    response.writeHead(200, { 'Content-Type': pathname === '/rss.xml' ? 'application/rss+xml; charset=utf-8' : types[path.extname(filename)] ?? 'application/octet-stream' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(500); response.end('Preview error'); }
}).listen(4319, '127.0.0.1', () => console.log('Local preview: http://127.0.0.1:4319'));
