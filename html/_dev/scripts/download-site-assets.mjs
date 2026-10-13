// Tải mọi ảnh được tham chiếu trong data/site.json về /assets/img (bỏ qua file đã có).
import fs from 'node:fs/promises';
import path from 'node:path';
import { assetPath } from './lib/urls.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const WEB = path.resolve(ROOT, '..');
const site = JSON.parse(await fs.readFile(path.join(ROOT, 'data/site.json'), 'utf8'));
const list = site.assets;
let ok = 0, skip = 0, fail = 0, bytes = 0, i = 0;
const failed = [];
async function worker() {
  while (i < list.length) {
    const url = list[i++];
    const dest = path.join(WEB, assetPath(url).replace(/^\//, ''));
    try { await fs.access(dest); skip++; continue; } catch {}
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://tahawa.com.vn/' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, buf);
      ok++; bytes += buf.length;
    } catch (e) { fail++; failed.push(url + ' ' + e.message); }
    if ((ok + skip + fail) % 200 === 0) console.log(`${ok + skip + fail}/${list.length} (${(bytes / 1e6).toFixed(1)}MB)`);
  }
}
await Promise.all(Array.from({ length: 10 }, worker));
await fs.writeFile(path.join(ROOT, 'data/asset-failures.txt'), failed.join('\n'));
console.log(`done: downloaded ${ok}, existed ${skip}, failed ${fail}, ${(bytes / 1e6).toFixed(1)}MB`);
