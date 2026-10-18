// Template HTML (tự viết) cho toàn bộ các loại trang của bản clone.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Phiên bản tài nguyên = băm nội dung CSS/JS: đổi file thì trình duyệt tải bản mới, KHÔNG đổi thì
// build lại ra y hệt (CI build sau mỗi lần Lưu trong CMS - dùng Date.now() sẽ đổi cả nghìn trang
// mỗi lần build dù nội dung không đổi).
const WEB_DIR = new URL('../../../', import.meta.url);
const V = createHash('md5')
  .update(['css/style.css', 'css/pages.css', 'js/carousel.js', 'js/main.js', 'js/pages.js']
    .map((f) => readFileSync(new URL(f, WEB_DIR), 'utf8')).join('\n'))
  .digest('hex').slice(0, 8);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const href = (h) => esc(h || '#');

// Google Analytics 4 - Measurement ID dạng "G-XXXXXXXXXX" (GA4 > Quản trị > Luồng dữ liệu > Web).
// Để trống = không gắn thẻ. Đổi xong chạy lại build (CI tự chạy khi file này đổi).
const GA4_ID = 'G-1KJK81JVB8';
const GA4_TAG = GA4_ID
  ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA4_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4_ID}');</script>`
  : '';
const SITE_NAME = 'Adzco - Thiết Bị Công Nghiệp Nhật Bản Chính Hãng';
const stars = (n = 5) => Array.from({ length: 5 }, (_, i) => `<i class="fa fa-star${i < n ? ' is-on' : ''}"></i>`).join('');

/* =========================================================
   Menus
   ========================================================= */
function mainMenu(MENU, current) {
  return MENU.menu.map((m) => {
    const active = m.href === current || m.sub.some((s) => s.href === current);
    const sub = m.sub.length ? '<ul class="sub-menu">' + m.sub.map((s) => `<li><a href="${href(s.href)}">${esc(s.t)}</a></li>`).join('') + '</ul>' : '';
    return `<li class="${active ? 'active' : ''}${m.sub.length ? ' dropdown' : ''}"><a href="${href(m.href)}"> ${esc(m.t)}${m.sub.length ? ' <i class="fas fa-angle-down"></i>' : ' '}</a>${sub}</li>`;
  }).join('');
}
function catMenu(MENU) {
  const items = MENU.cats.map((c) => {
    const cls = [c.sub.length ? 'has-sub' : '', c.hidden ? 'is-hidden' : ''].join(' ').trim();
    const popup = c.sub.length ? '<div class="wrap-popup"><div class="popup"><ul>' + c.sub.map((s) => `<li><a href="${href(s.href)}"> ${esc(s.t)} </a></li>`).join('') + '</ul></div></div>' : '';
    return `<li${cls ? ` class="${cls}"` : ''}><a href="${href(c.href)}"> ${esc(c.t)} </a>${popup}</li>`;
  }).join('');
  return `<ul>${items}<li class="more"><a class="more-toggle"> Xem thêm ...</a></li></ul>`;
}
function mobileItems(items) {
  return items.map((m) => {
    const sub = m.sub && m.sub.length ? '<span class="m-toggle"><i class="fa fa-plus"></i></span><ul class="m-sub">' + m.sub.map((s) => `<li><a href="${href(s.href)}">${esc(s.t)}</a></li>`).join('') + '</ul>' : '';
    return `<li><a href="${href(m.href)}"> ${esc(m.t)} </a>${sub}</li>`;
  }).join('');
}

/* =========================================================
   Layout
   ========================================================= */
// Đoạn script này có mặt ở MỌI trang do build sinh ra -> dùng luôn làm dấu nhận biết khi dọn
// trang mồ côi (isGenerated); trang viết tay (vd admin/) không có nên không bị đụng tới.
const REDIRECT_SNIPPET = `<script>/* /slug/index.html -> /slug/ */(function(l){var p=l.pathname;if(/\\/index\\.html?$/i.test(p)){l.replace(p.replace(/index\\.html?$/i,'')+l.search+l.hash);}})(location);</script>`;

export const isGenerated = (html) => html.includes('/* /slug/index.html -> /slug/ */');

export function layout(ctx, o) {
  const { MENU, P } = ctx;
  const m = o.meta || {};
  const title = m.title || SITE_NAME;
  const header = P.header
    .replace('{{HERO}}', o.isHome ? P.hero : '')
    .replace('{{MAIN_MENU}}', mainMenu(MENU, o.path))
    .replace('{{CAT_MENU}}', catMenu(MENU))
    .replace('{{MOBILE_MENU}}', mobileItems(MENU.menu))
    .replace('{{MOBILE_CAT}}', mobileItems(MENU.cats));
  const scripts = ['/js/carousel.js', '/js/main.js', ...(o.scripts || [])];
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${REDIRECT_SNIPPET}
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(m.description || title)}">
${m.keywords ? `  <meta name="keywords" content="${esc(m.keywords)}">\n` : ''}  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(m.description || title)}">
${m.ogImage ? `  <meta property="og:image" content="${esc(m.ogImage)}">\n` : ''}  <link rel="canonical" href="${esc(o.path)}">
  <link rel="icon" href="/assets/img/media/favicon.png">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
  <link rel="stylesheet" href="/css/style.css?v=${V}">
  <link rel="stylesheet" href="/css/pages.css?v=${V}">
  ${GA4_TAG}
