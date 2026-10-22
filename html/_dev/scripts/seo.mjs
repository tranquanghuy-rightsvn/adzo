// SEO cho toàn bộ site tĩnh: canonical tuyệt đối, meta robots/og/twitter, JSON-LD, robots.txt, sitemap.xml.
// Chạy lại nhiều lần không sinh trùng (khối chèn nằm giữa <!-- seo:start --> và <!-- seo:end -->).
// Dùng: node _dev/scripts/seo.mjs   (build-site.mjs tự gọi sau khi build)
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadSettings } from './lib/settings.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const WEB = path.resolve(ROOT, '..');

export const SITE_URL = 'https://adzo.vn';
// Thông tin doanh nghiệp lấy từ data/settings.json (tab "Quản lý website" trong CMS).
const S = await loadSettings(path.resolve(WEB, '..'));
const ORG = {
  name: S.brand_name,
  legalName: S.legal_name,
  slogan: S.tagline,
  logo: S.logo,
  phone: S.hotline_intl,
  taxID: S.tax_code,
  street: S.address,
  city: S.city,
  zalo: S.zalo_url,
};
const HOME_DESC = S.home_description;
const DEFAULT_IMAGE = S.og_image;
const OLD_HOSTS = /https?%3A%2F%2F(?:www\.)?(?:tahawa\.com\.vn|tahawa\.vn|adzco\.com\.vn|adzco\.vn)/gi;
// Trang không cho index (giỏ hàng, thanh toán, tài khoản, tìm kiếm, 404)
const NOINDEX = new Set(['/cart/', '/checkout/', '/login/', '/register/', '/tim-kiem/', '/404.html']);

