/* =========================================================
   Carousel thuần JS — tái hiện hành vi Owl Carousel của trang gốc:
   loop, autoplay (dừng khi hover), nav, dots theo trang, kéo chuột/vuốt,
   responsive items (0/576/768/992), fade khi chỉ có 1 item, smartSpeed 500ms.
   ========================================================= */
(function () {
  'use strict';

  var BREAKPOINTS = [0, 576, 768, 992];
  var SPEED = 500;

  function Carousel(el) {
    this.el = el;
    var d = el.dataset;
    this.itemsCfg = (d.items || '1,1,1,1').split(',').map(Number);
    this.margin = Number(d.margin || 0);
    this.loopCfg = d.loop === 'true';
    this.autoplay = Number(d.autoplay || 0);
    this.useDots = d.dots === 'true';
    this.useNav = d.nav !== 'false';
    this.fadeCfg = d.fade === 'true';
    this.slides = Array.prototype.slice.call(el.children);
    this.count = this.slides.length;
    this.index = 0; // index thực (0..count-1)
    this.pos = 0; // vị trí trong stage (gồm clone)
    this.build();
    this.refresh();
    this.bind();
    this.play();
  }

  Carousel.prototype.build = function () {
    var el = this.el;
    el.classList.add('carousel');
    this.outer = document.createElement('div');
    this.outer.className = 'carousel__outer';
    this.stage = document.createElement('div');
    this.stage.className = 'carousel__stage';
    this.outer.appendChild(this.stage);
    el.appendChild(this.outer);

    if (this.useNav) {
      this.nav = document.createElement('div');
      this.nav.className = 'carousel__nav';
      this.nav.innerHTML =
        '<button type="button" class="carousel__prev" aria-label="Trước"><i class="fas fa-angle-left"></i></button>' +
        '<button type="button" class="carousel__next" aria-label="Sau"><i class="fas fa-angle-right"></i></button>';
      el.appendChild(this.nav);
    }
    if (this.useDots) {
      this.dots = document.createElement('div');
      this.dots.className = 'carousel__dots';
      el.appendChild(this.dots);
    }
  };

  Carousel.prototype.itemsForWidth = function () {
    var w = window.innerWidth, n = this.itemsCfg[0];
    for (var i = 0; i < BREAKPOINTS.length; i++) if (w >= BREAKPOINTS[i] && this.itemsCfg[i]) n = this.itemsCfg[i];
    return n;
  };

  Carousel.prototype.refresh = function () {
    var items = this.itemsForWidth();
    var changed = items !== this.items;
    this.items = items;
    this.loop = this.loopCfg && this.count > items;
    this.fade = this.fadeCfg && items === 1;
    this.el.classList.toggle('carousel--fade', this.fade);

    if (changed || !this.wrappers) this.render();
    this.layout();
    if (this.nav) this.nav.style.display = this.count > items ? '' : 'none';
    this.renderDots();
    this.go(this.index, false);
  };

  Carousel.prototype.wrap = function (node, clone) {
    var w = document.createElement('div');
    w.className = 'carousel__item' + (clone ? ' is-clone' : '');
    w.appendChild(clone ? node.cloneNode(true) : node);
    if (clone) w.setAttribute('aria-hidden', 'true');
    return w;
  };

  Carousel.prototype.render = function () {
    var self = this;
    this.stage.innerHTML = '';
    this.wrappers = [];
    var cloneN = this.loop && !this.fade ? this.items : 0;
    this.cloneN = cloneN;
    var i;
    for (i = this.count - cloneN; i < this.count; i++) this.stage.appendChild(this.wrap(this.slides[i], true));
    this.slides.forEach(function (s) {
      var w = self.wrap(s, false);
      self.wrappers.push(w);
      self.stage.appendChild(w);
    });
    for (i = 0; i < cloneN; i++) this.stage.appendChild(this.wrap(this.slides[i], true));
    this.all = Array.prototype.slice.call(this.stage.children);
  };

  Carousel.prototype.layout = function () {
    var outerW = this.outer.clientWidth;
    var items = this.items, m = this.margin;
    this.itemW = (outerW - m * (items - 1)) / items;
    var self = this;
    this.all.forEach(function (w) {
      w.style.width = self.fade ? '100%' : self.itemW + 'px';
      w.style.marginRight = self.fade ? '0' : m + 'px';
    });
    this.stage.style.width = this.fade ? '100%' : (this.itemW + m) * this.all.length + 'px';
  };

  Carousel.prototype.pages = function () {
    return Math.ceil(this.count / this.items);
  };

  Carousel.prototype.renderDots = function () {
    if (!this.dots) return;
    var n = this.count > this.items ? this.pages() : 0;
    var html = '';
    for (var i = 0; i < n; i++) html += '<button type="button" class="carousel__dot" data-page="' + i + '" aria-label="Trang ' + (i + 1) + '"><span></span></button>';
    this.dots.innerHTML = html;
    this.dots.style.display = n ? '' : 'none';
  };

  Carousel.prototype.updateDots = function () {
    if (!this.dots) return;
    var page = Math.floor(this.index / this.items);
    if (!this.loop && this.index >= this.maxIndex()) page = this.pages() - 1;
    Array.prototype.forEach.call(this.dots.children, function (d, i) {
      d.classList.toggle('is-active', i === page);
    });
  };

  Carousel.prototype.translate = function (pos, animate) {
    this.stage.style.transition = animate ? 'transform ' + SPEED + 'ms ease' : 'none';
    this.stage.style.transform = 'translate3d(' + -pos * (this.itemW + this.margin) + 'px,0,0)';
  };

  Carousel.prototype.maxIndex = function () {
    return this.loop ? this.count - 1 : Math.max(0, this.count - this.items);
  };

  /* Đi tới index thực (0..count-1). */
  Carousel.prototype.go = function (target, animate) {
    if (this.fade) return this.fadeTo(((target % this.count) + this.count) % this.count, animate);
    if (this.loop) {
      target = ((target % this.count) + this.count) % this.count;
      this.moveTo(this.cloneN + target, animate);
    } else {
      this.moveTo(Math.max(0, Math.min(this.maxIndex(), target)), animate);
    }
  };

  /* Di chuyển stage tới vị trí pos (tính cả clone). Với loop, sau khi trượt vào vùng clone sẽ nhảy về phần tử thật. */
  Carousel.prototype.moveTo = function (pos, animate) {
    var self = this;
    clearTimeout(this._reset);
    this.pos = pos;
    this.index = this.loop ? (((pos - this.cloneN) % this.count) + this.count) % this.count : pos;
    this.translate(pos, animate);
    if (this.loop) {
      var real = this.cloneN + this.index;
      if (real !== pos) {
        var fix = function () {
          self.pos = real;
          self.translate(real, false);
          self.markActive();
        };
        if (animate) this._reset = setTimeout(fix, SPEED);
        else fix();
      }
    }
    this.markActive();
    this.updateDots();
  };

  Carousel.prototype.markActive = function () {
    var start = this.pos;
    var self = this;
    this.all.forEach(function (w, i) {
      w.classList.toggle('is-active', i >= start && i < start + self.items);
    });
  };

  Carousel.prototype.fadeTo = function (target, animate) {
    var prev = this.wrappers[this.index];
    var next = this.wrappers[target];
    this.wrappers.forEach(function (w) { w.classList.remove('is-fade-in', 'is-fade-out'); });
    if (animate && prev !== next) {
      prev.classList.add('is-fade-out');
      next.classList.add('is-fade-in');
      clearTimeout(this._fadeT);
      this._fadeT = setTimeout(function () {
        prev.classList.remove('is-fade-out');
        next.classList.remove('is-fade-in');
      }, 1000);
    }
    this.wrappers.forEach(function (w) { w.classList.toggle('is-active', w === next); });
    this.index = target;
    this.updateDots();
  };

  Carousel.prototype.step = function (n, animate) {
    if (this.count <= this.items || !n) return;
    if (this.fade) return this.fadeTo((((this.index + n) % this.count) + this.count) % this.count, animate !== false);
    if (this.loop) {
      // nếu đang ở giữa animation reset thì về vị trí thật trước
      var real = this.cloneN + this.index;
      if (this.pos !== real) { this.translate(real, false); this.pos = real; void this.stage.offsetWidth; }
      var n2 = Math.max(-this.cloneN, Math.min(this.cloneN, n));
      this.moveTo(this.pos + n2, animate !== false);
    } else {
      this.moveTo(Math.max(0, Math.min(this.maxIndex(), this.index + n)), animate !== false);
    }
  };

  Carousel.prototype.next = function () { this.step(1); };
  Carousel.prototype.prev = function () { this.step(-1); };

  Carousel.prototype.play = function () {
    var self = this;
    this.stop();
    if (!this.autoplay || this.count <= this.items || this.hover) return;
    this.timer = setInterval(function () {
      if (!document.hidden) self.next();
    }, this.autoplay);
  };

  Carousel.prototype.stop = function () {
    clearInterval(this.timer);
  };

  Carousel.prototype.bind = function () {
    var self = this;
    if (this.nav) {
      this.nav.querySelector('.carousel__prev').addEventListener('click', function () { self.prev(); self.play(); });
      this.nav.querySelector('.carousel__next').addEventListener('click', function () { self.next(); self.play(); });
    }
    if (this.dots) {
      this.dots.addEventListener('click', function (e) {
        var b = e.target.closest('.carousel__dot');
        if (!b) return;
        var page = Number(b.dataset.page);
        var t = Math.min(page * self.items, self.loop ? self.count - 1 : self.maxIndex());
        self.go(t, true);
        self.play();
      });
    }
    // autoplayHoverPause
    this.el.addEventListener('mouseenter', function () { self.hover = true; self.stop(); });
    this.el.addEventListener('mouseleave', function () { self.hover = false; self.play(); });

    // Kéo chuột / vuốt
    var startX = 0, startY = 0, dx = 0, dragging = false, moved = false, basePx = 0, pid = null;
    this.outer.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || self.count <= self.items) return;
      dragging = true; moved = false; dx = 0; pid = e.pointerId;
      startX = e.clientX; startY = e.clientY;
      basePx = -(self.loop ? self.cloneN + self.index : self.index) * (self.itemW + self.margin);
      self.stop();
    });
    window.addEventListener('pointermove', function (e) {
      if (!dragging || e.pointerId !== pid) return;
      dx = e.clientX - startX;
      if (!moved) {
        if (Math.abs(dx) < 4) return;
        if (Math.abs(e.clientY - startY) > Math.abs(dx) && e.pointerType !== 'mouse') { dragging = false; return; }
        moved = true;
        self.el.classList.add('is-dragging');
      }
      if (!self.fade) {
        self.stage.style.transition = 'none';
        self.stage.style.transform = 'translate3d(' + (basePx + dx) + 'px,0,0)';
      }
    });
    var end = function (e) {
      if (!dragging || (e && e.pointerId !== pid)) return;
      dragging = false;
      if (moved) {
        var w = self.itemW + self.margin;
        var n = Math.abs(dx) < 3 ? 0 : Math.max(1, Math.round(Math.abs(dx) / w));
        if (self.fade) n = Math.min(n, 1);
        if (n) self.step(dx < 0 ? n : -n);
        else self.moveTo(self.pos, true);
        setTimeout(function () { self.el.classList.remove('is-dragging'); }, 0);
      }
      if (!self.hover) self.play();
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    // chặn click sau khi kéo
    this.outer.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);
    this.outer.addEventListener('dragstart', function (e) { e.preventDefault(); });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { self.refresh(); self.play(); }, 150);
    });
  };

  window.TahawaCarousel = Carousel;
})();