</head>
<body class="${esc(o.bodyClass || '')}">
<div class="wrapper">

  ${header}
${o.breadcrumbs ? breadcrumbs(o.breadcrumbs) : ''}
${o.main}

${P.footer}
</div>

${P.floats}
${scripts.map((s) => `<script src="${s}?v=${V}"></script>`).join('\n')}
</body>
</html>
`;
}

export function breadcrumbs(items) {
  if (!items || !items.length) return '';
  const li = items.map((b, i) => i < items.length - 1
    ? `<li><a href="${href(b.href)}">${esc(b.t)}</a><i>/</i></li>`
    : `<li><span>${esc(b.t)}</span></li>`).join('');
  return `  <div class="breadcrumbs"><div class="container"><ul>${li}</ul></div></div>\n`;
}

/* =========================================================
   Components
   ========================================================= */
export function productButtons(p) {
  if (p.btn === 'contact') return `<a href="${href(p.bhref || '/lien-he/')}" class="btn-item btn-contact"><i class="fa fa-phone-alt"></i> <span>Liên hệ</span></a>`;
  if (p.btn === 'link') return `<a href="${href(p.bhref)}" class="btn-item" rel="nofollow"><i class="fa fa-shopping-cart"></i> <span>MUA NGAY</span></a>`;
  return '<div class="product-buttons-group">' +
    '<button type="button" class="btn-item add_to_cart"><i class="fa fa-shopping-cart"></i> <span>Thêm vào giỏ hàng</span></button></div>';
}

export function productCard(p) {
  const priceRow = p.price
    ? `<p class="price"><strong class="new">${esc(p.price)}</strong>${p.old ? ` <span class="old">${esc(p.old)}</span>` : ''}${p.disc ? ` <span class="label-discount">${esc(p.disc)}</span>` : ''} </p>`
    : '';
  return `<div class="product-item" data-id="${esc(p.id || '')}" data-name="${esc(p.name)}" data-price="${esc(p.price || '')}" data-old="${esc(p.old || '')}" data-disc="${esc(p.disc || '')}" data-img="${esc(p.img || '')}" data-href="${esc(p.href)}">` +
    '<figure class="photoframe">' +
      `<div class="img-product"><a href="${href(p.href)}"><img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" draggable="false"></a><div class="img-btns"></div></div>` +
      '<figcaption class="infor-product">' +
        `<h3 class="product-title"><a href="${href(p.href)}" class="two-lines">${esc(p.name)}</a></h3>` +
        (p.price ? `<div class="review">${stars(p.rating || 5)}</div>` : '') +
        priceRow +
        `<div class="btn-purchased">${productButtons(p)}</div>` +
      '</figcaption>' +
    '</figure></div>';
}

export function postCard(p, { readMore = false } = {}) {
  return '<div class="post-item">' +
    '<figure class="photoframe">' +
      `<div class="img-post"><a href="${href(p.href)}"><img src="${esc(p.img)}" alt="${esc(p.title)}" loading="lazy" draggable="false"></a></div>` +
      '<figcaption class="info-post">' +
        `<div class="post-title"><a href="${href(p.href)}" class="two-lines">${esc(p.title)}</a></div>` +
        `<p class="post-view-date"><span class="post-date"><i class="fas fa-calendar-alt"></i> ${esc(p.date)} <span> | </span></span><span class="post-item-view"><i class="fas fa-eye"></i> ${esc(p.views)}</span></p>` +
        `<div class="description">${p.desc || ''}</div>` +
        (readMore ? `<div class="read-more"><a href="${href(p.href)}"> Xem thêm ››</a></div>` : '') +
      '</figcaption>' +
    '</figure></div>';
}

export function boxHeading(text, tag = 'h2') {
  return `<div class="box-heading"><${tag} class="heading">${esc(text)}</${tag}><div class="line-hg"><span></span></div></div>`;
}

function captchaField(cls = '') {
  return `<div class="form-captcha ${cls}"><input type="text" class="form-control" name="captcha" autocomplete="off" required>` +
    '<canvas class="captcha-img" width="120" height="36" aria-label="captcha"></canvas>' +
    '<a href="#" class="regen-captcha" aria-label="Đổi mã"><i class="fas fa-undo"></i></a></div>';
}