const abs = (p) => (/^https?:\/\//.test(p) ? p : SITE_URL + encodeURI(decodeURI(p)));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unesc = (s) => String(s).replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const text = (s) => unesc(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const pick = (html, re) => { const m = html.match(re); return m ? m[1] : ''; };
const jsonLd = (obj) => `  <script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

async function walk(dir, out = []) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    // admin/ là trang quản trị viết tay (tự có noindex) - không được chèn SEO/đưa vào sitemap.
    if (e.name === '_dev' || e.name === 'node_modules' || e.name === 'admin' || e.name === 'vendor' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function urlPathOf(file) {
  const rel = path.relative(WEB, file).split(path.sep).join('/');
  if (rel === 'index.html') return '/';
  return rel.endsWith('/index.html') ? '/' + rel.slice(0, -'index.html'.length) : '/' + rel;
}

// Ảnh og: ưu tiên ảnh đã tải về trên chính domain
function resolveImage(src) {
  if (!src) return '';
  const m = src.match(/^https?:\/\/tahawa-img\.vercel\.app\/(.+)$/);
  if (m && existsSync(path.join(WEB, 'assets/img', decodeURI(m[1])))) return abs('/assets/img/' + m[1]);
  if (src.startsWith('/')) return abs(src);
  return src;
}

function breadcrumbLd(html, url) {
  const ul = pick(html, /<div class="breadcrumbs">[\s\S]*?<ul>([\s\S]*?)<\/ul>/);
  if (!ul) return null;
  const items = [];
  for (const li of ul.match(/<li>[\s\S]*?<\/li>/g) || []) {
    const href = pick(li, /<a href="([^"]+)"/);
    const name = text(li.replace(/<i>\/<\/i>/, ''));
    if (name) items.push({ name, item: href ? abs(href) : url });
  }
  if (items.length < 2) return null;
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.item })),
  };
}

const orgLd = () => ({
  '@type': ['Organization', 'Store'],
  '@id': SITE_URL + '/#organization',
  name: ORG.name,
  legalName: ORG.legalName,
  url: SITE_URL + '/',
  logo: abs(ORG.logo),
  image: abs(ORG.logo),
  slogan: ORG.slogan,
  telephone: ORG.phone,
  taxID: ORG.taxID,
  address: { '@type': 'PostalAddress', streetAddress: ORG.street, addressLocality: ORG.city, addressCountry: 'VN' },
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    opens: '07:00', closes: '22:00',
  },
  contactPoint: { '@type': 'ContactPoint', telephone: ORG.phone, contactType: 'customer service', areaServed: 'VN', availableLanguage: 'vi' },
  sameAs: [ORG.zalo],
});

const siteLd = () => ({
  '@type': 'WebSite',
  '@id': SITE_URL + '/#website',
  url: SITE_URL + '/',
  name: ORG.name,
  inLanguage: 'vi-VN',
  publisher: { '@id': SITE_URL + '/#organization' },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: SITE_URL + '/tim-kiem/?keyword={search_term_string}' },
    'query-input': 'required name=search_term_string',
  },
});

function pageLd(html, urlPath, bodyClass, meta) {
  const url = abs(urlPath);
  const graph = [];
  const ref = { publisher: { '@id': SITE_URL + '/#organization' }, isPartOf: { '@id': SITE_URL + '/#website' } };
  const base = { '@id': url + '#webpage', url, name: meta.title, description: meta.description, inLanguage: 'vi-VN', isPartOf: ref.isPartOf };

  if (urlPath === '/') {
    graph.push(orgLd(), siteLd(), { '@type': 'WebPage', ...base, about: { '@id': SITE_URL + '/#organization' } });
  } else if (bodyClass.includes('product_detail')) {
    const tag = pick(html, /(<div class="product-detail"[^>]*>)/);
    const attr = (n) => unesc(pick(tag, new RegExp(`data-${n}="([^"]*)"`)));
    const images = [...new Set([...html.matchAll(/class="img-main-href" href="([^"]+)"/g)].map((m) => resolveImage(m[1])))];
    if (!images.length && meta.image) images.push(meta.image);
    const price = attr('price').replace(/[^\d]/g, '');
    const inStock = /class="color">\s*Còn hàng/.test(html);
    const product = {
      '@type': 'Product',
      '@id': url + '#product',
      name: attr('name') || meta.title,
      description: meta.description,
      sku: attr('id') || undefined,
      image: images.length ? images : undefined,
      url,
    };
    if (price) {
      product.offers = {
        '@type': 'Offer',
        url,
        price: Number(price),
        priceCurrency: 'VND',
        availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@id': SITE_URL + '/#organization' },
      };
    }
    graph.push({ '@type': 'ItemPage', ...base, mainEntity: { '@id': url + '#product' } }, product);
  } else if (bodyClass.includes('post_detail')) {
    const d = pick(html, /post-detail-date">[\s\S]*?(\d{2}\/\d{2}\/\d{4})/);
    const iso = d ? `${d.slice(6)}-${d.slice(3, 5)}-${d.slice(0, 2)}` : undefined;
    graph.push({ '@type': 'WebPage', ...base }, {
      '@type': 'Article',
      '@id': url + '#article',
      headline: (text(pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/)) || meta.title).slice(0, 110),
      description: meta.description,
      image: meta.image ? [meta.image] : undefined,
      datePublished: iso,
      dateModified: iso,
      inLanguage: 'vi-VN',
      mainEntityOfPage: { '@id': url + '#webpage' },
      author: { '@id': SITE_URL + '/#organization' },
      publisher: { '@type': 'Organization', '@id': SITE_URL + '/#organization', name: ORG.name, logo: { '@type': 'ImageObject', url: abs(ORG.logo) } },
    });
  } else if (bodyClass.includes('category_product') || bodyClass.includes('category_post')) {
    const page = { '@type': 'CollectionPage', ...base };
    const seen = new Set();
    const items = [];
    const grid = html.split('<aside')[0];
    for (const m of grid.matchAll(/<div class="product-item"[^>]*data-name="([^"]*)"[^>]*data-href="([^"]*)"/g)) {
      if (seen.has(m[2])) continue;
      seen.add(m[2]);
      items.push({ '@type': 'ListItem', position: items.length + 1, name: unesc(m[1]), url: abs(m[2]) });
    }
    if (items.length) page.mainEntity = { '@type': 'ItemList', numberOfItems: items.length, itemListElement: items };
    graph.push(page);
  } else {
    const type = bodyClass.includes('contact') ? 'ContactPage' : urlPath === '/gioi-thieu/' ? 'AboutPage' : 'WebPage';
    graph.push({ '@type': type, ...base });
  }

  const bc = breadcrumbLd(html, url);
  if (bc) { bc['@id'] = url + '#breadcrumb'; graph[urlPath === '/' ? 2 : 0].breadcrumb = { '@id': bc['@id'] }; graph.push(bc); }
  return { '@context': 'https://schema.org', '@graph': graph };
}

