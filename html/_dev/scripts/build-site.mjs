// Sinh toàn bộ site tĩnh: /index.html + /<slug>/index.html cho mọi trang trong data/site.json
// (trang tĩnh, liên hệ...) + data/ ở gốc repo (sản phẩm, bài viết, danh mục - do CMS quản lý,
// xem GAS.md). Layout, template và CSS/JS đều là code tự viết; file JSON chỉ chứa dữ liệu.
// CI chạy lại script này sau mỗi lần Lưu/Xoá trong CMS (.github/workflows/build.yml) nên kết quả
// PHẢI tất định: không có dữ liệu nào thay đổi thì build lại không được sinh diff.
import fs from 'node:fs/promises';
import path from 'node:path';
import { localPath, PATH_OVERRIDES } from './lib/urls.mjs';
import * as T from './lib/templates.mjs';
import { loadCms, buildCmsPages } from './lib/cms.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const WEB = path.resolve(ROOT, '..'); // thư mục gốc = web tĩnh
const DIST = WEB;
const read = (p) => fs.readFile(/^(js|css)\//.test(p) ? path.join(WEB, p) : path.join(ROOT, p), 'utf8');
const site = JSON.parse(await read('data/site.json'));
const REPO = path.resolve(WEB, '..');

/* ---------- Dữ liệu CMS (data/) gộp vào site.pages ---------- */
const cms = buildCmsPages(await loadCms(REPO));
for (const p of Object.keys(cms.pages)) {
  if (site.pages[p]) console.warn('CẢNH BÁO: trang CMS trùng URL với site.json, bỏ trang CMS:', p);
  else site.pages[p] = cms.pages[p];
}
site.sidebar.posts = cms.latestPosts.slice(0, 5);
const freshCard = (it) => cms.productCards.get(it.href) || null;
site.sidebar.featured = site.sidebar.featured.map(freshCard).filter(Boolean);
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
// Khối tin tức trang chủ = bài mới nhất; thẻ sản phẩm trang chủ lấy lại tên/giá/ảnh hiện tại,
// sản phẩm đã xoá qua CMS tự rơi khỏi khối (danh sách sản phẩm nào hiện ở đâu vẫn sửa tay).
homeData.news = cms.latestPosts.slice(0, 15);
for (const sec of Object.values(homeData.products || {})) sec.items = sec.items.map(freshCard).filter(Boolean);
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
const searchIndex = cms.searchIndex;
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
// Dọn trang mồ côi: trang do build này sinh ra lần trước (mang dấu REDIRECT_SNIPPET của layout)
// nhưng lần này không còn (vd sản phẩm/bài/danh mục vừa xoá qua CMS) -> xoá, kẻo vẫn truy cập
// được và Google tiếp tục index. Trang tay không có dấu này (admin/...) không bị đụng.
const outFiles = new Set(outputs.map(([u]) => (u.endsWith('.html') ? path.join(DIST, u) : path.join(DIST, decodeURI(u), 'index.html'))));
const SKIP_DIRS = new Set(['_dev', 'assets', 'css', 'js', 'vendor', 'admin', 'node_modules']);
let removed = 0;
async function sweep(dir, top) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || (top && SKIP_DIRS.has(e.name))) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      await sweep(p, false);
      if (!(await fs.readdir(p)).length) await fs.rmdir(p);
    } else if (e.name === 'index.html' && !outFiles.has(p) && T.isGenerated(await fs.readFile(p, 'utf8'))) {
      await fs.unlink(p);
      removed++;
    }
  }
}
await sweep(DIST, true);
if (removed) console.log('removed', removed, 'orphan pages');

// Đường dẫn ở gốc site KHÔNG thuộc CMS (trang tĩnh, thư mục hệ thống...) - CMS đọc file này để
// chặn đặt URL sản phẩm/bài viết/danh mục trùng (GAS.md mục IV).
const cmsPaths = new Set(Object.keys(cms.pages).map((u) => decodeURI(u).replace(/^\/|\/$/g, '')));
const reserved = new Set(['admin', 'assets', 'css', 'js', 'vendor', '_dev', 'images', 'data']);
for (const e of await fs.readdir(DIST, { withFileTypes: true })) if (e.isDirectory() && !e.name.startsWith('.')) reserved.add(e.name);
for (const [u] of outputs) if (!u.endsWith('.html') && u !== '/') reserved.add(decodeURI(u).replace(/^\/|\/$/g, ''));
for (const p of cmsPaths) reserved.delete(p);
for (const p of cmsPaths) reserved.delete(p.split('/')[0]);
await fs.writeFile(path.join(REPO, 'data/reserved-paths.json'), JSON.stringify([...reserved].sort(), null, 1) + '\n');

// Danh sách trang đã sinh (dùng cho sitemap + kiểm tra link)
const urls = outputs.map(([u]) => u).filter((u) => !u.endsWith('.html'));
await fs.writeFile(path.join(DIST, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') + '\n</urlset>\n');
console.log('built', count, 'files');

/* ---------- SEO: canonical, meta, JSON-LD, robots.txt, sitemap.xml ---------- */
await (await import('./seo.mjs')).run();
