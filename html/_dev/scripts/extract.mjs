// Trích xuất dữ liệu có cấu trúc từ HTML đã crawl -> data/site.json
// (nội dung, giá, ảnh, bài viết...). Layout/CSS/JS của bản clone là code tự viết,
// ở đây chỉ lấy DỮ LIỆU và làm sạch HTML nội dung bài viết/mô tả.
import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { localPath, assetPath, isAssetUrl, slugPathFromPage, ORIGIN } from './lib/urls.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CACHE_DIR = process.env.CACHE_DIR || '/tmp/tahawa-cache';
const index = JSON.parse(await fs.readFile(path.join(ROOT, 'docs/research/crawl-index.json'), 'utf8'));

const assets = new Set();
const useAsset = (url) => {
  if (!url || url.startsWith('data:')) return null;
  const abs = new URL(url, ORIGIN + '/').href;
  if (!isAssetUrl(abs)) return abs;
  assets.add(abs);
  return assetPath(abs);
};
const T = (el) => (el && el.length ? el.text().replace(/\s+/g, ' ').trim() : '');
const imgSrc = ($img) => $img.attr('data-isrc') || $img.attr('data-src') || $img.attr('data-lazy') || $img.attr('src');

/* ---------- Làm sạch HTML nội dung (CKEditor) ---------- */
function cleanContent($, $root, pagePath) {
  if (!$root || !$root.length) return '';
  const $c = $root.clone();
  $c.find('script, style, noscript, link, meta, .btn_collape, form').remove();
  $c.find('img').each((_, el) => {
    const $i = $(el);
    const src = useAsset(imgSrc($i));
    const keep = { src, alt: $i.attr('alt') || '', style: $i.attr('style'), width: $i.attr('width'), height: $i.attr('height') };
    Object.keys(el.attribs).forEach((a) => $i.removeAttr(a));
    Object.entries(keep).forEach(([k, v]) => v && $i.attr(k, v));
    $i.attr('loading', 'lazy');
  });
  $c.find('[style]').each((_, el) => {
    const s = $(el).attr('style');
    const m = s && s.match(/url\((['"]?)([^'")]+)\1\)/);
    if (m && isAssetUrl(m[2])) $(el).attr('style', s.replace(m[2], useAsset(m[2])));
  });
  $c.find('a[href]').each((_, el) => {
    const $a = $(el);
    const h = $a.attr('href');
    let abs = null; try { abs = new URL(h, ORIGIN + pagePath).href; } catch {}
    $a.attr('href', abs && isAssetUrl(abs) ? useAsset(abs) : localPath(h, ORIGIN + pagePath));
    $a.removeAttr('aria-label');
    if ($a.attr('target') === '"_blank"') $a.attr('target', '_blank');
  });
  $c.find('iframe').each((_, el) => {
    const $f = $(el);
    const src = $f.attr('data-src') || $f.attr('src');
    if (!src) return $f.remove();
    $f.attr('src', src).attr('loading', 'lazy').removeAttr('data-src');
  });
  // lite-youtube -> placeholder của bản clone
  $c.find('lite-youtube').each((_, el) => {
    const id = $(el).attr('videoid');
    if (id) { assets.add(`https://img.youtube.com/vi/${id}/hqdefault.jpg`); }
    $(el).replaceWith(id ? `<div class="lite-yt" data-id="${id}" style="background-image:url(/assets/img/youtube/vi/${id}/hqdefault.jpg)"><button type="button" class="lty-playbtn" aria-label="Play"></button></div>` : '');
  });
  $c.find('*').each((_, el) => {
    ['aria-label', 'data-isrc', 'data-src', 'onclick', 'onload', 'onerror'].forEach((a) => $(el).removeAttr(a));
    const cls = $(el).attr('class');
    if (cls) {
      const k = cls.split(/\s+/).filter((c) => !/^(lazyload|lazy-loaded|owl-lazy)$/.test(c)).join(' ');
      k ? $(el).attr('class', k) : $(el).removeAttr('class');
    }
  });
  // TOC: chuẩn hoá ký tự toggle
  return $c.html().replace(/\s{2,}/g, ' ').trim();
}

/* ---------- Thẻ sản phẩm / bài viết dùng lại ---------- */
function productCard($, el, pagePath) {
  const $p = $(el);
  const $b = $p.find('.btn-purchased').first();
  let btn = 'cart', bhref = null;
  if ($b.find('a.lienhe').length) { btn = 'contact'; bhref = localPath($b.find('a').attr('href'), ORIGIN + pagePath); }
  else if ($b.find('a.btn').length) { btn = 'link'; bhref = localPath($b.find('a').attr('href'), ORIGIN + pagePath); }
  const $img = $p.find('.img-product img').first();
  return {
    id: $p.attr('data-id'),
    name: T($p.find('.product-title').first()),
    href: localPath($p.find('.product-title a').attr('href'), ORIGIN + pagePath),
    img: useAsset(imgSrc($img)),
    price: T($p.find('.price .new').first()) || (T($p.find('.price').first()) || ''),
    old: T($p.find('.price .old').first()) || null,
    disc: T($p.find('.price .label-discount').first()) || null,
    rating: Number($p.find('input.rating').attr('value') || 5),
    btn, bhref,
  };
}
function postCard($, el, pagePath) {
  const $p = $(el);
  return {
    id: $p.attr('data-id'),
    title: T($p.find('.post-title').first()),
    href: localPath($p.find('.post-title a').attr('href'), ORIGIN + pagePath),
    img: useAsset(imgSrc($p.find('.img-post img').first())),
    date: T($p.find('.post-date').first()).replace('|', '').trim(),
    views: T($p.find('.post-item-view').first()),
    desc: cleanContent($, $p.find('.description').first(), pagePath),
  };
}
const notSidebar = ($) => (_, el) => !$(el).closest('.widget-sidebar, header, footer').length;

function breadcrumbs($, pagePath) {
  return $('.breadcrumbs li').map((_, li) => {
    const $a = $(li).find('a').first();
    return $a.length ? { t: T($a), href: localPath($a.attr('href'), ORIGIN + pagePath) } : { t: T($(li).find('span').first()) };
  }).get();
}
function meta($, pagePath) {
  const og = $('meta[property="og:image"]').attr('content');
  return {
    title: $('title').text().trim(),
    description: $('meta[name="description"]').attr('content') || '',
    keywords: $('meta[name="keywords"]').attr('content') || '',
    ogImage: og ? useAsset(og) : null,
  };
}

/* ---------- Từng loại trang ---------- */
function parseProduct($, p) {
  const $d = $('.product-detail').first();
  const gallery = $d.find('.qv-preview a.img-main-href').map((_, a) => ({
    full: useAsset($(a).attr('href')),
    img: useAsset(imgSrc($(a).find('img'))),
  })).get();
  const thumbs = $d.find('#product-detail-carousel img').map((_, i) => useAsset(imgSrc($(i)))).get();
  const info = $d.find('.product-infor .info-extra').map((_, r) => ({
    label: T($(r).find('label')).replace(/:\s*$/, ''), value: T($(r).find('.col-8 span').first()), cls: ($(r).attr('class') || '').split(/\s+/).pop(),
  })).get();
  const tabs = $('.detail-tabs .tab-detail li a').map((_, a) => {
    const id = ($(a).attr('href') || '').replace('#', '');
    const $pane = $('#' + id);
    return { title: T($(a)), id, html: cleanContent($, $pane.find('.detail-descript').length ? $pane.find('.detail-descript') : $pane, p), collapse: $pane.find('[data-collapse="1"]').length > 0 };
  }).get();
  return {
    type: 'product',
    name: T($d.find('.product-detail-title')),
    id: $('[data-commentable_id]').attr('data-commentable_id') || null,
    price: T($d.find('.product-price ins').first()),
    old: T($d.find('.product-price del').first()) || null,
    disc: T($d.find('.product-detail-discount').first()) || null,
    contactPrice: !$d.find('.product-price ins').length ? T($d.find('.product-price').first()) : null,
    priceValue: Number($d.find('input[name=product_sale_price]').val() || $d.find('input[name=product_price]').val() || 0),
    info,
    shortDesc: cleanContent($, $d.find('.product-content-des').first(), p),
    status: T($d.find('.wb-stock-status')),
    hasQty: $d.find('.block-quantity').length > 0,
    orderButtons: $d.find('.product-oder button, .product-oder a').map((_, b) => ({ text: T($(b)), cls: $(b).attr('class') })).get(),
    gallery, thumbs, tabs,
    related: $('.related-article .product-item').filter(notSidebar($)).map((_, el) => productCard($, el, p)).get(),
    shareUrl: ORIGIN + p,
  };
}

function parseCategoryProduct($, p) {
  const $view = $('.product-list .product-view').first();
  return {
    type: 'category_product',
    h1: T($view.find('h1').first()),
    hasFilter: $('.product-filter-top').length > 0,
    products: $view.find('.product-grid-view .product-item').map((_, el) => productCard($, el, p)).get(),
    summary: T($('.pagination-page p').first()),
    pagination: $('.pagination li').map((_, li) => {
      const $a = $(li).find('a');
      return { current: $(li).hasClass('current'), text: T($a), icon: $a.find('i').attr('class') || null, href: localPath($a.attr('href'), ORIGIN + p) };
    }).get(),
    description: cleanContent($, $('.product-list .category-description, .product-list .ck_editor_content').filter(notSidebar($)).first(), p),
  };
}

function parseCategoryPost($, p) {
  const $view = $('.post-list .post-view').first();
  return {
    type: 'category_post',
    h1: T($view.find('h1').first()),
    posts: $view.find('.post-item').filter(notSidebar($)).map((_, el) => postCard($, el, p)).get(),
    infinite: $('.pagging_infinity').length > 0,
  };
}

function parsePost($, p) {
  const $a = $('.article-detail').first();
  return {
    type: 'post',
    title: T($a.find('.post-detail-title')),
    date: T($a.find('.post-detail-date')).replace(/^Ngày đăng:\s*/, ''),
    views: T($a.find('.post-detail-view')),
    rating: T($a.find('.post-detail-rating span').first()),
    html: cleanContent($, $a.find('.decription').first(), p),
    related: $('.related-article .post-item').map((_, el) => postCard($, el, p)).get(),
    relatedTitle: T($('.related-article .box_heading .heading').first()) || 'Tin tức liên quan',
    hasComment: $('.wb-comment').length > 0,
    shareUrl: ORIGIN + p,
  };
}

function parsePage($, p) {
  if ($('.contact-style1').length) {
    return {
      type: 'contact',
      map: $('.map-container iframe').attr('src'),
      heading: T($('.heading-contact')),
      address: T($('.contact-address-e')),
      phones: $('.c-info-list a[href^="tel"]').map((_, a) => ({ t: T($(a)), href: $(a).attr('href').replace(/\s+/g, '') })).get(),
    };
  }
  const $a = $('.article-detail').first();
  return {
    type: 'page',
    h1: T($a.find('h1').first()),
    html: cleanContent($, $a.find('.ck_editor_content').first(), p),
    shareUrl: ORIGIN + p,
  };
}

/* ---------- Sidebar (giống nhau toàn site) ---------- */
function parseSidebar($, p) {
  const $s = $('.widget-sidebar').first();
  if (!$s.length) return null;
  return {
    fanpage: $s.find('.widget-fanpage_fb iframe').attr('src'),
    featuredTitle: T($s.find('.widget-product .heading').first()),
    featured: $s.find('.widget-product .product-item').map((_, el) => productCard($, el, p)).get(),
    postsTitle: T($s.find('.widget-post .heading').first()),
    posts: $s.find('.widget-post .post-item').map((_, el) => postCard($, el, p)).get(),
    formTitle: T($s.find('.widget-form_contact .heading').first()),
  };
}

/* ---------- Main ---------- */
const site = { pages: {}, sidebar: null, redirects: {} };
let n = 0;
for (const [p, v] of Object.entries(index)) {
  if (v.status) continue;
  const html = await fs.readFile(path.join(CACHE_DIR, v.file), 'utf8');
  const $ = cheerio.load(html);
  const bc = v.bodyClass || '';
  const out = slugPathFromPage(p);
  let data = null;
  if (p === '/') continue; // trang chủ đã clone riêng
  if (/product_detail/.test(bc)) data = parseProduct($, p);
  else if (/category_product/.test(bc)) data = parseCategoryProduct($, p);
  else if (/category_post/.test(bc)) data = parseCategoryPost($, p);
  else if (/post_detail/.test(bc)) data = parsePost($, p);
  else if (/page_detail/.test(bc)) data = parsePage($, p);
  else if (p === '/cart') data = { type: 'cart' };
  else if (p === '/login') data = { type: 'login' };
  else if (p === '/register') data = { type: 'register' };
  else if ((html.match(/ladi-/g) || []).length > 100) data = { type: 'landing' };
  if (!data) { console.warn('skip', p, bc.slice(0, 40)); continue; }
  data.meta = meta($, p);
  data.breadcrumbs = breadcrumbs($, p);
  data.source = ORIGIN + p;
  if (!site.sidebar && /product_detail/.test(bc)) site.sidebar = parseSidebar($, p);
  if (site.pages[out] && site.pages[out].type !== data.type) console.warn('COLLISION', out, p);
  if (!site.pages[out]) site.pages[out] = data;
  if (encodeURI(out) !== p) site.redirects[p] = out;
  n++;
}
site.assets = [...assets];
await fs.mkdir(path.join(ROOT, 'data'), { recursive: true });
await fs.writeFile(path.join(ROOT, 'data/site.json'), JSON.stringify(site));
const counts = {};
Object.values(site.pages).forEach((d) => { counts[d.type] = (counts[d.type] || 0) + 1; });
console.log('pages', Object.keys(site.pages).length, counts, 'assets', site.assets.length);
