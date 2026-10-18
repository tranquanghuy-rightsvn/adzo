/* =========================================================
   Tahawa clone — pages.js (các trang trong)
   Gallery + lightbox, số lượng, tab, thu gọn nội dung, đánh giá sao,
   sắp xếp sản phẩm, cuộn vô hạn tin tức, giỏ hàng, checkout, tài khoản, tìm kiếm.
   ========================================================= */
(function () {
  'use strict';
  var U = window.TahawaUtil || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var money = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'VND'; };
  var parseMoney = function (s) { return parseInt(String(s || '').replace(/\D/g, ''), 10) || 0; };

  /* ---------------- Gallery sản phẩm ---------------- */
  function bindGallery() {
    var root = $('.pd-gallery');
    if (!root) return;
    var mains = $$('.img-main-href', root);
    function show(i) {
      mains.forEach(function (a, k) { a.hidden = k !== i; });
      $$('.pd-thumb', root).forEach(function (t) { t.classList.toggle('is-current', Number(t.dataset.index) === i); });
    }
    root.addEventListener('click', function (e) {
      var th = e.target.closest('.pd-thumb');
      if (th) { e.preventDefault(); show(Number(th.dataset.index)); return; }
      var m = e.target.closest('.img-main-href');
      if (m) { e.preventDefault(); openLightbox(mains.map(function (a) { return a.getAttribute('href'); }), Number(m.dataset.index)); }
    });
  }

  /* Lightbox (thay fancybox) */
  function openLightbox(srcs, index) {
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML = '<div class="lightbox__bar"><span class="lightbox__count"></span><button type="button" class="lightbox__close" aria-label="Đóng"><i class="fas fa-times"></i></button></div>' +
      '<button type="button" class="lightbox__nav lightbox__prev" aria-label="Trước"><i class="fas fa-arrow-left"></i></button>' +
      '<div class="lightbox__stage"><img alt=""></div>' +
      '<button type="button" class="lightbox__nav lightbox__next" aria-label="Sau"><i class="fas fa-arrow-right"></i></button>';
    document.body.appendChild(box);
    document.documentElement.classList.add('lightbox-open');
    var img = $('img', box);
    function go(i) {
      index = (i + srcs.length) % srcs.length;
      img.classList.remove('is-in'); void img.offsetWidth;
      img.src = srcs[index];
      img.classList.add('is-in');
      $('.lightbox__count', box).textContent = (index + 1) + ' / ' + srcs.length;
      $$('.lightbox__nav', box).forEach(function (b) { b.hidden = srcs.length < 2; });
    }
    function close() {
      box.classList.remove('is-open');
      document.documentElement.classList.remove('lightbox-open');
      document.removeEventListener('keydown', key);
      setTimeout(function () { box.remove(); }, 300);
    }
    function key(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') go(index - 1);
      if (e.key === 'ArrowRight') go(index + 1);
    }
    box.addEventListener('click', function (e) {
      if (e.target.closest('.lightbox__close') || e.target === box || e.target.classList.contains('lightbox__stage')) close();
      else if (e.target.closest('.lightbox__prev')) go(index - 1);
      else if (e.target.closest('.lightbox__next')) go(index + 1);
    });
    document.addEventListener('keydown', key);
    go(index);
    requestAnimationFrame(function () { box.classList.add('is-open'); });
  }

  /* ---------------- Số lượng ---------------- */
  function bindQty() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest('.qty-up, .qty-down');
      if (!b || b.closest('.cart-item')) return;
      e.preventDefault();
      var inp = $('input', b.parentNode);
      var v = parseInt(inp.value, 10) || 1;
      inp.value = b.classList.contains('qty-up') ? v + 1 : Math.max(1, v - 1);
    });
  }

  /* ---------------- Tabs + thu gọn nội dung ---------------- */
  function bindTabs() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('.detail-tabs .tab-item');
      if (!a) return;
      e.preventDefault();
      $$('.detail-tabs .tab-item').forEach(function (x) { x.classList.toggle('active', x === a); });
      $$('.detail-tabs .tab-pane').forEach(function (p) { p.classList.toggle('active', p.id === a.dataset.tab); });
    });
  }
  function bindCollapse() {
    $$('[data-collapse="1"]').forEach(function (el) {
      if (el.scrollHeight <= 200) return;
      el.classList.add('is-collapsed');
      var wrap = document.createElement('div');
      wrap.className = 'btn_collape';
      wrap.innerHTML = '<button type="button" class="btn-outline-info">Xem tất cả</button>';
      el.appendChild(wrap);
      wrap.addEventListener('click', function () {
        var collapsed = el.classList.toggle('is-collapsed');
        el.classList.toggle('is-expanded', !collapsed);
        $('button', wrap).textContent = collapsed ? 'Xem tất cả' : 'Thu gọn';
        if (collapsed && U.smoothScrollTo) U.smoothScrollTo(el.getBoundingClientRect().top + window.pageYOffset - 120, 400);
      });
    });
  }

  /* ---------------- Thu gọn "Tin cho bạn" ở sidebar ---------------- */
  function bindSidebarPosts() {
    var LIMIT = 3;
    $$('.sb-posts .sb-content').forEach(function (box) {
      var items = $$('.post-item', box);
      if (items.length <= LIMIT) return;
      var hidden = items.slice(LIMIT);
      hidden.forEach(function (it) { it.hidden = true; });
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sb-posts__toggle';
      var moreText = 'Xem thêm (' + hidden.length + ')';
      btn.textContent = moreText;
      box.appendChild(btn);
      var expanded = false;
      btn.addEventListener('click', function () {
        expanded = !expanded;
        hidden.forEach(function (it) { it.hidden = !expanded; });
        btn.textContent = expanded ? 'Thu gọn' : moreText;
        if (!expanded && U.smoothScrollTo) U.smoothScrollTo(box.getBoundingClientRect().top + window.pageYOffset - 120, 400);
      });
    });
  }

  /* ---------------- Đánh giá sao ---------------- */
  function bindRating() {
    $$('.rating-input').forEach(function (box) {
      var stars = $$('i', box);
      var input = box.parentNode.querySelector('input[name=review]');
      var paint = function (n) { stars.forEach(function (s, i) { s.classList.toggle('is-on', i < n); }); };
      box.addEventListener('mouseover', function (e) { var s = e.target.closest('i'); if (s) paint(Number(s.dataset.value)); });
      box.addEventListener('mouseleave', function () { paint(Number(input.value) || 0); });
      box.addEventListener('click', function (e) { var s = e.target.closest('i'); if (s) { input.value = s.dataset.value; paint(Number(s.dataset.value)); } });
    });
  }

  /* ---------------- Sắp xếp sản phẩm ---------------- */
  function bindSort() {
    var sel = $('.select_products');
    var grid = $('.product-grid--cat');
    if (!sel || !grid) return;
    var cols = $$('.cat-col', grid);
    function apply(v) {
      var arr = cols.slice();
      var price = function (c) { return parseMoney(($('.price .new', c) || {}).textContent) || Infinity; };
      if (v === 'sort_price=desc') arr.sort(function (a, b) { return (price(b) === Infinity ? -1 : price(b)) - (price(a) === Infinity ? -1 : price(a)); });
      else if (v === 'sort_price=asc') arr.sort(function (a, b) { return price(a) - price(b); });
      else if (v === 'sort_date=asc') arr.sort(function (a, b) { return b.dataset.order - a.dataset.order; });
      else arr.sort(function (a, b) { return a.dataset.order - b.dataset.order; });
      arr.forEach(function (c) { grid.appendChild(c); });
    }
    var q = new URLSearchParams(location.search);
    ['sort_price', 'sort_date'].forEach(function (k) { if (q.get(k)) { sel.value = k + '=' + q.get(k); apply(sel.value); } });
    sel.addEventListener('change', function () {
      if (sel.value === 'null') return;
      var kv = sel.value.split('=');
      var url = new URL(location.href);
      url.searchParams.delete('sort_price'); url.searchParams.delete('sort_date');
      url.searchParams.set(kv[0], kv[1]);
      history.replaceState(null, '', url);
      apply(sel.value);
    });
  }

  /* ---------------- Cuộn vô hạn (danh mục tin tức) ---------------- */
  function bindInfinite() {
    var list = $('.post-list-view');
    if (!list || !list.dataset.next) return;
    var loading = false;
    var loader = $('.pagging .loading');
    function check() {
      var next = list.dataset.next;
      if (!next || loading) return;
      var pag = $('.pagging');
      // giống bản gốc: tải khi scrollTop >= offsetTop(.pagging) - 400
      if (window.pageYOffset < pag.getBoundingClientRect().top + window.pageYOffset - 400) return;
      loading = true;
      loader.hidden = false;
      fetch(next).then(function (r) { return r.text(); }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var items = $$('.post-list-view .post-col', doc);
        items.forEach(function (it) { list.appendChild(document.importNode(it, true)); });
        var nl = $('.post-list-view', doc);
        list.dataset.next = nl ? nl.dataset.next || '' : '';
      }).catch(function () { list.dataset.next = ''; }).then(function () {
        loading = false;
        loader.hidden = true;
        if (!list.dataset.next) $('.pagging').classList.add('disabled');
      });
    }
    window.addEventListener('scroll', check, { passive: true });
    check();
  }

  /* ---------------- Giỏ hàng ---------------- */
  function bindCartPage() {
    var root = $('[data-cart-root]');
    if (!root || !window.TahawaCart) return;
    var C = window.TahawaCart;
    function render() {
      var items = C.get();
      var cont = $('.cart-continue');
      if (!items.length) {
        root.innerHTML = '<div class="cart-empty alert-danger">Chưa có sản phẩm nào trong giỏ hàng</div>';
        root.parentNode.appendChild(cont);
        return;
      }
      var total = items.reduce(function (s, i) { return s + parseMoney(i.price) * i.qty; }, 0);
      root.innerHTML = '<div class="cart-layout"><div class="cart-left"><div class="cart-item-data">' +
        items.map(function (it, idx) {
          return '<div class="cart-item" data-idx="' + idx + '">' +
            '<div class="ci-del"><a href="#" class="delete">Xóa</a></div>' +
            '<div class="ci-img"><img src="' + esc(it.img) + '" alt="' + esc(it.name) + '"></div>' +
            '<div class="ci-body"><div class="ci-title"><a class="title-cart" href="' + esc(it.href) + '" target="_blank">' + esc(it.name) + '</a></div>' +
            '<div class="ci-price"><strong>' + esc(it.price || 'Liên hệ') + '</strong>' + (it.old ? '<p class="price-note"><del>' + esc(it.old) + '</del> <span>' + esc(it.disc || '') + '</span></p>' : '') + '</div>' +
            '<div class="ci-qty"><div class="product-quantity-control"><button type="button" class="qty-down" aria-label="Giảm"><i class="fas fa-minus"></i></button><input type="number" min="1" value="' + it.qty + '" class="product-qty" aria-label="Số lượng"><button type="button" class="qty-up" aria-label="Tăng"><i class="fas fa-plus"></i></button></div></div></div>' +
          '</div>';
        }).join('') + '</div><div class="cart-continue-slot"></div></div>' +
        '<div class="cart-right"><table class="cart-total"><tbody>' +
          '<tr><td>Tạm tính: </td><td class="text-right">' + money(total) + '</td></tr>' +
          '<tr><td colspan="2" class="coupon-cell"><p>Mã giảm giá / Quà tặng</p><div class="input-group"><input type="text" class="form-control" placeholder="Nhập ở đây" id="coupon_code"><button type="button" class="btn-apply" disabled>Áp dụng</button></div><p class="coupon-msg" hidden></p></td></tr>' +
          '<tr><td class="total-label">Thành tiền:</td><td class="text-right total-value">' + money(total) + '</td></tr>' +
          '<tr><td colspan="2"><a class="checkout-button" href="/checkout/">Tiến hành đặt hàng <i class="fa fa-arrow-right"></i></a></td></tr>' +
          '<tr><td colspan="2" class="fast-order"><div class="fast-order-note">Mua nhanh bằng số điện thoại</div><form class="fast-order-form"><span class="hp-field" aria-hidden="true"><input type="text" name="_hp" tabindex="-1" autocomplete="off"></span><div class="input-group"><input type="tel" class="form-control" placeholder="Số điện thoại" name="phone" required><button class="btn-apply" type="submit" disabled>Mua ngay</button></div></form></td></tr>' +
        '</tbody></table></div></div>';
      $('.cart-continue-slot', root).appendChild(cont);
    }
    root.addEventListener('click', function (e) {
      var row = e.target.closest('.cart-item');
      if (!row) return;
      var items = C.get(), idx = Number(row.dataset.idx);
      if (e.target.closest('.delete')) { e.preventDefault(); items.splice(idx, 1); C.set(items); render(); return; }
      var b = e.target.closest('.qty-up, .qty-down');
      if (b) { items[idx].qty = Math.max(1, items[idx].qty + (b.classList.contains('qty-up') ? 1 : -1)); C.set(items); render(); }
    });
    root.addEventListener('change', function (e) {
      var row = e.target.closest('.cart-item');
      if (!row || !e.target.classList.contains('product-qty')) return;
      var items = C.get();
      items[Number(row.dataset.idx)].qty = Math.max(1, parseInt(e.target.value, 10) || 1);
      C.set(items); render();
    });
    root.addEventListener('input', function (e) {
      if (e.target.id === 'coupon_code') e.target.parentNode.querySelector('button').disabled = !e.target.value.trim();
      if (e.target.name === 'phone') e.target.parentNode.querySelector('button').disabled = !/^0\d{9}$/.test(e.target.value.trim());
    });
    root.addEventListener('click', function (e) {
      var ap = e.target.closest('.coupon-cell .btn-apply');
      if (!ap) return;
      var msg = $('.coupon-msg', root);
      msg.hidden = false;
      msg.textContent = 'Mã giảm giá không hợp lệ hoặc đã hết hạn';
    });
    root.addEventListener('submit', function (e) {
      var f = e.target;
      if (!f.classList.contains('fast-order-form')) return;
      e.preventDefault();
      var btn = $('button', f);
      var done = function (id) {
        C.set([]); render();
        if (window.TahawaFlash) window.TahawaFlash('Đặt hàng thành công' + (id ? ' (mã ' + id + ')' : '') + '! Chúng tôi sẽ gọi lại cho bạn.');
      };
      // Mua nhanh: chỉ có SĐT, đơn gửi về trang quản trị để nhân viên gọi lại.
      var req = window.TahawaPost && window.TahawaPost({
        formType: 'order', source: 'fast', phone: f.phone.value.trim(), _hp: f._hp ? f._hp.value : '',
        items: orderItems(C.get()),
      });
      if (!req) return done();
      btn.disabled = true;
      req.then(function (res) { done(res.id); })
        .catch(function (err) {
          var note = $('.fast-order-note', root);
          note.textContent = (err && err.message) || 'Đặt hàng không thành công, vui lòng gọi hotline.';
          note.style.color = '#dc3545';
          btn.disabled = false;
        });
    });
    render();
  }

  // Dữ liệu giỏ -> dòng đơn gửi đi. Giá chỉ để tham khảo: phía nhận tính lại theo giá sản phẩm.
  function orderItems(items) {
    return items.map(function (i) { return { id: i.id, href: i.href, name: i.name, price: i.price, qty: i.qty }; });
  }

  /* ---------------- Checkout ---------------- */
  function bindCheckout() {
    var form = $('#checkout-order-form');
    if (!form || !window.TahawaCart) return;
    var C = window.TahawaCart;
    var items = C.get();
    var total = items.reduce(function (s, i) { return s + parseMoney(i.price) * i.qty; }, 0);
    var count = items.reduce(function (s, i) { return s + i.qty; }, 0);
    $('[data-checkout-count]').textContent = count ? '(' + count + ' sản phẩm)' : '';
    $('[data-checkout-items]').innerHTML = items.length ? items.map(function (it) {
      return '<div class="co-item"><div class="co-thumb"><img src="' + esc(it.img) + '" alt=""><span>' + it.qty + '</span></div>' +
        '<div class="co-detail"><a href="' + esc(it.href) + '" target="_blank">' + esc(it.name) + '</a>' +
        '<div class="co-price"><span>' + esc(it.price || 'Liên hệ') + ' × ' + it.qty + '</span><strong>' + (parseMoney(it.price) ? money(parseMoney(it.price) * it.qty) : 'Liên hệ') + '</strong></div></div></div>';
    }).join('') : '<p class="co-empty">Chưa có sản phẩm nào trong giỏ hàng. <a href="/">Tiếp tục mua hàng</a></p>';
    $$('[data-checkout-total]').forEach(function (el) { el.textContent = money(total); });

    // Tỉnh / Quận / Phường (JSON tĩnh, giống API gốc)
    function fill(sel, list, ph) {
      sel.innerHTML = '<option value="">' + ph + '</option>' + list.map(function (x) { return '<option data-id="' + x.id + '" value="' + esc(x.name) + '">' + esc(x.name) + '</option>'; }).join('');
    }
    var p = $('#province'), d = $('#district'), w = $('#ward');
    fetch('/assets/data/provinces.json').then(function (r) { return r.json(); }).then(function (list) { fill(p, list, p.options[0].text); });
    p.addEventListener('change', function () {
      var o = p.selectedOptions[0];
      fill(w, [], w.options[0].text);
      if (!o || !o.dataset.id) return fill(d, [], d.options[0].text);
      fetch('/assets/data/districts/' + o.dataset.id + '.json').then(function (r) { return r.json(); }).then(function (l) { fill(d, l, d.options[0].text); });
    });
    d.addEventListener('change', function () {
      var o = d.selectedOptions[0];
      if (!o || !o.dataset.id) return fill(w, [], w.options[0].text);
      fetch('/assets/data/wards/' + o.dataset.id + '.json').then(function (r) { return r.json(); }).then(function (l) { fill(w, l, w.options[0].text); });
    });

    // Thanh toán: chọn chuyển khoản thì hiện QR + số tài khoản
    var bank = $('[data-bank]');
    var payment = function () { var r = $('input[name="payment"]:checked', form); return r ? r.value : 'COD'; };
    $$('input[name="payment"]', form).forEach(function (r) {
      r.addEventListener('change', function () { bank.hidden = payment() !== 'BANK'; });
    });
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-copy-btn]');
      if (!b) return;
      var text = b.parentNode.querySelector('[data-copy]').textContent.trim();
      var ok = function () { b.textContent = 'Đã chép'; setTimeout(function () { b.textContent = 'Sao chép'; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, function () {}); else ok();
    });

    $('#coupon_code').addEventListener('input', function () { $('#check-coupon').disabled = !this.value.trim(); });
    $('#check-coupon').addEventListener('click', function () { var m = $('.coupon-msg'); m.hidden = false; m.textContent = 'Mã giảm giá không hợp lệ hoặc đã hết hạn'; });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      $$('[required]', form).forEach(function (i) {
        var bad = !i.value.trim() || (i.name === 'phone' && !/^0\d{9}$/.test(i.value.replace(/\s|\./g, '')));
        i.classList.toggle('is-invalid', bad);
        if (bad) ok = false;
      });
      var msg = $('.checkout-msg');
      var fail = function (t) { msg.hidden = false; msg.className = 'checkout-msg is-error'; msg.textContent = t; };
      if (!items.length) return fail('Giỏ hàng của bạn đang trống.');
      if (!ok) return fail('Vui lòng nhập đầy đủ và đúng các thông tin bắt buộc (*).');
      var val = function (n) { return form[n] ? String(form[n].value || '').trim() : ''; };
      var pay = payment();
      var done = function (id) {
        C.set([]);
        var bankHtml = '';
        if (pay === 'BANK') {
          var box = bank.cloneNode(true);
          box.hidden = false;
          $('[data-bank-content]', box).innerHTML = '<b>' + esc(id || val('phone')) + '</b>';
          bankHtml = '<p>Vui lòng chuyển khoản <strong>' + money(total) + '</strong> với nội dung là mã đơn hàng:</p>' + box.outerHTML;
        }
        form.innerHTML = '<div class="checkout-done"><i class="fas fa-check-circle"></i><h2>Đặt hàng thành công!</h2>' +
          (id ? '<div class="co-order-code">Mã đơn: ' + esc(id) + '</div>' : '') + bankHtml +
          '<p>Cảm ơn bạn đã mua hàng tại Adzco. Chúng tôi sẽ gọi điện xác nhận đơn trong thời gian sớm nhất.</p>' +
          '<a href="/" class="btn-send">Tiếp tục mua hàng</a></div>';
        var cur = $('.co-steps .is-current');
        if (cur) { cur.classList.remove('is-current'); cur.nextElementSibling.classList.add('is-current'); }
        window.scrollTo(0, 0);
      };
      var req = window.TahawaPost && window.TahawaPost({
        formType: 'order', source: 'checkout',
        name: val('name'), email: val('email'), phone: val('phone').replace(/\s|\./g, ''),
        address: [val('address'), val('ward'), val('district'), val('province')].filter(Boolean).join(', '),
        note: val('note'), payment: pay, _hp: form._hp ? form._hp.value : '',
        items: orderItems(items),
      });
      if (!req) return done();
      var btn = $('#submit-order');
      btn.disabled = true;
      btn.textContent = 'Đang gửi đơn...';
      msg.hidden = true;
      req.then(function (res) { done(res.id); })
        .catch(function (err) {
          fail((err && err.message) || 'Đặt hàng không thành công, vui lòng thử lại hoặc gọi hotline.');
          btn.disabled = false;
          btn.textContent = 'Đặt hàng';
        });
    });
  }

  /* ---------------- Tài khoản (lưu cục bộ) ---------------- */
  function bindAccount() {
    var f = $('.account-form');
    if (!f) return;
    f.dataset.custom = '1';
    var KEY = 'tahawa_users';
    var users = function () { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var alert = $('.form-alert', f);
      var say = function (t, ok) { alert.hidden = false; alert.className = 'form-alert ' + (ok ? 'is-success' : 'is-error'); alert.textContent = t; };
      if (!window.TahawaValidate(f)) return say('Vui lòng nhập đầy đủ và đúng thông tin bắt buộc.', false);
      var email = f.email.value.trim().toLowerCase();
      if (f.dataset.kind === 'register') {
        if (f.password.value.length < 6) return say('Mật khẩu phải có ít nhất 6 ký tự.', false);
        if (f.password.value !== f.password_confirmation.value) return say('Mật khẩu nhập lại không khớp.', false);
        var list = users();
        if (list.some(function (u) { return u.email === email; })) return say('Email này đã được đăng ký.', false);
        list.push({ email: email, name: f.fullname.value.trim(), pass: btoa(unescape(encodeURIComponent(f.password.value))) });
        try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (err) { /* bỏ qua */ }
        say('Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.', true);
        f.reset();
        var c = $('.captcha-img', f); if (c) window.TahawaCaptcha(c);
      } else {
        var u = users().filter(function (x) { return x.email === email && x.pass === btoa(unescape(encodeURIComponent(f.password.value))); })[0];
        if (!u) return say('Email hoặc mật khẩu không chính xác.', false);
        say('Đăng nhập thành công! Xin chào ' + u.name + '.', true);
      }
    });
  }

  /* ---------------- Tìm kiếm ---------------- */
  function bindSearchPage() {
    var box = $('[data-search-results]');
    if (!box || !window.TAHAWA_SEARCH) return;
    var q = (new URLSearchParams(location.search).get('keyword') || '').trim();
    var norm = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd'); };
    var terms = norm(q).split(/\s+/).filter(Boolean);
    var res = terms.length ? window.TAHAWA_SEARCH.filter(function (p) { var n = norm(p.name); return terms.every(function (t) { return n.indexOf(t) > -1; }); }) : [];
    $('[data-search-title]').textContent = q ? 'Kết quả tìm kiếm cho "' + q + '" (' + res.length + ')' : 'Tìm kiếm';
    $$('.search-form input').forEach(function (i) { i.value = q; });
    $('.search-empty').hidden = res.length > 0 || !q;
    box.innerHTML = res.map(function (p, i) {
      var price = p.price ? '<p class="price"><strong class="new">' + esc(p.price) + '</strong>' + (p.old ? ' <span class="old">' + esc(p.old) + '</span>' : '') + (p.disc ? ' <span class="label-discount">' + esc(p.disc) + '</span>' : '') + ' </p>' : '';
      var btns = p.btn === 'contact'
        ? '<a href="/lien-he/" class="btn-item btn-contact"><i class="fa fa-phone-alt"></i> <span>Liên hệ</span></a>'
        : '<div class="product-buttons-group"><button type="button" class="btn-item add_to_cart"><i class="fa fa-shopping-cart"></i> <span>Thêm vào giỏ hàng</span></button></div>';
      return '<div class="cat-col" data-order="' + i + '"><div class="product-item" data-name="' + esc(p.name) + '" data-price="' + esc(p.price || '') + '" data-old="' + esc(p.old || '') + '" data-disc="' + esc(p.disc || '') + '" data-img="' + esc(p.img || '') + '" data-href="' + esc(p.href) + '"><figure class="photoframe">' +
        '<div class="img-product"><a href="' + esc(p.href) + '"><img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" loading="lazy"></a><div class="img-btns"></div></div>' +
        '<figcaption class="infor-product"><h3 class="product-title"><a href="' + esc(p.href) + '" class="two-lines">' + esc(p.name) + '</a></h3>' +
        (p.price ? '<div class="review"><i class="fa fa-star is-on"></i><i class="fa fa-star is-on"></i><i class="fa fa-star is-on"></i><i class="fa fa-star is-on"></i><i class="fa fa-star is-on"></i></div>' : '') +
        price + '<div class="btn-purchased">' + btns + '</div></figcaption></figure></div></div>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindGallery();
    bindQty();
    bindTabs();
    bindCollapse();
    bindSidebarPosts();
    bindRating();
    bindSort();
    bindInfinite();
    bindCartPage();
    bindCheckout();
    bindAccount();
    bindSearchPage();
  });
})();
