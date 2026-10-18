/* =========================================================
   Tahawa clone — main.js (dùng chung cho mọi trang)
   Header sticky, danh mục, menu mobile, carousel, video, giỏ hàng
   (localStorage), captcha + form, tìm kiếm, nút lên đầu trang.
   ========================================================= */
(function () {
  'use strict';

  // URL /exec của trang quản trị (nhận form Liên hệ) - dán sau khi deploy lần đầu, xem gas/README.md.
  var GAS_EXEC_URL = 'https://script.google.com/macros/s/AKfycbwkwoUlH6tZVjZ_BHGBcChEda34UZctWkeqaCSMhjhC7S-9HirQqDESZJq22rqsAFB7/exec';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  /* ---------------- slideToggle (giống jQuery) ---------------- */
  function slideToggle(el, show, done) {
    var start = el.offsetHeight;
    el.style.overflow = 'hidden';
    el.style.display = 'block';
    var end = show ? el.scrollHeight : 0;
    if (show) start = 0;
    el.style.height = start + 'px';
    void el.offsetHeight;
    el.style.transition = 'height 400ms ease';
    el.style.height = end + 'px';
    setTimeout(function () {
      el.style.transition = el.style.height = el.style.overflow = '';
      el.style.display = show ? 'block' : 'none';
      if (done) done();
    }, 410);
  }

  /* ---------------- Danh mục: Xem thêm / Thu gọn ---------------- */
  function bindCategory() {
    document.addEventListener('click', function (e) {
      var more = e.target.closest('.cat-menu .more');
      if (!more) return;
      var expanded = more.classList.toggle('less');
      more.innerHTML = '<a class="more-toggle"> ' + (expanded ? 'Thu gọn' : 'Xem thêm ...') + '</a>';
      $$('.is-hidden', more.parentNode).forEach(function (li) { slideToggle(li, expanded); });
    });
  }

  /* ---------------- Mobile menu ---------------- */
  function setPanelHeight() {
    var panel = $('.m-nav__panel');
    var bar = $('.hm-bar');
    if (!panel || window.innerWidth > 991) return;
    var h = bar.offsetHeight + (bar.classList.contains('is-fixed') ? 0 : $('.topbar').offsetHeight);
    panel.style.height = window.innerHeight - h + 'px';
  }

  function bindMobileMenu() {
    if (!$('.m-nav__toggle')) return;
    $('.m-nav__toggle').addEventListener('click', function (e) {
      e.preventDefault();
      setPanelHeight();
      $('.m-nav').classList.toggle('is-open');
    });
    $('.m-nav__panel').addEventListener('click', function (e) {
      var t = e.target.closest('.m-toggle');
      if (!t) return;
      e.preventDefault();
      var sub = t.nextElementSibling;
      var open = getComputedStyle(sub).display === 'none';
      t.querySelector('i').className = open ? 'fa fa-minus' : 'fa fa-plus';
      slideToggle(sub, open);
    });
  }

  /* ---------------- Sticky header ---------------- */
  function bindSticky() {
    var dBar = $('.hd-bar'), dSpacer = $('.header-desktop .hd-sticky-spacer');
    var mBar = $('.hm-bar'), mSpacer = $('.header-mobile .hd-sticky-spacer');
    var page = $('.page-content') || $('footer');
    if (!dBar || !mBar || !page) return;

    function fix(bar, spacer, on) {
      if (on === bar.classList.contains('is-fixed')) return;
      if (on) {
        spacer.style.height = bar.offsetHeight + 'px';
        spacer.style.display = 'block';
        bar.classList.add('is-fixed');
      } else {
        bar.classList.remove('is-fixed');
        spacer.style.display = 'none';
      }
      setPanelHeight();
    }

    function onScroll() {
      var y = window.pageYOffset;
      if (window.innerWidth >= 992) {
        fix(mBar, mSpacer, false);
        var top = page.getBoundingClientRect().top + y;
        fix(dBar, dSpacer, y > top);
      } else {
        fix(dBar, dSpacer, false);
        var anchor = mBar.classList.contains('is-fixed') ? mSpacer : mBar;
        var t = anchor.getBoundingClientRect().top + y;
        fix(mBar, mSpacer, y > t);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }

  function smoothScrollTo(target, dur) {
    var start = window.pageYOffset, t0 = null;
    dur = dur || 600;
    var ease = function (p) { return 0.5 - Math.cos(p * Math.PI) / 2; }; // jQuery "swing"
    requestAnimationFrame(function stepFn(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      window.scrollTo(0, start + (target - start) * ease(p));
      if (p < 1) requestAnimationFrame(stepFn);
    });
  }

  /* ---------------- Lite YouTube ---------------- */
  function bindYouTube() {
    document.addEventListener('click', function (e) {
      var box = e.target.closest('.lite-yt');
      if (!box || box.classList.contains('is-activated')) return;
      box.classList.add('is-activated');
      var f = document.createElement('iframe');
      f.width = 560; f.height = 315;
      f.title = 'Play';
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      f.allowFullscreen = true;
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(box.dataset.id) + '?autoplay=1';
      box.appendChild(f);
      f.focus();
    });
  }

  /* ---------------- Giỏ hàng (localStorage) ---------------- */
  var CART_KEY = 'tahawa_cart';
  var Cart = {
    get: function () {
      try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; }
    },
    set: function (items) {
      try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) { /* bỏ qua */ }
      Cart.render();
    },
    add: function (item, qty) {
      var items = Cart.get();
      var found = items.filter(function (i) { return i.href === item.href; })[0];
      if (found) found.qty += qty; else { item.qty = qty; items.push(item); }
      Cart.set(items);
    },
    count: function () { return Cart.get().reduce(function (s, i) { return s + i.qty; }, 0); },
    render: function () {
      var n = Cart.count();
      $$('.mini-cart__num').forEach(function (el) { el.textContent = n; });
      document.dispatchEvent(new CustomEvent('cart:change'));
    }
  };
  window.TahawaCart = Cart;

  function itemFrom(el) {
    var src = el.closest('.product-item, .product-detail');
    if (!src) return null;
    return {
      id: src.dataset.id || '',
      name: src.dataset.name || '',
      price: src.dataset.price || '',
      old: src.dataset.old || '',
      disc: src.dataset.disc || '',
      img: src.dataset.img || '',
      href: src.dataset.href || location.pathname
    };
  }

  function bindCart() {
    var timer;
    var notify = $('.notify-cart');
    if (!notify) { Cart.render(); return; }
    function show() {
      notify.style.display = 'block';
      notify.style.opacity = '0';
      notify.style.transition = 'opacity 600ms';
      void notify.offsetWidth;
      notify.style.opacity = '1';
      clearTimeout(timer);
      timer = setTimeout(hide, 3000);
    }
    function hide() {
      notify.style.opacity = '0';
      setTimeout(function () { notify.style.display = 'none'; }, 600);
    }
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.add_to_cart, .buy_now');
      if (btn) {
        e.preventDefault();
        var item = itemFrom(btn);
        if (!item) return;
        var qtyInput = btn.closest('.product-detail') && $('.product-qty', btn.closest('.product-detail'));
        Cart.add(item, Math.max(1, parseInt(qtyInput ? qtyInput.value : 1, 10) || 1));
        if (btn.classList.contains('buy_now')) location.href = '/cart/';
        else show();
        return;
      }
      if (e.target.closest('.notify-cart__close')) hide();
    });
    Cart.render();
  }

  /* ---------------- Captcha (canvas) + form ---------------- */
  function drawCaptcha(canvas) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    var chars = 'abcdefghkmnpqrstuvwxyz23456789';
    var code = '';
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, w, h);
    for (var l = 0; l < 6; l++) {
      ctx.strokeStyle = 'hsl(' + Math.random() * 360 + ',60%,60%)';
      ctx.beginPath();
      ctx.moveTo(Math.random() * w, Math.random() * h);
      ctx.bezierCurveTo(Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h);
      ctx.stroke();
    }
    for (var i = 0; i < 5; i++) {
      var ch = chars[Math.floor(Math.random() * chars.length)];
      code += ch;
      ctx.save();
      ctx.translate(6 + i * (w - 12) / 5, h * 0.72);
      ctx.rotate((Math.random() - 0.5) * 0.6);
      ctx.font = Math.round(h * (0.55 + Math.random() * 0.2)) + 'px Georgia, serif';
      ctx.fillStyle = 'hsl(' + Math.random() * 360 + ',55%,40%)';
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }
    canvas.dataset.code = code;
  }
  window.TahawaCaptcha = drawCaptcha;

  function showFlash(text) {
    var n = $('.notify-cart');
    var t = $('.notify-cart__text'), v = $('.notify-cart__view'), ic = $('.notify-cart__icon i');
    t.textContent = text;
    v.style.display = 'none';
    n.style.display = 'block'; n.style.opacity = '1';
    setTimeout(function () {
      n.style.display = 'none';
      t.textContent = 'Đã thêm vào giỏ hàng';
      v.style.display = '';
      ic.className = 'fas fa-check-circle';
    }, 2500);
  }
  window.TahawaFlash = showFlash;

  function validate(form) {
    var ok = true;
    var canvas = $('.captcha-img', form);
    $$('[required]', form).forEach(function (inp) {
      var v = inp.value.trim();
      var bad = !v;
      if (!bad && inp.type === 'email') bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      if (!bad && inp.name === 'captcha' && canvas) bad = v.toLowerCase() !== canvas.dataset.code;
      inp.classList.toggle('is-invalid', bad);
      if (bad) ok = false;
    });
    return ok;
  }
  window.TahawaValidate = validate;

  function bindForms() {
    $$('.captcha-img').forEach(drawCaptcha);
    document.addEventListener('click', function (e) {
      var r = e.target.closest('.regen-captcha');
      if (!r) return;
      e.preventDefault();
      var c = $('.captcha-img', r.parentNode);
      if (c) drawCaptcha(c);
    });
    document.addEventListener('input', function (e) {
      if (e.target.classList && e.target.classList.contains('is-invalid')) e.target.classList.remove('is-invalid');
    });

    // Form đăng ký tư vấn (footer)
    var nl = $('.newsletter__form');
    if (nl) {
      nl.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validate(nl)) return;
        nl.reset();
        drawCaptcha($('.captcha-img', nl));
        showFlash('Đăng ký thành công!');
      });
    }

    // Các form khác (liên hệ, bình luận, tài khoản) — có thể được pages.js xử lý thêm
    document.addEventListener('submit', function (e) {
      var f = e.target.closest('.js-validate-form');
      if (!f || f.dataset.custom) return;
      e.preventDefault();
      var alert = $('.form-alert', f);
      if (!validate(f)) {
        if (alert) { alert.hidden = false; alert.className = 'form-alert is-error'; alert.textContent = 'Vui lòng nhập đầy đủ và đúng thông tin bắt buộc.'; }
        return;
      }
      if (f.classList.contains('contact-form')) { sendContact(f, alert); return; }
      if (alert) { alert.hidden = false; alert.className = 'form-alert is-success'; alert.textContent = f.dataset.success || 'Gửi thành công!'; }
      resetForm(f);
    });
  }

  function resetForm(f) {
    f.reset();
    var c = $('.captcha-img', f);
    if (c) drawCaptcha(c);
    $$('.rating-input i', f).forEach(function (i) { i.classList.remove('is-on'); });
  }

  // Gửi form (liên hệ, đặt hàng) về trang quản trị. text/plain để là "simple request" (không có
  // preflight OPTIONS - phía nhận không xử lý được). Trả Promise<{ok, error?, id?}>; null nếu
  // chưa cấu hình GAS_EXEC_URL.
  function postToCms(payload) {
    if (/^PASTE_/.test(GAS_EXEC_URL)) return null;
    return fetch(GAS_EXEC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok) {
          var err = new Error((res && res.error) || 'Gửi không thành công');
          err.code = res && res.code;
          throw err;
        }
        return res;
      });
  }
  window.TahawaPost = postToCms;

  // Form liên hệ -> lưu về trang quản trị. Ô _hp là bẫy bot, người thật không thấy.
  function sendContact(f, alert) {
    var say = function (t, ok) {
      if (!alert) return;
      alert.hidden = false;
      alert.className = 'form-alert ' + (ok ? 'is-success' : 'is-error');
      alert.textContent = t;
    };
    var btn = $('[type="submit"]', f);
    var val = function (n) { return f[n] ? String(f[n].value || '').trim() : ''; };
    var req = postToCms({
      formType: 'contact', name: val('name'), email: val('email'), phone: val('phone'),
      message: val('message'), page: location.pathname, _hp: val('_hp'),
    });
    if (!req) {
      console.warn('[contact] chưa cấu hình GAS_EXEC_URL - liên hệ KHÔNG được lưu');
      say(f.dataset.success || 'Gửi thành công!', true);
      resetForm(f);
      return;
    }
    if (btn) btn.disabled = true;
    req
      .then(function () {
        if (window.gtag) window.gtag('event', 'generate_lead', { form: 'contact' });
        say(f.dataset.success || 'Gửi thành công!', true);
        resetForm(f);
      })
      .catch(function (err) {
        say((err && err.message) || 'Gửi không thành công, vui lòng thử lại hoặc gọi hotline.', false);
      })
      .then(function () { if (btn) btn.disabled = false; });
  }

  /* ---------------- Tìm kiếm ---------------- */
  function bindSearch() {
    $$('.search-form').forEach(function (form) {
      var inp = $('input', form);
      var ph = inp.placeholder;
      inp.addEventListener('focus', function () { inp.placeholder = ph; });
      inp.addEventListener('blur', function () { if (!inp.value) inp.placeholder = ph; });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var q = inp.value.trim();
        location.href = '/tim-kiem/' + (q ? '?keyword=' + encodeURIComponent(q) : '');
      });
    });
  }

  /* ---------------- Mục lục (TOC) + link neo ---------------- */
  function bindToc() {
    document.addEventListener('click', function (e) {
      var tg = e.target.closest('.toggleTocList');
      if (tg) {
        e.preventDefault();
        var list = $('#toc-list');
        if (!list) return;
        var hidden = list.style.display === 'none';
        list.style.display = hidden ? '' : 'none';
        tg.textContent = hidden ? 'Ẩn' : 'Hiện';
        return;
      }
      var a = e.target.closest('#toc-list a[href^="#"]');
      if (a) {
        var id = decodeURIComponent(a.getAttribute('href').slice(1));
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        var collapsed = target.closest('.is-collapsed');
        if (collapsed) {
          var btn = $('.btn_collape button', collapsed);
          if (btn) btn.click();
        }
        var offset = $('.hd-bar.is-fixed, .hm-bar.is-fixed') ? 60 : 110;
        smoothScrollTo(target.getBoundingClientRect().top + window.pageYOffset - offset, 1000);
        history.replaceState(null, '', '#' + id);
      }
    });
  }

  /* ---------------- Thanh mua hàng cố định (mobile, trang chi tiết sản phẩm) ---------------- */
  function bindMobileBuyBar() {
    var pd = $('.product-detail');
    if (!pd) return;
    var cta = $('.btn-buy', pd);
    if (!cta) return;
    var priceEl = $('.product-price .new', pd);
    var priceText = priceEl ? priceEl.textContent.trim() : (pd.dataset.price || '');
    var code = pd.dataset.id || '';

    document.body.classList.add('has-mobile-buybar');
    var bar = document.createElement('div');
    bar.className = 'mobile-buybar';
    bar.innerHTML =
      '<div class="mobile-buybar__cell">' +
        '<span class="mobile-buybar__label">Giá</span>' +
        '<span class="mobile-buybar__value">' + esc(priceText) + '</span>' +
      '</div>' +
      '<button type="button" class="mobile-buybar__buy">' + cta.innerHTML + '</button>' +
      '<div class="mobile-buybar__cell">' +
        '<span class="mobile-buybar__label">Mã sản phẩm</span>' +
        '<span class="mobile-buybar__value">' + esc(code) + '</span>' +
      '</div>';
    document.body.appendChild(bar);

    $('.mobile-buybar__buy', bar).addEventListener('click', function () { cta.click(); });
  }

  /* ---------------- Init ---------------- */
  document.addEventListener('DOMContentLoaded', function () {
    (window.TAHAWA_BEFORE_INIT || []).forEach(function (fn) { fn(); });
    if (window.TahawaCarousel) $$('.carousel').forEach(function (el) { new window.TahawaCarousel(el); });
    bindCategory();
    bindMobileMenu();
    bindSticky();
    bindYouTube();
    bindCart();
    bindForms();
    bindSearch();
    bindToc();
    bindMobileBuyBar();
    window.addEventListener('resize', setPanelHeight);
  });

  window.TahawaUtil = { $: $, $$: $$, esc: esc, slideToggle: slideToggle, smoothScrollTo: smoothScrollTo };
})();
