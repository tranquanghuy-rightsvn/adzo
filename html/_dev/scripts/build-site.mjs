// Sinh toàn bộ site tĩnh: /index.html + /<slug>/index.html cho mọi trang trong data/site.json.
// Layout, template và CSS/JS đều là code tự viết; data/site.json chỉ chứa dữ liệu.
import fs from 'node:fs/promises';
import path from 'node:path';
import { localPath, PATH_OVERRIDES } from './lib/urls.mjs';
import * as T from './lib/templates.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const WEB = path.resolve(ROOT, '..'); // thư mục gốc = web tĩnh
const DIST = WEB;
const read = (p) => fs.readFile(/^(js|css)\//.test(p) ? path.join(WEB, p) : path.join(ROOT, p), 'utf8');
const site = JSON.parse(await read('data/site.json'));
const readJsVar = (src) => JSON.parse(src.slice(src.indexOf('=') + 1).trim().replace(/;\s*$/, ''));

/* ---------- Menu (đổi link sang /slug/) ---------- */
const MENU = readJsVar(await read('js/menu-data.js'));
const mapMenu = (items) => items.map((m) => ({ ...m, href: localPath(m.href), sub: mapMenu(m.sub || []) }));
MENU.menu = mapMenu(MENU.menu);
MENU.cats = mapMenu(MENU.cats);

/* ---------- Dữ liệu trang chủ: link + ảnh tuyệt đối ---------- */
const HOME = readJsVar(await read('js/data.js'));
const fixHome = (v, key) => {
  if (typeof v === 'string') {
    if (/^assets\//.test(v)) return '/' + v;
    if (/^(href|bhref)$/.test(key)) return localPath(v);
    if (key === 'desc') return v.replace(/href="([^"]+)"/g, (m, h) => `href="${localPath(h)}"`);
    return v;
  }
  if (Array.isArray(v)) return v.map((x) => fixHome(x, key));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fixHome(x, k)]));
  return v;
};
const homeData = fixHome(HOME);
await fs.writeFile(path.join(WEB, 'js/data.js'), '/* Dữ liệu trang chủ (sản phẩm, bài viết, banner...) */\nwindow.TAHAWA_DATA = ' + JSON.stringify(homeData, null, 1) + ';\n');

/* ---------- Partials ---------- */
const P = {
  header: await read('src/partials/header.html'),
  hero: await read('src/partials/hero.html'),
  footer: await read('src/partials/footer.html'),
  floats: await read('src/partials/floats.html'),
  homeMain: await read('src/home-main.html'),
};

const ctx = { site, MENU, P, pages: site.pages };
const outputs = [];

function write(urlPath, html) {
  outputs.push([urlPath, html]);
}

/* ---------- Trang chủ ---------- */
write('/', T.layout(ctx, {
  path: '/', bodyClass: 'homepage', isHome: true,
  meta: { title: 'Adzco - Thiết Bị Công Nghiệp Nhật Bản Chính Hãng', description: 'Adzco - Thiết Bị Công Nghiệp Nhật Bản Chính Hãng' },
  main: P.homeMain, scripts: ['/js/data.js', '/js/home.js'],
}));

/* ---------- Các trang ---------- */
for (const [p, d] of Object.entries(site.pages)) {
  const html = T.renderPage(ctx, p, d);
  if (html) write(p, html);
}

/* ---------- Trang tìm kiếm + chỉ mục sản phẩm cho tìm kiếm ---------- */
const searchIndex = [];
const seen = new Set();
for (const [p, d] of Object.entries(site.pages)) {
  if (d.type !== 'product' || seen.has(p)) continue;
  seen.add(p);
  searchIndex.push({
    name: d.name, href: p, img: (d.gallery[0] && d.gallery[0].img) || null,
    price: d.price, old: d.old, disc: d.disc, btn: d.orderButtons.some((b) => /lienhe/.test(b.cls)) ? 'contact' : 'cart',
  });
}
await fs.writeFile(path.join(WEB, 'js/search-index.js'), 'window.TAHAWA_SEARCH = ' + JSON.stringify(searchIndex) + ';\n');
write('/tim-kiem/', T.searchPage(ctx));
write('/checkout/', T.checkoutPage());

/* ---------- 404: chuyển hướng URL cũ (.html, thiếu "/") về /slug/ bằng JS ---------- */
write('/404.html', T.notFoundPage(ctx, PATH_OVERRIDES));

/* ---------- Ghi file vào dist/ ---------- */
await fs.mkdir(DIST, { recursive: true });
let count = 0;
for (const [urlPath, html] of outputs) {
  const file = urlPath.endsWith('.html') ? path.join(DIST, urlPath) : path.join(DIST, decodeURI(urlPath), 'index.html');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, html);
  count++;
}
// Danh sách trang đã sinh (dùng cho sitemap + kiểm tra link)
const urls = outputs.map(([u]) => u).filter((u) => !u.endsWith('.html'));
await fs.writeFile(path.join(DIST, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') + '\n</urlset>\n');
console.log('built', count, 'files');

/* ---------- SEO: canonical, meta, JSON-LD, robots.txt, sitemap.xml ---------- */
await (await import('./seo.mjs')).run();
