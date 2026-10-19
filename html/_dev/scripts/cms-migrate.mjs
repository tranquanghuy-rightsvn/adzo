// CHẠY MỘT LẦN: tách bài viết, danh mục bài viết, sản phẩm, danh mục sản phẩm từ data/site.json
// sang thư mục data/ ở gốc repo (nguồn dữ liệu do CMS quản lý, xem GAS.md), rồi gỡ các trang đó
// khỏi site.json để không còn 2 nguồn dữ liệu song song.
// Dùng: node html/_dev/scripts/cms-migrate.mjs [--force]
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const REPO = path.resolve(ROOT, '../..');
const DATA = path.join(REPO, 'data');
const SITE_JSON = path.join(ROOT, 'data/site.json');

if (existsSync(path.join(DATA, 'products.json')) && !process.argv.includes('--force')) {
  console.error('data/ đã có dữ liệu CMS — dừng để không ghi đè. Thêm --force nếu thật sự muốn chạy lại.');
  process.exit(1);
}

const site = JSON.parse(await fs.readFile(SITE_JSON, 'utf8'));
const P = site.pages;
const NOW = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const CMS_TYPES = new Set(['product', 'post', 'category_product', 'category_post']);
const isPaged = (u) => /-trang-\d+\/$/.test(u);
const toPath = (u) => decodeURI(u).replace(/^\/|\/$/g, '');
const unesc = (s) => String(s || '').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const htmlToLines = (h) => String(h || '').split(/<\/p>|<br\s*\/?>/i).map((s) => unesc(s.replace(/<[^>]+>/g, '')).trim()).filter(Boolean);
const parentOf = (bc) => (bc.length > 2 && bc[bc.length - 2].href ? toPath(bc[bc.length - 2].href) : '');

/* ---------- Danh mục (chung cho sản phẩm + bài viết) ---------- */
function categories(type) {
  return Object.entries(P).filter(([u, d]) => d.type === type && !isPaged(u)).map(([u, d], i) => {
    const name = d.breadcrumbs[d.breadcrumbs.length - 1].t;
    const m = d.meta || {};
    const rec = {
      path: toPath(u),
      name,
      h1: d.h1 && d.h1 !== name ? d.h1 : '',
      parent: parentOf(d.breadcrumbs),
      order: i + 1,
      meta_title: m.title && m.title !== name ? m.title : '',
      meta_description: m.description || '',
      meta_keywords: m.keywords || '',
      og_image: m.ogImage || '',
      updated_at: NOW,
    };
    if (type === 'category_product') {
      rec.description = d.description || '';
      rec.has_filter = !!d.hasFilter;
    }
    return rec;
  });
}
const productCats = categories('category_product');
const postCats = categories('category_post');

/* ---------- Sản phẩm: thành viên danh mục lấy từ các trang danh sách (kể cả trang -trang-N) ---------- */
const membership = new Map(); // product path -> Set(category path)
const catPathOfListing = (u) => toPath(isPaged(u) ? u.replace(/-trang-\d+\/$/, '/') : u);
for (const [u, d] of Object.entries(P)) {
  if (d.type !== 'category_product') continue;
  const cat = catPathOfListing(u);
  for (const pr of d.products) {
    const k = toPath(pr.href);
    if (!membership.has(k)) membership.set(k, new Set());
    membership.get(k).add(cat);
  }
}
// Thứ tự toàn cục: theo danh sách /san-pham-cong-nghiep/ (chứa mọi sản phẩm) trang 1 -> N
const order = [];
const pagedNum = (u) => (isPaged(u) ? Number(u.match(/-trang-(\d+)\/$/)[1]) : 1);
Object.entries(P).filter(([u, d]) => d.type === 'category_product' && catPathOfListing(u) === 'san-pham-cong-nghiep')
  .sort((a, b) => pagedNum(a[0]) - pagedNum(b[0]))
  .forEach(([, d]) => d.products.forEach((pr) => order.push(toPath(pr.href))));
