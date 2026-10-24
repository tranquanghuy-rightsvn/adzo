// Dữ liệu do CMS quản lý (data/ ở gốc repo, xem GAS.md) -> dữ liệu trang đúng định dạng mà
// templates.mjs đang dùng (product, category_product, post, category_post).
// CMS chỉ ghi data/; mọi thứ suy ra được (giá hiển thị, phân trang, liên quan, mục lục...) tính ở đây.
import fs from 'node:fs/promises';
import { smartContent } from './smart.mjs';
import path from 'node:path';

export const PRODUCTS_PER_PAGE = 60;
export const POSTS_PER_PAGE = 9;
const SITE_URL = 'https://www.adzo.vn';

// /tin-tuc/ là trang TỔNG của mọi bài viết (không phải danh mục, không quản lý qua CMS - GAS.md
// mục II-B). Danh mục bài viết nằm bên dưới: /tin-tuc/<slug>/.
export const BLOG = {
  path: 'tin-tuc',
  name: 'TIN TỨC',
  h1: 'Tin tức về Adzo',
  pagedTitle: 'Tin Tức Adzo',
  meta: {
    title: 'Tin Tức Adzo - Kinh Nghiệm, Hướng Dẫn Chọn Mua Thiết Bị Công Nghiệp & Dân Dụng',
    description: 'Cập nhật tin tức, kinh nghiệm chọn mua bồn nước, máy bơm, máy nước nóng mặt trời và các thiết bị công nghiệp, dân dụng chính hãng từ Adzo.',
    keywords: 'Tin tức Adzo, Tin tuc Adzo',
    ogImage: '/assets/img/media/logo-adzo.png',
  },
};

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const unesc = (s) => String(s).replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const text = (h) => unesc(String(h || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const url = (p) => '/' + p + '/';
const pagedUrl = (p, n) => (n === 1 ? url(p) : '/' + p + '-trang-' + n + '/');
const dmy = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || ''); };
const lines = (s) => String(s || '').split(/\n+/).map((l) => l.trim()).filter(Boolean);

export function formatPrice(n) {
  if (n == null || n === '' || !Number(n)) return '';
  return String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'VND';
}
export function discount(price, old) {
  if (!Number(price) || !Number(old) || Number(old) <= Number(price)) return null;
  return '-' + Math.round((1 - Number(price) / Number(old)) * 100) + '%';
}

/** Mục lục + id cho H2/H3 - đúng cấu trúc HTML của các bài viết có sẵn trước khi có CMS. */
function slugify(s) {
  return text(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}
function withToc(slug, title, html) {
  const items = [];
  const used = new Set();
  const body = html.replace(/<(h[23])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (m, tag, attrs, inner) => {
    let id = slugify(inner) || 'muc';
    for (let i = 2; used.has(id); i++) id = slugify(inner) + '-' + i;
    used.add(id);
    items.push({ level: tag.toLowerCase(), id, label: text(inner) });
    const rest = String(attrs || '').replace(/\s+id="[^"]*"/i, '');
    return `<${tag}${rest} id="${id}">${inner}</${tag}>`;
  });
  if (!items.length) return body;
  let sub = '';
  for (const it of items) sub += `<li${it.level === 'h3' ? ' class="toc-h3"' : ''}><a href="#${it.id}">${esc(it.label)}</a></li>`;
  const toc = '<div id="toc"><div id="toc-title"><strong>Mục lục</strong> <span>[<a href="javascript:void(0)" class="toggleTocList">Ẩn</a>]</span></div>' +
    `<ul id="toc-list"><li><a href="#${slug}">${esc(title)}</a></li><ul>${sub}</ul></ul></div>`;
  return toc + body;
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return fallback; throw e; }
}

