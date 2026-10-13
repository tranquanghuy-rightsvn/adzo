// Crawl toàn bộ trang nội bộ tahawa.com.vn (sitemap + link nội bộ) để lấy dữ liệu nội dung.
// HTML thô chỉ được cache tạm (CACHE_DIR) làm nguồn trích xuất, KHÔNG dùng trực tiếp cho site clone.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as cheerio from 'cheerio';

const ORIGIN = 'https://tahawa.com.vn';
const CACHE_DIR = process.env.CACHE_DIR || '/tmp/tahawa-cache';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'docs/research/crawl-index.json');

const SKIP = [/^\/admin/, /^\/api\//, /^\/search/, /^\/captcha/, /^\/ajax/, /^\/cart\/(add|remove|update)/, /\/thumb\//, /\.(jpe?g|png|gif|webp|svg|pdf|zip|mp4)$/i, /^\/logout/, /^\/password/, /^\/user\//, /^\/compare/, /^\/wishlist/];

export function normalize(href, base = ORIGIN + '/') {
  if (!href) return null;
  href = href.trim();
  // link tương đối "trần" (vd: m.me/..., Dang-ky-form) trên site gốc là link hỏng -> bỏ qua
  if (!/^(https?:)?\/\//i.test(href) && !href.startsWith('/')) return null;
  try {
    const u = new URL(href, base);
    if (!/(^|\.)tahawa\.(com\.)?vn$/.test(u.hostname)) return null;
    let p = decodeURI(u.pathname).replace(/\/{2,}/g, '/');
    if (SKIP.some((r) => r.test(p))) return null;
    // tahawa.vn là domain cũ -> cùng nội dung
    if (p !== '/' && !p.endsWith('/') && !p.endsWith('.html') && !/^\/(cart|login|register)$/.test(p)) p += '/';
    const page = u.searchParams.get('page');
    return page && page !== '1' ? `${p}?page=${page}` : p;
  } catch {
    return null;
  }
}

const cacheFile = (p) => path.join(CACHE_DIR, crypto.createHash('md5').update(p).digest('hex') + '.html');

async function fetchPage(p) {
  const f = cacheFile(p);
  try {
    return { html: await fs.readFile(f, 'utf8'), cached: true };
  } catch {}
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(ORIGIN + encodeURI(p), { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh) TahawaCloneCrawler' }, redirect: 'follow' });
      const html = await res.text();
      const finalPath = normalize(res.url) || p;
      if (res.status >= 400) return { html: '', status: res.status };
      await fs.writeFile(f, html);
      return { html, status: res.status, finalPath };
    } catch (e) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return { html: '', status: 0 };
}

async function main() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const sm = await (await fetch(ORIGIN + '/sitemap.xml')).text();
  const seeds = ['/', '/cart', '/login', '/register', '/lien-he.html', '/gioi-thieu.html'];
  for (const m of sm.matchAll(/<loc>(.*?)<\/loc>/g)) seeds.push(normalize(m[1]));
  const queue = [...new Set(seeds.filter(Boolean))];
  const seen = new Set(queue);
  const index = {};
  let i = 0;
  const worker = async () => {
    while (i < queue.length) {
      const p = queue[i++];
      const r = await fetchPage(p);
      if (!r.html) { index[p] = { status: r.status || 'error' }; continue; }
      const $ = cheerio.load(r.html);
      // URL không tồn tại -> site gốc trả về trang chủ: đánh dấu và không mở rộng
      if (p !== '/' && /\bhomepage\b/.test($('body').attr('class') || '')) { index[p] = { status: 'fallback-home' }; continue; }
      index[p] = {
        title: $('title').text().trim(),
        bodyClass: $('body').attr('class') || '',
        file: path.basename(cacheFile(p)),
      };
      $('a[href]').each((_, a) => {
        const n = normalize($(a).attr('href'), ORIGIN + p);
        if (n && !seen.has(n) && seen.size < 4000) { seen.add(n); queue.push(n); }
      });
      if (i % 50 === 0) console.log(`${i}/${queue.length}`);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  // Danh mục bài viết dùng "cuộn vô hạn" (tải /slug-trang-N) -> dò thêm các trang tiếp theo
  const postCats = Object.entries(index).filter(([, v]) => /category_post/.test(v.bodyClass || '')).map(([k]) => k);
  for (const cat of postCats) {
    if (/-trang-\d+\/$/.test(cat)) continue;
    let prevLinks = '';
    for (let n = 2; n < 100; n++) {
      const p = cat.replace(/\/$/, '') + '-trang-' + n + '/';
      if (index[p]) continue;
      const r = await fetchPage(p);
      const $ = r.html ? cheerio.load(r.html) : null;
      if (!$ || /\bhomepage\b/.test($('body').attr('class') || '')) break;
      const links = $('.post-item').filter((_, el) => !$(el).closest('.widget-sidebar').length).map((_, el) => normalize($(el).find('a').attr('href'))).get();
      if (!links.length || links.join() === prevLinks) break;
      prevLinks = links.join();
      const before = queue.length;
      index[p] = { title: $('title').text().trim(), bodyClass: $('body').attr('class') || '', file: path.basename(cacheFile(p)) };
      $('a[href]').each((_, a) => {
        const nn = normalize($(a).attr('href'), ORIGIN + p);
        if (nn && !seen.has(nn)) { seen.add(nn); queue.push(nn); }
      });
      if (queue.length > before) { i = Math.min(i, before); await Promise.all(Array.from({ length: 6 }, worker)); }
    }
  }
  await fs.writeFile(OUT, JSON.stringify(index, null, 1));
  console.log('pages', Object.keys(index).length, '->', OUT);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