export function sidebar(sb) {
  if (!sb) return '';
  const featured = sb.featured.map((p) => `<div class="sb-product">${productCard(p)}</div>`).join('');
  const posts = sb.posts.map((p) => postCard(p)).join('');
  return `<aside class="widget-sidebar">
  <div class="sb-widget sb-products">${boxHeading(sb.featuredTitle || 'SẢN PHẨM NỔI BẬT', 'div')}<div class="sb-content">${featured}</div></div>
  <div class="sb-widget sb-posts">${boxHeading(sb.postsTitle || 'TIN CHO BẠN', 'div')}<div class="sb-content">${posts}</div></div>
</aside>`;
}

export function contactForm({ compact = false } = {}) {
  const nameEmail = compact
    ? `<li><label class="required">Họ tên</label><input type="text" name="name" required class="form-control"></li>
       <li><label>Email</label><input type="email" name="email" class="form-control"></li>`
    : `<li class="clearfix"><div class="half-column"><label class="required">Họ tên</label><input type="text" name="name" required class="form-control"></div>
       <div class="half-column"><label>Email</label><input type="email" name="email" class="form-control"></div></li>`;
  return `<form class="contact-form js-validate-form" action="#" novalidate data-success="Gửi thông tin thành công! Chúng tôi sẽ liên hệ lại với bạn sớm nhất.">
  <ul>
    ${nameEmail}
    <li><label class="required">Số điện thoại</label><input type="text" name="phone" required class="form-control"></li>
    <li class="hp-field" aria-hidden="true"><input type="text" name="_hp" tabindex="-1" autocomplete="off"></li>
    <li><label class="required">Tin nhắn</label><textarea name="message" rows="10" required class="form-control"></textarea></li>
    <li class="clearfix form-actions">${captchaField(compact ? 'is-center' : '')}<div class="text-right"><button class="btn-send" type="submit">Gửi</button></div></li>
    <li><div class="form-alert" hidden></div></li>
  </ul>
</form>`;
}

/** Hàng nút chia sẻ ở trang chi tiết (sản phẩm, bài viết, trang tĩnh). Link mạng xã hội là link
 * thường (chạy cả khi tắt JS); Zalo / Sao chép / "Khác" cần JS (main.js, bindShare): trên điện thoại
 * mở bảng chia sẻ của máy, trên máy tính sao chép link để dán vào Zalo. */
function share(url, media, title) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title || '');
  const origin = (() => { try { return new URL(url).origin; } catch { return ''; } })();
  const img = media ? (/^https?:/.test(media) ? media : origin + media) : '';
  const btn = (cls, label, inner, attrs) => `<li><a class="share-btn share-btn--${cls}" ${attrs} aria-label="${label}" title="${label}">${inner}</a></li>`;
  const ext = (href) => `href="${href}" target="_blank" rel="nofollow noopener"`;
  return `<div class="share-box" data-share-url="${esc(url)}" data-share-title="${esc(title || '')}"><span class="share-box__label">Chia sẻ:</span><ul class="share-list">
  ${btn('fb', 'Chia sẻ lên Facebook', '<i class="fab fa-facebook-f"></i>', ext(`https://www.facebook.com/sharer/sharer.php?u=${u}`))}
  ${btn('zalo', 'Chia sẻ qua Zalo', '<img src="/assets/img/static/themes/base/images/icons/icon-zalo.svg" alt="" width="20" height="20">', `href="#" role="button" data-share="zalo"`)}
  ${btn('x', 'Chia sẻ lên X (Twitter)', '<i class="fab fa-twitter"></i>', ext(`https://twitter.com/intent/tweet?url=${u}&amp;text=${t}`))}
  ${img ? btn('pin', 'Lưu lên Pinterest', '<i class="fab fa-pinterest-p"></i>', ext(`https://pinterest.com/pin/create/button/?url=${u}&amp;media=${encodeURIComponent(img)}&amp;description=${t}`)) : ''}
  ${btn('mail', 'Gửi qua email', '<i class="fas fa-envelope"></i>', `href="mailto:?subject=${t}&amp;body=${u}" rel="nofollow"`)}
  ${btn('copy', 'Sao chép link', '<i class="fas fa-link"></i>', `href="#" role="button" data-share="copy"`)}
  <li class="share-native" hidden>${'<a class="share-btn share-btn--more" href="#" role="button" data-share="native" aria-label="Chia sẻ qua ứng dụng khác" title="Chia sẻ qua ứng dụng khác"><i class="fas fa-share-alt"></i></a>'}</li>
</ul><span class="share-box__msg" role="status" aria-live="polite"></span></div>`;
}

const withSidebar = (ctx, mainHtml, mainCls = '') => `<div class="page-content"><div class="container"><div class="row-main">
  <section class="col-main ${mainCls}">${mainHtml}</section>
  ${sidebar(ctx.site.sidebar)}
