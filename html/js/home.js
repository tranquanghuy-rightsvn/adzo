/* =========================================================
   Tahawa — home.js: render các section trang chủ từ data.js
   (chạy trước khi main.js khởi tạo carousel)
   ========================================================= */
(function () {
  'use strict';

  var D = window.TAHAWA_DATA;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var link = function (href) { return href ? esc(href) : '#'; };

  /* ---------------- Templates ---------------- */
  var picture = function (lg, sm, alt) {
    return '<picture>' +
      (lg ? '<source media="(min-width: 650px)" srcset="' + esc(lg) + '">' : '') +
      (sm ? '<source media="(min-width: 350px)" srcset="' + esc(sm) + '">' : '') +
      '<img src="' + esc(lg || sm) + '" alt="' + esc(alt || 'Adzco') + '" draggable="false"></picture>';
  };
  var stars = '<i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i>';

  function productCard(p) {
    var buttons;
    if (p.btn === 'contact') {
      buttons = '<a href="' + link(p.bhref) + '" class="btn-item btn-contact"><i class="fa fa-phone-alt"></i> <span>Liên hệ</span></a>';
    } else if (p.btn === 'link') {
      buttons = '<a href="' + link(p.bhref) + '" class="btn-item" rel="nofollow"><i class="fa fa-shopping-cart"></i> <span>MUA NGAY</span></a>';
    } else {
      buttons = '<div class="product-buttons-group">' +
        '<button type="button" class="btn-item add_to_cart"><i class="fa fa-shopping-cart"></i> <span>Thêm vào giỏ hàng</span></button>' +
        '</div>';
    }
    return '<div class="product-item" data-name="' + esc(p.name) + '" data-price="' + esc(p.price) + '" data-old="' + esc(p.old || '') + '" data-disc="' + esc(p.disc || '') + '" data-img="' + esc(p.img) + '" data-href="' + esc(p.href) + '">' +
      '<figure class="photoframe">' +
        '<div class="img-product"><a href="' + link(p.href) + '"><img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" loading="lazy" draggable="false"></a><div class="img-btns"></div></div>' +
        '<figcaption class="infor-product">' +
          '<h3 class="product-title"><a href="' + link(p.href) + '" class="two-lines">' + esc(p.name) + '</a></h3>' +
          '<div class="review">' + stars + '</div>' +
          '<p class="price"><strong class="new">' + esc(p.price) + '</strong>' +
            (p.old ? ' <span class="old">' + esc(p.old) + '</span>' : '') +
            (p.disc ? ' <span class="label-discount">' + esc(p.disc) + '</span>' : '') + ' </p>' +
          '<div class="btn-purchased">' + buttons + '</div>' +
        '</figcaption>' +
      '</figure>' +
    '</div>';
  }

  function postCard(p) {
    return '<div class="post-item">' +
      '<figure class="photoframe">' +
        '<div class="img-post"><a href="' + link(p.href) + '"><img src="' + esc(p.img) + '" alt="' + esc(p.title) + '" loading="lazy" draggable="false"></a></div>' +
        '<figcaption class="info-post">' +
          '<div class="post-title"><a href="' + link(p.href) + '" class="two-lines">' + esc(p.title) + '</a></div>' +
          '<p class="post-view-date"><span class="post-date"><i class="fas fa-calendar-alt"></i> ' + esc(p.date) + ' <span> | </span></span>' +
          '<span class="post-item-view"><i class="fas fa-eye"></i> ' + esc(p.views) + '</span></p>' +
          '<div class="description">' + p.desc + '</div>' +
        '</figcaption>' +
      '</figure>' +
    '</div>';
  }

  function liteYT(id, thumb) {
    return '<div class="lite-yt" data-id="' + esc(id) + '" style="background-image:url(/assets/img/youtube/vi/' + esc(id) + '/' + thumb + '.jpg)">' +
      '<button type="button" class="lty-playbtn" aria-label="Play"></button></div>';
  }

  /* ---------------- Render sections ---------------- */
  function renderSections() {
    var heroEl = $('[data-hero]');
    if (heroEl) heroEl.innerHTML = D.hero.map(function (h) {
      var pic = picture(h.lg, h.sm, 'Adzco - Thiết Bị Công Nghiệp Nhật Bản Chính Hãng');
      return '<div class="hero-item">' + (h.href ? '<a href="' + link(h.href) + '">' + pic + '</a>' : pic) + '</div>';
    }).join('');

    var catsEl = $('[data-cats]');
    if (catsEl) catsEl.innerHTML = D.cats.map(function (c) {
      return '<div class="cat-item"><a href="' + link(c.href) + '">' +
        '<span class="cat-item__thumb">' + picture(c.lg, c.sm, c.name) + '</span>' +
        (c.name ? '<span class="cat-item__label">' + esc(c.name) + '</span>' : '') +
        '</a></div>';
    }).join('');

    $$('[data-banners]').forEach(function (box) {
      var list = D.banners[box.dataset.banners] || [];
      box.innerHTML = list.map(function (b) {
        var img = '<img src="' + esc(b.img) + '" alt="Adzco - Thiết Bị Công Nghiệp Nhật Bản Chính Hãng" loading="lazy">';
        var inner = b.href ? '<a href="' + link(b.href) + '"' + (b.target ? ' target="_blank" rel="noopener"' : '') + '>' + img + '</a>' : img;
        return box.classList.contains('banner-single') ? inner : '<div>' + inner + '</div>';
      }).join('');
    });

    $$('[data-heading]').forEach(function (h) { h.textContent = D.products[h.dataset.heading].heading; });

    $$('[data-product-carousel]').forEach(function (box) {
      box.innerHTML = D.products[box.dataset.productCarousel].items.map(productCard).join('');
    });

    $$('[data-product-grid]').forEach(function (box) {
      var cols = box.dataset.cols;
      box.innerHTML = D.products[box.dataset.productGrid].items.map(function (p) {
        return '<div class="' + cols + '">' + productCard(p) + '</div>';
      }).join('');
    });

    var partnersEl = $('[data-partners]');
    if (partnersEl) partnersEl.innerHTML = D.partners.map(function (p) {
      return '<a class="partner-item" href="' + link(p.href) + '" target="_blank" rel="nofollow noopener"><img src="' + esc(p.img) + '" alt="' + esc(p.alt) + '" draggable="false"></a>';
    }).join('');

    $$('[data-posts]').forEach(function (box) {
      box.innerHTML = D[box.dataset.posts].map(postCard).join('');
    });

    var videosEl = $('[data-videos]');
    if (videosEl) videosEl.innerHTML = D.videos.map(function (id) { return liteYT(id, 'hqdefault'); }).join('');
    var videoSingleEl = $('[data-video-single]');
    if (videoSingleEl && D.video2) videoSingleEl.innerHTML = liteYT(D.video2, 'mqdefault');

    var testimonialsEl = $('[data-testimonials]');
    if (testimonialsEl) testimonialsEl.innerHTML = D.testimonials.map(function (t) {
      return '<div class="client-item">' +
        '<img src="' + esc(t.img) + '" alt="' + esc(t.name) + '" draggable="false">' +
        '<div class="author-info"><strong><a href="#">' + esc(t.name) + '</a> </strong></div>' +
        '<blockquote><p>' + esc(t.text) + '</p></blockquote>' +
      '</div>';
    }).join('');
  }

  (window.TAHAWA_BEFORE_INIT = window.TAHAWA_BEFORE_INIT || []).push(renderSections);
})();