const productEntries = Object.entries(P).filter(([, d]) => d.type === 'product');
const rank = new Map(order.map((p, i) => [p, i]));
productEntries.sort((a, b) => (rank.get(toPath(a[0])) ?? 1e9) - (rank.get(toPath(b[0])) ?? 1e9));
const catOrder = new Map(productCats.map((c, i) => [c.path, i]));

const productsIndex = [];
await fs.mkdir(path.join(DATA, 'products'), { recursive: true });
for (const [u, d] of productEntries) {
  const slug = toPath(u);
  const cats = [...(membership.get(slug) || [])].sort((a, b) => catOrder.get(a) - catOrder.get(b));
  const images = d.gallery.map((g) => g.img);
  const detail = {
    id: d.id,
    slug,
    name: d.name,
    price: d.price ? d.priceValue : null,
    old_price: null,
    status: d.status || 'Còn hàng',
    images,
    short_desc: htmlToLines(d.shortDesc).join('\n'),
    content_html: (d.tabs[0] && d.tabs[0].html) || '',
    meta_title: d.meta.title && d.meta.title !== d.name ? d.meta.title : '',
    meta_description: d.meta.description || '',
    meta_keywords: d.meta.keywords || '',
    created_at: NOW,
    updated_at: NOW,
  };
  await fs.writeFile(path.join(DATA, 'products', slug + '.json'), JSON.stringify(detail, null, 1) + '\n');
  productsIndex.push({
    id: detail.id, slug, name: detail.name, price: detail.price, old_price: null,
    img: images[0] || '', categories: cats, status: detail.status, updated_at: NOW,
  });
}

/* ---------- Bài viết ---------- */
const listingDesc = new Map();
for (const d of Object.values(P)) if (d.type === 'category_post') for (const ps of d.posts) listingDesc.set(toPath(ps.href), ps.desc);
const toIso = (dmy) => { const m = String(dmy).match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };
const postsIndex = [];
await fs.mkdir(path.join(DATA, 'posts'), { recursive: true });
for (const [u, d] of Object.entries(P).filter(([, x]) => x.type === 'post')) {
  const slug = toPath(u);
  const hero = d.html.match(/^<div class="post-hero"><img src="([^"]+)"[^>]*><\/div>/);
  const content = d.html
    .replace(/^<div class="post-hero">[\s\S]*?<\/div>/, '')
    .replace(/<div id="toc">[\s\S]*?<\/ul><\/div>/, '');
  const title = d.title;
  const detail = {
    slug,
    title,
    category: parentOf(d.breadcrumbs),
    date: toIso(d.date),
    cover: hero ? hero[1] : (d.meta.ogImage || ''),
    description: htmlToLines(listingDesc.get(slug) || d.meta.description).join(' '),
    content_html: content,
    views: parseInt(d.views, 10) || 0,
    rating: parseInt(d.rating, 10) || 0,
    meta_title: d.meta.title && d.meta.title !== title + ' - Adzo' ? d.meta.title : '',
    meta_keywords: d.meta.keywords || '',
    created_at: NOW,
    updated_at: NOW,
  };
  await fs.writeFile(path.join(DATA, 'posts', slug + '.json'), JSON.stringify(detail, null, 1) + '\n');
  postsIndex.push({
    slug, title, category: detail.category, date: detail.date, cover: detail.cover,
    description: detail.description, views: detail.views, updated_at: NOW,
  });
}
postsIndex.sort((a, b) => b.date.localeCompare(a.date));

/* ---------- Ghi index + gỡ khỏi site.json ---------- */
const w = (f, v) => fs.writeFile(path.join(DATA, f), JSON.stringify(v, null, 1) + '\n');
await w('product-categories.json', productCats);
await w('post-categories.json', postCats);
await w('products.json', productsIndex);
await w('posts.json', postsIndex);

for (const [u, d] of Object.entries(P)) if (CMS_TYPES.has(d.type)) delete P[u];
delete site.sidebar.posts; // build tự lấy 5 bài mới nhất
await fs.writeFile(SITE_JSON, JSON.stringify(site));
console.log(`migrated: ${productsIndex.length} products, ${productCats.length} product categories, ` +
  `${postsIndex.length} posts, ${postCats.length} post categories; site.json còn ${Object.keys(P).length} trang`);