</div></div></div>`;

/* =========================================================
   Pages
   ========================================================= */
function productPage(ctx, p, d) {
  const gallery = d.gallery.length ? d.gallery : [{ img: '/assets/img/media/logo-adzco.png', full: '/assets/img/media/logo-adzco.png' }];
  const main = gallery.map((g, i) => `<a class="img-main-href" href="${esc(g.full || g.img)}" data-index="${i}"${i ? ' hidden' : ''}><img class="img-main-detail" src="${esc(g.img)}" alt="${esc(d.name)}"${i ? ' loading="lazy"' : ''}><i class="fa fa-expand"></i></a>`).join('');
  const thumbs = d.thumbs.length > 1
    ? `<div class="pd-thumbs-wrap"><div class="carousel carousel--d pd-thumbs" data-items="4,4,4,4" data-margin="15" data-nav="true">${d.thumbs.map((t, i) => `<div class="pd-thumb${i ? '' : ' is-current'}" data-index="${i}"><a style="background-image:url(${esc(t)})"><img src="${esc(t)}" alt="" loading="lazy" draggable="false"></a></div>`).join('')}</div></div>`
    : '';
  const infoTop = d.info.filter((r) => r.cls !== 'inventory');
  const infoInv = d.info.filter((r) => r.cls === 'inventory');
  const row = (r) => `<div class="info-extra ${esc(r.cls)}"><div class="info-label"><label>${esc(r.label)}:&nbsp;</label></div><div class="info-value"><span class="color">${esc(r.value)}</span></div></div>`;
  const isContact = d.orderButtons.some((b) => /lienhe/.test(b.cls));
  const price = d.price
    ? `<ins class="new">${esc(d.price)}</ins>${d.old ? `<del class="old">${esc(d.old)}</del>` : ''}${d.disc ? `<span class="product-detail-discount">${esc(d.disc)}</span>` : ''}`
    : `<ins class="new">${esc(d.contactPrice || 'Liên hệ')}</ins>`;
  const buttons = d.orderButtons.map((b) => {
    if (/lienhe/.test(b.cls)) return `<div class="order-col order-col--full"><a href="/lien-he/" class="btn-order btn-buy"><i class="fa fa-phone-alt"></i> ${esc(b.text)}</a></div>`;
    if (/add_to_cart/.test(b.cls)) return `<div class="order-col"><button type="button" class="btn-order btn-addcart add_to_cart"><i class="fas fa-cart-plus"></i> ${esc(b.text)}</button></div>`;
    return `<div class="order-col"><button type="button" class="btn-order btn-buy buy_now"><i class="fa fa-shopping-bag"></i> ${esc(b.text)}</button></div>`;
  }).join('');
  const tabs = d.tabs.length ? `<div class="detail-tabs">
    <ul class="tab-list">${d.tabs.map((t, i) => `<li><a href="#${esc(t.id)}" class="tab-item${i ? '' : ' active'}" data-tab="${esc(t.id)}"> ${esc(t.title)} </a></li>`).join('')}</ul>
    <div class="tab-content">${d.tabs.map((t, i) => `<div class="tab-pane${i ? '' : ' active'}" id="${esc(t.id)}"><div class="detail-descript ck-content"${t.collapse ? ' data-collapse="1"' : ''}>${t.html}</div></div>`).join('')}</div>
  </div>` : '';
  const related = d.related.length
    ? `${boxHeading('Sản phẩm liên quan')}<div class="related-grid">${d.related.map((r) => `<div class="related-col">${productCard(r)}</div>`).join('')}</div>`
    : '';
  const html = `<div class="product-detail" data-id="${esc(d.id || '')}" data-name="${esc(d.name)}" data-price="${esc(d.price || '')}" data-old="${esc(d.old || '')}" data-disc="${esc(d.disc || '')}" data-img="${esc((gallery[0] || {}).img || '')}" data-href="${esc(p)}">
    <div class="pd-gallery"><div class="qv-preview">${main}</div>${thumbs}</div>
    <div class="pd-info">
      <form class="add-to-cart" action="#" onsubmit="return false">
        <h1 class="product-detail-title">${esc(d.name)}</h1>
        <div class="product-price">${price}</div>
        <hr class="divider">
        <div class="product-infor">${infoTop.map(row).join('')}</div>
        <div class="product-content-des">${d.shortDesc}</div>
        <hr class="divider">
        ${infoInv.length ? `<div class="product-infor">${infoInv.map(row).join('')}</div>` : ''}
        ${d.hasQty && !isContact ? `<div class="block-quantity"><div class="info-label"><label>Số lượng:&nbsp;</label></div><div class="info-value"><div class="border-quantity"><button type="button" class="qty-down" aria-label="Giảm"><i class="fas fa-minus"></i></button><input type="number" value="1" min="1" class="product-qty" name="quantity" aria-label="Số lượng"><button type="button" class="qty-up" aria-label="Tăng"><i class="fas fa-plus"></i></button></div></div></div>` : ''}
        <div class="product-oder">${buttons}</div>
        <hr class="divider">
      </form>
      ${share(d.shareUrl, (gallery[0] || {}).full, d.name)}
    </div>
  </div>
  ${tabs}
  ${related}`;
  return layout(ctx, { path: p, bodyClass: 'product_detail', meta: d.meta, breadcrumbs: d.breadcrumbs, main: withSidebar(ctx, html, 'pd-main'), scripts: ['/js/pages.js'] });
}

function pagination(d) {
  if (!d.pagination || !d.pagination.length) return '';
  const lis = d.pagination.map((pg) => {
    if (pg.ellipsis) return '<li class="ellipsis"><span>…</span></li>';
    return `<li${pg.current ? ' class="current"' : ''}><a href="${href(pg.href)}">${pg.icon ? `<i class="${esc(pg.icon)}"></i>` : esc(pg.text)}</a></li>`;
  }).join('');
  return `<div class="pagination-page"><p class="pagination-summary">${esc(d.summary)}</p><div class="pagination"><ul>${lis}</ul></div></div>`;
}

function categoryProductPage(ctx, p, d) {
  const html = `<div class="product-view">
    <h1 class="list-title">${esc(d.h1)}</h1>
    <div class="sort_products"><p>Sắp xếp:</p><div class="wrap-select"><select class="select_products" aria-label="Sắp xếp">
      <option value="null">Chọn</option><option value="sort_price=desc">Giá giảm dần</option><option value="sort_price=asc">Giá tăng dần</option><option value="sort_date=desc">Từ mới đến cũ</option><option value="sort_date=asc">Từ cũ đến mới</option>
    </select></div></div>
    <hr class="divider-2">
    <div class="product-grid product-grid--cat">${d.products.map((pr, i) => `<div class="cat-col" data-order="${i}">${productCard(pr)}</div>`).join('')}</div>
    ${pagination(d)}
    ${d.description ? `<div class="category-description ck-content">${d.description}</div>` : ''}
  </div>`;
  const main = `<div class="page-content"><div class="container">
    ${d.hasFilter ? '<div class="product-filter-top"><div class="title-filter"><h2><b>Bộ lọc</b></h2></div></div>' : ''}
    <div class="row-main"><section class="col-main">${html}</section>${sidebar(ctx.site.sidebar)}</div>
  </div></div>`;
  return layout(ctx, { path: p, bodyClass: 'category_product', meta: d.meta, breadcrumbs: d.breadcrumbs, main, scripts: ['/js/pages.js'] });
}

function categoryPostPage(ctx, p, d) {
  const items = d.posts.map((ps) => `<div class="post-col">${postCard(ps)}</div>`).join('');
  const html = `<div class="post-view">
    <h1 class="list-title">${esc(d.h1)}</h1>
    ${d.cats && d.cats.length > 1 ? `<ul class="post-cats">${d.cats.map((c) => `<li><a href="${href(c.href)}"${c.active ? ' class="is-active"' : ''}>${esc(c.t)}</a></li>`).join('')}</ul>` : ''}
    <div class="post-list-view">${items}</div>
    <hr class="divider-2">
    ${pagination(d)}
  </div>`;
  return layout(ctx, { path: p, bodyClass: 'category_post', meta: d.meta, breadcrumbs: d.breadcrumbs, main: withSidebar(ctx, html), scripts: ['/js/pages.js'] });
}

function postPage(ctx, p, d) {
  const related = d.related.length ? `<hr class="divider-3"><div class="related-posts">${boxHeading(d.relatedTitle)}
    <div class="carousel carousel--d carousel--equal" data-items="1,2,2,3" data-margin="16" data-loop="false" data-nav="true">${d.related.map((r) => postCard(r, { readMore: true })).join('')}</div></div>` : '';
  const html = `<article class="article-detail">
    <h1 class="post-detail-title">${esc(d.title)}</h1>
    <div class="post-infor">
      <div class="post-detail-date"><label><i class="fas fa-calendar-alt"></i> Ngày đăng: </label> ${esc(d.date)}</div>
      <div class="post-detail-view"><label><i class="fas fa-eye"></i> ${esc(d.views)}</label></div>
      <div class="post-detail-rating"><div class="review">${stars(5)} <span>${esc(d.rating || '0 Đánh giá')}</span></div></div>
    </div>
    <div class="decription ck-content">${d.html}</div>
  </article>
  ${share(d.shareUrl, d.meta && d.meta.ogImage, d.title)}
  ${related}
  <hr class="divider-3"><div class="m-bottom-30"></div>`;
  return layout(ctx, { path: p, bodyClass: 'post_detail', meta: d.meta, breadcrumbs: d.breadcrumbs, main: withSidebar(ctx, html), scripts: ['/js/pages.js'] });
}

function staticPage(ctx, p, d) {
  const html = `<article class="article-detail article-detail--page"><h1 class="page-title">${esc(d.h1)}</h1><div class="ck-content">${d.html}</div></article>${share(d.shareUrl, null, d.h1)}`;
  return layout(ctx, { path: p, bodyClass: 'page_detail', meta: d.meta, breadcrumbs: d.breadcrumbs, main: withSidebar(ctx, html), scripts: ['/js/pages.js'] });
}

function contactPage(ctx, p, d) {
  const main = `<div class="page-content"><div class="container contact-page">
    <div class="map-container"><iframe src="${esc(d.map)}" width="600" height="450" style="border:0" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Bản đồ"></iframe></div>
    <div class="contact-row">
      <div class="contact-info"><h1 class="heading-contact">${esc(d.heading || 'Liên hệ')} </h1>
        <ul class="c-info-list">
          <li><i class="fas fa-map-marker"></i><div class="contact-e"><p>${esc(d.address)}</p></div></li>
          <li><i class="fas fa-phone-alt"></i><p class="contact-e">${d.phones.map((ph) => `<a href="${esc(ph.href)}">${esc(ph.t)}</a>`).join(' ')}</p></li>
        </ul>
      </div>
      <div class="contact-form-col"><div class="heading">Form liên hệ</div>${contactForm()}</div>
    </div>
  </div></div>`;
  return layout(ctx, { path: p, bodyClass: 'page_detail contact', meta: d.meta, breadcrumbs: d.breadcrumbs, main, scripts: ['/js/pages.js'] });
}

function cartPage(ctx, p, d) {
  const main = `<div class="page-content page-content--cart"><div class="container" id="cartPage">
    <h1 class="cart-title">Giỏ hàng</h1>
    <div class="cart-root" data-cart-root>
      <div class="cart-empty alert-danger">Chưa có sản phẩm nào trong giỏ hàng</div>
    </div>
    <div class="cart-continue"><a class="continue_shopping" href="/"><i class="fa fa-arrow-left"></i> Tiếp tục mua hàng</a></div>
  </div></div>`;
  return layout(ctx, { path: p, bodyClass: 'cart', meta: { title: 'Adzco - Giỏ hàng' }, main, scripts: ['/js/pages.js'] });
}

function accountPage(ctx, p, d, kind) {
  const login = kind === 'login';
  const fields = login
    ? `<div class="form-group"><label>Email <span class="required">*</span></label><input type="email" required class="form-control" name="email" placeholder="Email"></div>
       <div class="form-group"><label>Mật khẩu <span class="required">*</span></label><input type="password" required class="form-control" name="password" placeholder="Mật khẩu"></div>
       <div class="form-group form-row-split"><div><input id="remember" type="checkbox" name="remember" value="1"> <label for="remember">Nhớ mật khẩu</label></div><div><a href="/login/#quen-mat-khau" class="color forgot-link">Quên mật khẩu?</a></div></div>`
    : `<div class="form-group"><label>Họ tên <span class="required">*</span></label><input type="text" required class="form-control" name="fullname" placeholder="Họ tên"></div>
       <div class="form-group"><label>Số điện thoại</label><input type="tel" class="form-control" name="phone" placeholder="Số điện thoại" maxlength="10"></div>
       <div class="form-group"><label>Địa chỉ Email <span class="required">*</span></label><input type="email" required class="form-control" name="email" placeholder="Địa chỉ Email" maxlength="50"></div>
       <div class="form-group"><label>Mật khẩu <span class="required">*</span></label><input type="password" required class="form-control" name="password" placeholder="Mật khẩu"></div>
       <div class="form-group"><label>Nhập lại mật khẩu <span class="required">*</span></label><input type="password" required class="form-control" name="password_confirmation" placeholder="Nhập lại mật khẩu"></div>
       <div class="form-group register-captcha"><canvas class="captcha-img" width="117" height="35" aria-label="captcha"></canvas><input type="text" name="captcha" autocomplete="off" required class="form-control"><a href="#" class="regen-captcha" aria-label="Đổi mã"><i class="fa fa-undo"></i></a></div>`;
  const main = `<div class="page-content"><div class="container"><div class="modal-user">
    <form class="account-form js-validate-form" action="#" novalidate data-success="${login ? 'Email hoặc mật khẩu không chính xác.' : 'Đăng ký tài khoản thành công!'}" data-kind="${kind}">
      <div class="modal-content"><div class="modal-body"><div class="wb-form-account">
        ${fields}
        <div class="form-alert" hidden></div>
        <div class="form-group"><button type="submit" class="btn-block">${login ? 'Đăng nhập' : 'Đăng ký'}</button></div>
        <div class="social-login-title"><span>${login ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}</span></div>
        <div class="text-center"><a class="text-decoration" href="${login ? '/register/' : '/login/'}">${login ? 'Đăng ký tài khoản mới' : 'Đăng nhập'}</a></div>
      </div></div></div>
    </form>
  </div></div></div>`;
  return layout(ctx, { path: p, bodyClass: login ? 'user-login' : 'user-register', meta: { title: login ? 'Adzco - Đăng nhập' : 'Adzco - Đăng ký' }, breadcrumbs: [{ t: 'Trang chủ', href: '/' }, { t: login ? 'Đăng nhập' : 'Đăng ký' }], main, scripts: ['/js/pages.js'] });
}

// Tài khoản nhận chuyển khoản - PHẢI khớp BANK_INFO trong gas/Code.js (email xác nhận đơn).
// Mã QR sinh bằng _dev/scripts/make-bank-qr.py (đổi tài khoản thì chạy lại script đó).
export const BANK = { name: 'ACB', account: '260613369', holder: 'CTY TNHH ALO MUA BÁN', qr: '/assets/img/payment/qr-code.svg' };

export function checkoutPage() {
  const field = (label, input, cls = '') => `<div class="co-field${cls ? ' ' + cls : ''}"><label>${label}</label>${input}</div>`;
  const req = '<em>*</em>';
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${REDIRECT_SNIPPET}
  <title>Adzco - Thanh toán đơn hàng</title>
  <meta name="robots" content="noindex">
  <link rel="icon" href="/assets/img/media/favicon.png">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
  <link rel="stylesheet" href="/css/style.css?v=${V}">
  <link rel="stylesheet" href="/css/pages.css?v=${V}">
  ${GA4_TAG}
</head>
<body class="checkout-page">
<header class="co-header"><div class="co-container">
  <a class="co-logo" href="/"><img src="/assets/img/media/logo-adzco.png" alt="Adzo.vn - Máy móc, thiết bị, vật tư" width="188" height="40"></a>
  <ol class="co-steps"><li><a href="/cart/">Giỏ hàng</a></li><li class="is-current">Thanh toán</li><li>Hoàn tất</li></ol>
  <a class="co-hotline" href="tel:0933110083"><i class="fa fa-phone-alt"></i><span><small>Hỗ trợ đặt hàng</small>0933 11 00 83</span></a>
</div></header>
<main class="co-container co-main-wrap">
  <form action="#" id="checkout-order-form" novalidate>
    <span class="hp-field" aria-hidden="true"><input type="text" name="_hp" tabindex="-1" autocomplete="off"></span>
    <h1 class="co-title">Thanh toán đơn hàng</h1>
    <div class="co-layout">
      <div class="co-main">
        <section class="co-card">
          <h2 class="co-card__title"><span class="co-num">1</span>Thông tin nhận hàng</h2>
          <div class="co-grid">
            ${field('Họ tên ' + req, '<input type="text" name="name" placeholder="Nguyễn Văn A" required autocomplete="name">')}
            ${field('Số điện thoại ' + req, '<input type="tel" name="phone" placeholder="0901 234 567" required inputmode="tel" autocomplete="tel">')}
            ${field('Email', '<input type="email" name="email" placeholder="Không bắt buộc - để nhận xác nhận đơn" autocomplete="email">', 'co-span-full')}
          </div>
          <div class="co-grid co-grid--3">
            ${field('Tỉnh / Thành phố ' + req, '<select name="province" id="province" required><option value="">Chọn tỉnh / thành</option></select>')}
            ${field('Quận / Huyện ' + req, '<select name="district" id="district" required><option value="">Chọn quận / huyện</option></select>')}
            ${field('Phường / Xã ' + req, '<select name="ward" id="ward" required><option value="">Chọn phường / xã</option></select>')}
          </div>
          <div class="co-grid">
            ${field('Địa chỉ ' + req, '<input type="text" name="address" placeholder="Số nhà, tên đường" required autocomplete="street-address">', 'co-span-full')}
            ${field('Ghi chú', '<textarea name="note" rows="3" placeholder="Thời gian nhận hàng, yêu cầu xuất hoá đơn..."></textarea>', 'co-span-full')}
          </div>
        </section>
        <section class="co-card">
          <h2 class="co-card__title"><span class="co-num">2</span>Phương thức thanh toán</h2>
          <label class="co-pay"><input type="radio" name="payment" value="COD" checked><span class="co-pay__box"><i class="fas fa-money-bill-wave"></i><span><b>Thanh toán khi nhận hàng (COD)</b><small>Giao hàng và thu tiền tận nơi.</small></span></span></label>
          <label class="co-pay"><input type="radio" name="payment" value="BANK"><span class="co-pay__box"><i class="fas fa-university"></i><span><b>Chuyển khoản ngân hàng</b><small>Quét mã QR bằng ứng dụng ngân hàng hoặc chuyển khoản theo thông tin bên dưới.</small></span></span></label>
          <div class="co-bank" data-bank hidden>${bankBox('Mã đơn hàng')}</div>
          <label class="co-paid" data-paid hidden><input type="checkbox" name="paid" value="1"> <span>Tôi đã chuyển khoản <b>đúng số tiền</b> với nội dung là mã đơn hàng ở trên</span></label>
        </section>
      </div>
      <aside class="co-side">
        <section class="co-card co-summary">
          <h2 class="co-card__title">Đơn hàng <span class="co-count" data-checkout-count></span></h2>
          <div class="co-items" data-checkout-items></div>
          <div class="coupon-row"><input type="text" placeholder="Mã giảm giá / Quà tặng" id="coupon_code"><button type="button" id="check-coupon" disabled>Áp dụng</button></div>
          <p class="coupon-msg" hidden></p>
          <div class="co-line"><span>Tạm tính</span><span data-checkout-total></span></div>
          <div class="co-line"><span>Phí vận chuyển</span><span class="co-muted">Báo khi xác nhận đơn</span></div>
          <div class="co-line co-line--total"><span>Thành tiền</span><strong data-checkout-total></strong></div>
          <button type="submit" id="submit-order" class="co-submit">Đặt hàng</button>
          <p class="checkout-msg" hidden></p>
          <a href="/cart/" class="co-back"><i class="fas fa-angle-left"></i> Quay lại giỏ hàng</a>
        </section>
      </aside>
    </div>
  </form>
</main>
<script src="/js/main.js?v=${V}"></script>
<script src="/js/pages.js?v=${V}"></script>
</body>
</html>
`;
}