export async function loadCms(repoRoot) {
  const D = path.join(repoRoot, 'data');
  const products = await readJson(path.join(D, 'products.json'), []);
  const posts = await readJson(path.join(D, 'posts.json'), []);
  const productCats = await readJson(path.join(D, 'product-categories.json'), []);
  const postCats = await readJson(path.join(D, 'post-categories.json'), []);
  const productDetails = new Map();
  for (const p of products) productDetails.set(p.slug, await readJson(path.join(D, 'products', p.slug + '.json'), null));
  const postDetails = new Map();
  for (const p of posts) postDetails.set(p.slug, await readJson(path.join(D, 'posts', p.slug + '.json'), null));
  return { products, posts, productCats, postCats, productDetails, postDetails };
}

/**
 * Thư viện ảnh cho CMS (nút "Thư viện ảnh" trong trình soạn thảo, GAS.md mục II.6): mọi ảnh
 * /assets/... đang dùng ở bài viết + sản phẩm, kèm chữ để tìm (caption/alt + tên bài/sản phẩm).
 * Dòng = [src, caption, nơi dùng]; 1 ảnh dùng nhiều nơi gộp làm 1 dòng. Bài viết (mới nhất) trước.
 */
export function mediaIndex(cms) {
  const by = new Map();
  const add = (src, caption, owner) => {
    src = String(src || '').trim();
    if (!/^\/assets\/[^"'<>\s]+\.(jpe?g|png|gif|webp|svg)$/i.test(src)) return;
    let it = by.get(src);
    if (!it) by.set(src, (it = { caption: '', owners: [] }));
    if (!it.caption && caption) it.caption = caption;
    if (owner && !it.owners.includes(owner)) it.owners.push(owner);
  };
  const attr = (tag, name) => { const m = new RegExp('\\s' + name + '="([^"]*)"', 'i').exec(tag); return m ? text(m[1]) : ''; };
  const fromHtml = (html, owner) => {
    html = String(html || '');
    const rest = html.replace(/<figure\b[^>]*>([\s\S]*?)<\/figure>/gi, (m, inner) => {
      const cap = /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i.exec(inner);
      for (const img of inner.match(/<img\b[^>]*>/gi) || []) add(attr(img, 'src'), (cap && text(cap[1])) || attr(img, 'alt'), owner);
      return '';
    });
    for (const img of rest.match(/<img\b[^>]*>/gi) || []) add(attr(img, 'src'), attr(img, 'alt'), owner);
  };
  for (const p of cms.posts) {
    const d = cms.postDetails.get(p.slug) || {};
    add(p.cover, '', p.title);
    fromHtml(d.content_html, p.title);
    if (d.smart) fromHtml(d.smart.html, p.title);
  }
  for (const p of cms.products) {
    const d = cms.productDetails.get(p.slug) || {};
    for (const img of d.images || [p.img]) add(img, '', p.name);
    fromHtml(d.content_html, p.name);
    if (d.smart) fromHtml(d.smart.html, p.name);
  }
  return [...by].map(([src, it]) => {
    const more = it.owners.length > 3 ? ' (+' + (it.owners.length - 3) + ')' : '';
    return [src, it.caption, it.owners.slice(0, 3).join(' · ') + more];
  });
}

/** Cây danh mục: tổ tiên, độ sâu, tập con cháu. Danh mục cha không tồn tại = coi như gốc. */
function tree(cats) {
  const by = new Map(cats.map((c) => [c.path, c]));
  const ancestors = (c) => {
    const out = [];
    const seen = new Set([c.path]);
    for (let p = by.get(c.parent); p && !seen.has(p.path); p = by.get(p.parent)) { out.unshift(p); seen.add(p.path); }
    return out;
  };
  const descendants = new Map(cats.map((c) => [c.path, new Set([c.path])]));
  for (const c of cats) for (const a of ancestors(c)) descendants.get(a.path).add(c.path);
  return { by, ancestors, descendants };
}
const crumbs = (T, c, linkSelf) => [
  { t: 'Trang chủ', href: '/' },
  ...T.ancestors(c).map((a) => ({ t: a.name, href: url(a.path) })),
  linkSelf ? { t: c.name, href: url(c.path) } : { t: c.name },
];

function pagination(base, n, total) {
  if (total <= 1) return [];
  return Array.from({ length: total }, (_, i) => ({ current: i + 1 === n, text: String(i + 1), icon: null, href: pagedUrl(base, i + 1) }));
}

export function productCard(p) {
  const price = formatPrice(p.price);
  return {
    id: p.id, name: p.name, href: url(p.slug), img: p.img || '', price,
    old: price ? formatPrice(p.old_price) || null : null, disc: price ? discount(p.price, p.old_price) : null,
    rating: 5, btn: price ? 'cart' : 'contact', bhref: price ? null : '/lien-he/',
  };
}

export function postCard(p) {
  return {
    title: p.title, href: url(p.slug), img: p.cover, date: dmy(p.date), views: (p.views || 0) + ' Lượt xem',
    desc: p.description ? `<p>${esc(p.description)}</p>` : '',
  };
}

/** Băm FNV-1a 32 bit - dùng chọn ngẫu nhiên nhưng CỐ ĐỊNH (build phải tất định). */
function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

const SUGGEST_COUNT = 4;

/**
 * "Có thể bạn sẽ thích" (GAS.md mục III.6): sản phẩm người dùng chọn (field `suggested`, tối đa 4,
 * bỏ slug đã xoá), thiếu thì bù "ngẫu nhiên" trong toàn bộ sản phẩm. Ngẫu nhiên kiểu rendezvous
 * hashing: điểm = hash(slug trang + slug ứng viên), lấy điểm nhỏ nhất -> thêm/xoá 1 sản phẩm chỉ đổi
 * vài trang, không làm cả 1.500 trang đổi theo mỗi lần build.
 */
function suggestFor(p, d, bySlug, all) {
  const picked = [];
  const seen = new Set([p.slug]);
  for (const s of d.suggested || []) {
    const q = bySlug.get(s);
    if (q && !seen.has(s) && picked.length < SUGGEST_COUNT) { picked.push(q); seen.add(s); }
  }
  if (picked.length < SUGGEST_COUNT) {
    const pool = all.filter((q) => !seen.has(q.slug)).map((q) => [hash32(p.slug + '|' + q.slug), q]);
    pool.sort((a, b) => a[0] - b[0] || (a[1].slug < b[1].slug ? -1 : 1));
    for (const [, q] of pool.slice(0, SUGGEST_COUNT - picked.length)) picked.push(q);
  }
  return picked.map(productCard);
}

export function buildCmsPages(cms) {
  const pages = {};
  const PT = tree(cms.productCats);
  const BT = tree(cms.postCats);

  /* ----- Sản phẩm ----- */
  const products = cms.products.filter((p) => cms.productDetails.get(p.slug));
  const inCat = new Map(cms.productCats.map((c) => [c.path, []]));
  for (const p of products) {
    const cats = new Set();
    for (const c of p.categories || []) {
      if (!PT.by.has(c)) continue;
      cats.add(c);
      for (const a of PT.ancestors(PT.by.get(c))) cats.add(a.path);
    }
    for (const c of cats) inCat.get(c).push(p);
  }
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const primaryCat = (p) => (p.categories || []).map((c) => PT.by.get(c)).filter(Boolean)
    .sort((a, b) => PT.ancestors(b).length - PT.ancestors(a).length)[0] || null;

  for (const p of products) {
    const d = cms.productDetails.get(p.slug);
    const price = formatPrice(d.price);
    const images = (d.images || []).filter(Boolean);
    const primary = primaryCat(p);
    const peers = primary ? inCat.get(primary.path) : [];
    const at = peers.indexOf(p);
    const related = [];
    for (let i = 1; i < peers.length && related.length < 4; i++) related.push(productCard(peers[(at + i) % peers.length]));
    const desc = d.meta_description || (text(d.content_html || d.short_desc).slice(0, 160) + '...');
    const smart = smartContent(d);
    pages[url(p.slug)] = {
      type: 'product',
      smartCss: smart ? smart.css : null,
      name: d.name,
      id: String(d.id),
      price,
      old: price ? formatPrice(d.old_price) || null : null,
      disc: price ? discount(d.price, d.old_price) : null,
      contactPrice: null,
      priceValue: price ? Number(d.price) : null,
      info: [{ label: 'Tình trạng', value: d.status || 'Còn hàng', cls: 'inventory' }],
      shortDesc: lines(d.short_desc).map((l) => `<p>${esc(l)}</p>`).join(''),
      status: d.status || 'Còn hàng',
      hasQty: !!price,
      orderButtons: price
        ? [{ text: 'Thêm vào giỏ hàng', cls: 'btn btn-item add-cart add_to_cart' },
          { text: 'Mua ngay', cls: 'muangay btn btn--l btn-primary btn-order wb-main-order btn-item buy_now buy_now' }]
        : [{ text: 'Liên hệ', cls: 'lienhe btn btn--l btn-primary btn-order wb-main-order btn-item buy_now' }],
      gallery: images.map((img) => ({ full: img, img })),
      thumbs: images.length > 1 ? images : [],
      tabs: [{ title: 'Mô tả', id: 'tab-mo-ta', html: smart ? smart.html : d.content_html || '' }],
      related,
      suggest: suggestFor(p, d, bySlug, products),
      breadcrumbs: primary ? [...crumbs(PT, primary, true), { t: d.name }] : [{ t: 'Trang chủ', href: '/' }, { t: d.name }],
      meta: { title: d.meta_title || d.name, description: desc, keywords: d.meta_keywords || '', ogImage: images[0] || null },
      shareUrl: SITE_URL + url(p.slug),
    };
  }

  for (const c of cms.productCats) {
    const list = inCat.get(c.path);
    const total = Math.max(1, Math.ceil(list.length / PRODUCTS_PER_PAGE));
    for (let n = 1; n <= total; n++) {
      const slice = list.slice((n - 1) * PRODUCTS_PER_PAGE, n * PRODUCTS_PER_PAGE);
      pages[pagedUrl(c.path, n)] = {
        type: 'category_product',
        h1: c.h1 || c.name,
        hasFilter: c.has_filter !== false,
        products: slice.map(productCard),
        summary: list.length
          ? `Hiển thị ${(n - 1) * PRODUCTS_PER_PAGE + 1} - ${(n - 1) * PRODUCTS_PER_PAGE + slice.length} / ${list.length} kết quả`
          : 'Hiện chưa có sản phẩm nào.',
        pagination: pagination(c.path, n, total),
        description: n === 1 ? c.description || '' : '',
        meta: { title: c.meta_title || c.name, description: c.meta_description || '', keywords: c.meta_keywords || '', ogImage: c.og_image || null },
        breadcrumbs: crumbs(PT, c, false),
      };
    }
  }

  /* ----- Bài viết ----- */
  const posts = cms.posts.filter((p) => cms.postDetails.get(p.slug))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.updated_at).localeCompare(String(a.updated_at)));
  const postsInCat = new Map(cms.postCats.map((c) => [c.path, []]));
  for (const p of posts) {
    const c = BT.by.get(p.category);
    if (!c) continue;
    for (const k of [...BT.ancestors(c), c]) postsInCat.get(k.path).push(p);
  }
  const HOME = { t: 'Trang chủ', href: '/' };
  const BLOG_LINK = { t: BLOG.name, href: url(BLOG.path) };
  const postCatCrumbs = (c, linkSelf) => [HOME, BLOG_LINK, ...crumbs(BT, c, linkSelf).slice(1)];
  // Thanh chuyển danh mục ở đầu trang danh sách bài viết (Tất cả + từng danh mục theo cây).
  const catNav = (current) => [{ t: 'Tất cả', href: url(BLOG.path), active: current === BLOG.path }]
    .concat(cms.postCats.filter((c) => postsInCat.get(c.path).length)
      .map((c) => ({ t: c.name, href: url(c.path), active: current === c.path })));

  for (const p of posts) {
    const d = cms.postDetails.get(p.slug);
    const cat = BT.by.get(d.category);
    const peers = cat ? postsInCat.get(cat.path) : posts;
    const at = peers.indexOf(p);
    const related = [];
    for (let i = 1; i < peers.length && related.length < 4; i++) related.push(postCard(peers[(at + i) % peers.length]));
    const hero = d.cover ? `<div class="post-hero"><img src="${esc(d.cover)}" alt="${esc(d.title)}" loading="lazy"></div>` : '';
    const smart = smartContent(d);
    pages[url(p.slug)] = {
      type: 'post',
      smartCss: smart ? smart.css : null,
      title: d.title,
      date: dmy(d.date),
      views: (d.views || 0) + ' Lượt xem',
      rating: (d.rating || 0) + ' Đánh giá',
      html: hero + withToc(p.slug, d.title, smart ? smart.html : d.content_html || ''),
      related,
      relatedTitle: 'Tin tức liên quan',
      shareUrl: SITE_URL + url(p.slug),
      meta: { title: d.meta_title || d.title + ' - Adzo', description: d.description || '', keywords: d.meta_keywords || '', ogImage: d.cover || null },
      breadcrumbs: [...(cat ? postCatCrumbs(cat, true) : [HOME, BLOG_LINK]), { t: d.title }],
    };
  }

  // Trang tổng /tin-tuc/ + mỗi danh mục: cùng 1 kiểu trang danh sách, phân trang -trang-N.
  const listings = [{
    path: BLOG.path, h1: BLOG.h1, list: posts, meta: BLOG.meta, pagedTitle: BLOG.pagedTitle,
    crumbs: (linkSelf) => [HOME, linkSelf ? BLOG_LINK : { t: BLOG.name }],
  }].concat(cms.postCats.map((c) => ({
    path: c.path, h1: c.h1 || c.name, list: postsInCat.get(c.path),
    meta: { title: c.meta_title || c.name + ' - Tin tức Adzo', description: c.meta_description || '', keywords: c.meta_keywords || '', ogImage: c.og_image || null },
    pagedTitle: c.meta_title || c.name + ' - Tin tức Adzo',
    crumbs: (linkSelf) => postCatCrumbs(c, linkSelf),
  })));
  for (const L of listings) {
    const total = Math.max(1, Math.ceil(L.list.length / POSTS_PER_PAGE));
    for (let n = 1; n <= total; n++) {
      const slice = L.list.slice((n - 1) * POSTS_PER_PAGE, n * POSTS_PER_PAGE);
      pages[pagedUrl(L.path, n)] = {
        type: 'category_post',
        h1: L.h1,
        cats: catNav(L.path),
        posts: slice.map(postCard),
        summary: L.list.length
          ? `Hiển thị ${(n - 1) * POSTS_PER_PAGE + 1} - ${(n - 1) * POSTS_PER_PAGE + slice.length} / ${L.list.length} kết quả`
          : 'Hiện chưa có bài viết nào.',
        pagination: pagination(L.path, n, total),
        meta: n === 1 ? { ...L.meta } : { ...L.meta, title: L.pagedTitle + ' - Trang ' + n },
        breadcrumbs: n === 1 ? L.crumbs(false) : [...L.crumbs(true), { t: 'Trang ' + n }],
      };
    }
  }
  return {
    pages,
    latestPosts: posts.map(postCard),
    productCards: new Map(products.map((p) => [url(p.slug), productCard(p)])),
    searchIndex: products.map((p) => {
      const c = productCard(p);
      return { name: c.name, href: c.href, img: c.img || null, price: c.price, old: c.old, disc: c.disc, btn: c.btn };
    }),
  };
}
