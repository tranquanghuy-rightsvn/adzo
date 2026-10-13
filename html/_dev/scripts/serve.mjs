// Server tĩnh cho dist/ (giống host tĩnh: /slug/ -> /slug/index.html, file không tồn tại -> 404.html).
// Không có rewrite/redirect phía server: việc chuyển /slug/index.html và URL .html cũ do JS trong trang xử lý.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const PORT = Number(process.env.PORT || 8765);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.xml': 'application/xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon' };

http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { p = '/'; }
  let file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (p.endsWith('/')) file = path.join(file, 'index.html');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      return fs.createReadStream(path.join(ROOT, '404.html')).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