/** Khung thông tin chuyển khoản (QR + số tài khoản). pages.js dựng lại khung này ở màn hình đặt
 * hàng thành công với nội dung chuyển khoản = mã đơn thật. */
function bankBox(content) {
  return `<div class="co-bank__qr"><img src="${BANK.qr}" alt="Mã QR chuyển khoản ${BANK.name} ${BANK.account}" width="220" height="220"></div>
  <dl class="co-bank__info">
    <dt>Ngân hàng</dt><dd>${BANK.name}</dd>
    <dt>Số tài khoản</dt><dd><b data-copy>${BANK.account}</b> <button type="button" class="co-copy" data-copy-btn>Sao chép</button></dd>
    <dt>Chủ tài khoản</dt><dd>${esc(BANK.holder)}</dd>
    <dt>Nội dung CK</dt><dd data-bank-content>${content}</dd>
  </dl>`;
}

export function searchPage(ctx) {
  const html = `<div class="product-view search-view">
    <h1 class="list-title" data-search-title>Tìm kiếm</h1>
    <hr class="divider-2">
    <div class="product-grid product-grid--cat" data-search-results></div>
    <p class="search-empty" hidden>Không tìm thấy sản phẩm nào phù hợp.</p>
  </div>`;
  return layout(ctx, { path: '/tim-kiem/', bodyClass: 'category_product search', meta: { title: 'Tìm kiếm - Adzco' }, breadcrumbs: [{ t: 'Trang chủ', href: '/' }, { t: 'Tìm kiếm' }], main: withSidebar(ctx, html), scripts: ['/js/search-index.js', '/js/pages.js'] });
}