function processPage(html, urlPath) {
  const noindex = NOINDEX.has(urlPath);
  const is404 = urlPath === '/404.html';
  const url = abs(urlPath);
  const bodyClass = pick(html, /<body class="([^"]*)"/);

  // Bỏ khối seo cũ + các thẻ sẽ sinh lại
  html = html.replace(/[ \t]*<!-- seo:start -->[\s\S]*?<!-- seo:end -->\n?/g, '')
    .replace(/[ \t]*<link rel="canonical"[^>]*>\n?/g, '')
    .replace(/[ \t]*<meta name="robots"[^>]*>\n?/g, '')
    .replace(/[ \t]*<meta property="og:(?:title|description|image|url|type|site_name|locale)"[^>]*>\n?/g, '')
    .replace(/[ \t]*<meta name="twitter:[^"]*"[^>]*>\n?/g, '');

  const title = unesc(pick(html, /<title>([\s\S]*?)<\/title>/)).trim();
  let description = unesc(pick(html, /<meta name="description" content="([^"]*)"/)).trim();
  if (urlPath === '/') description = HOME_DESC;
  if (!description || description === title) {
    const body = text(pick(html, /<div class="(?:category-description|detail-descript|decription|page-detail-content)[^"]*">([\s\S]*?)<\/div>/));
    if (body.length > 60) description = body.slice(0, 157).replace(/\s+\S*$/, '') + '...';
    else if (noindex) description = title;
    else if (bodyClass.includes('category_product')) description = `${title.replace(/\s*-\s*Adzo$/, '')} chính hãng, giá tốt tại Adzo. Giao hàng tận nơi, hotline ${S.hotline}.`;
    else if (urlPath !== '/') description = `${title.replace(/\s*-\s*Adzo$/, '')} - Adzo.vn: ${ORG.slogan}. Hotline ${S.hotline}.`;
  }
  const descTag = `<meta name="description" content="${esc(description)}">`;
  html = /<meta name="description"/.test(html)
    ? html.replace(/<meta name="description" content="[^"]*">/, descTag)
    : html.replace(/(<title>[\s\S]*?<\/title>\n?)/, `$1  ${descTag}\n`);

  // Ảnh đại diện: og:image cũ (đã bị gỡ ở trên nên đọc từ nội dung trang)
  const imgSrc = pick(html, /class="img-main-href" href="([^"]+)"/) ||
    pick(html, /<div class="post-hero"><img src="([^"]+)"/) ||
    pick(html.split('<div class="page-content"')[1] || '', /<img[^>]*src="(\/assets\/img\/images\/[^"]+)"/);
  const image = resolveImage(imgSrc) || abs(DEFAULT_IMAGE);
  const ogType = bodyClass.includes('product_detail') ? 'product' : bodyClass.includes('post_detail') ? 'article' : 'website';

  const lines = ['  <!-- seo:start -->'];
  lines.push(`  <meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}">`);
  if (!is404) lines.push(`  <link rel="canonical" href="${esc(url)}">`);
  if (!noindex) lines.push(`  <link rel="alternate" hreflang="vi" href="${esc(url)}">`);
  lines.push('  <meta name="author" content="Adzo">',
    '  <meta name="theme-color" content="#ffffff">',
    '  <meta name="format-detection" content="telephone=no">',
    '  <meta property="og:locale" content="vi_VN">',
    '  <meta property="og:site_name" content="Adzo">',
    `  <meta property="og:type" content="${ogType}">`,
    `  <meta property="og:title" content="${esc(title)}">`,
    `  <meta property="og:description" content="${esc(description)}">`);
  if (!is404) lines.push(`  <meta property="og:url" content="${esc(url)}">`);
  lines.push(`  <meta property="og:image" content="${esc(image)}">`,
    `  <meta property="og:image:alt" content="${esc(title)}">`,
    `  <meta name="twitter:card" content="${image === abs(DEFAULT_IMAGE) ? 'summary' : 'summary_large_image'}">`,
    `  <meta name="twitter:title" content="${esc(title)}">`,
    `  <meta name="twitter:description" content="${esc(description)}">`,
    `  <meta name="twitter:image" content="${esc(image)}">`);
  if (ogType === 'product') {
    const price = unesc(pick(pick(html, /(<div class="product-detail"[^>]*>)/), /data-price="([^"]*)"/)).replace(/[^\d]/g, '');
    if (price) lines.push(`  <meta property="product:price:amount" content="${price}">`, '  <meta property="product:price:currency" content="VND">');
  }
  if (!noindex) lines.push(jsonLd(pageLd(html, urlPath, bodyClass, { title, description, image })));
  lines.push('  <!-- seo:end -->');

  html = html.replace(/([ \t]*<link rel="icon")/, lines.join('\n') + '\n$1');
  // Link chia sẻ còn trỏ về domain cũ
  html = html.replace(OLD_HOSTS, encodeURIComponent(SITE_URL));
  return { html, noindex };
}

export async function run() {
  const files = await walk(WEB);
  const indexable = [];
  let changed = 0;
  for (const file of files) {
    const urlPath = urlPathOf(file);
    const src = await fs.readFile(file, 'utf8');
    if (!/<link rel="icon"/.test(src)) { console.warn('bỏ qua (không có <head> chuẩn):', urlPath); continue; }
    const { html, noindex } = processPage(src, urlPath);
    if (html !== src) { await fs.writeFile(file, html); changed++; }
    if (!noindex) indexable.push(urlPath);
  }

  indexable.sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));
  await fs.writeFile(path.join(WEB, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    indexable.map((u) => `  <url><loc>${esc(abs(u))}</loc></url>`).join('\n') + '\n</urlset>\n');

  await fs.writeFile(path.join(WEB, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /_dev/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

  console.log(`seo: ${files.length} file HTML, cập nhật ${changed}, sitemap ${indexable.length} URL`);
}

if (process.argv[1]?.endsWith('seo.mjs')) await run();