export function notFoundPage(ctx, overrides) {
  const script = `<script>
/* Chuyển hướng URL cũ của site gốc về cấu trúc /slug/ (xử lý bằng code, không cần cấu hình server) */
(function (l) {
  var OVERRIDES = ${JSON.stringify(overrides)};
  var p = decodeURI(l.pathname), t = null;
  if (/\\/index\\.html?$/i.test(p)) t = p.replace(/index\\.html?$/i, '');
  else if (/\\.html?$/i.test(p)) t = '/' + p.split('/').pop().replace(/\\.html?$/i, '') + '/';
  else if (!/\\/$/.test(p) && !/\\.[a-z0-9]{2,5}$/i.test(p)) t = p + '/';
  if (t && OVERRIDES[t] && !/\\.html?$/i.test(p)) t = OVERRIDES[t];
  if (t && t !== p) l.replace(encodeURI(t) + l.search + l.hash);
})(location);
</script>`;
  const main = `<div class="page-content"><div class="container not-found">
    <h1>404</h1><p>Trang bạn tìm không tồn tại hoặc đã được chuyển.</p>
    <p><a href="/" class="btn-send">Về trang chủ</a></p>
  </div></div>`;
  return layout(ctx, { path: '/404.html', bodyClass: 'not-found-page', meta: { title: 'Không tìm thấy trang - Adzco' }, main }).replace('</head>', script + '\n</head>');
}

export function renderPage(ctx, p, d) {
  switch (d.type) {
    case 'product': return productPage(ctx, p, d);
    case 'category_product': return categoryProductPage(ctx, p, d);
    case 'category_post': return categoryPostPage(ctx, p, d);
    case 'post': return postPage(ctx, p, d);
    case 'page': return staticPage(ctx, p, d);
    case 'contact': return contactPage(ctx, p, d);
    case 'cart': return cartPage(ctx, p, d);
    case 'login': return accountPage(ctx, p, d, 'login');
    case 'register': return accountPage(ctx, p, d, 'register');
    default: return null; // landing: build riêng (build-landing.mjs)
  }
}
