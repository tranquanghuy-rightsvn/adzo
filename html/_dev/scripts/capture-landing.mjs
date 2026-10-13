// Trích xuất bố cục landing page (LadiPage) của site gốc ở 2 bố cục desktop/mobile.
// - Chặn script runtime của LadiPage để lấy DOM tĩnh; chỉ đọc computed style (không lưu CSS/JS gốc).
// - Cấu hình hành vi (animation, popup, form, countdown...) lấy từ runtime đã giải mã (lần tải riêng).
// Kết quả: data/landing/<slug>.json
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const site = JSON.parse(await fs.readFile(path.join(ROOT, 'data/site.json'), 'utf8'));
const only = process.argv[2];
const pages = Object.entries(site.pages).filter(([k, v]) => v.type === 'landing' && (!only || k.includes(only)));
await fs.mkdir(path.join(ROOT, 'data/landing'), { recursive: true });

const PROPS = ['position', 'top', 'left', 'right', 'bottom', 'width', 'height', 'display', 'visibility', 'z-index',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'box-sizing', 'overflow-x', 'overflow-y', 'opacity', 'transform', 'transform-origin', 'float', 'clear',
  'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'color', 'text-align', 'text-transform',
  'text-decoration-line', 'text-decoration-color', 'text-decoration-style', 'text-shadow', 'white-space', 'word-break', 'overflow-wrap', 'text-indent',
  '-webkit-text-stroke-width', '-webkit-text-stroke-color', '-webkit-text-fill-color', '-webkit-background-clip', 'background-clip',
  'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat', 'background-attachment', 'background-origin',
  'border-top-width', 'border-top-style', 'border-top-color', 'border-right-width', 'border-right-style', 'border-right-color',
  'border-bottom-width', 'border-bottom-style', 'border-bottom-color', 'border-left-width', 'border-left-style', 'border-left-color',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
  'box-shadow', 'filter', 'backdrop-filter', 'mix-blend-mode', 'object-fit', 'object-position', 'fill', 'stroke', 'cursor', 'pointer-events',
  'list-style-type', 'list-style-position', 'list-style-image', 'align-items', 'justify-content', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
  'row-gap', 'column-gap', 'vertical-align', 'clip-path', 'mask-image', '-webkit-mask-image', 'content', 'counter-reset', 'counter-increment',
  'table-layout', 'border-collapse', 'outline-style', 'resize', 'appearance', 'user-select', 'max-width', 'max-height', 'min-width', 'min-height', 'inset'];

// Hàm chạy trong trang: ghi cây DOM + computed style
function snapshot(PROPS) {
  const INHERITED = new Set(['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'color', 'text-align', 'text-transform', 'text-shadow', 'white-space', 'word-break', 'overflow-wrap', 'text-indent', 'visibility', 'cursor', 'list-style-type', 'list-style-position', 'list-style-image', 'fill', 'stroke', 'pointer-events', '-webkit-text-stroke-width', '-webkit-text-stroke-color', '-webkit-text-fill-color', 'border-collapse', 'user-select']);
  const sandbox = document.createElement('div');
  sandbox.style.cssText = 'all:initial;position:absolute;left:-99999px;top:0;';
  document.documentElement.appendChild(sandbox);
  const defaults = {};
  const defFor = (tag) => {
    if (defaults[tag]) return defaults[tag];
    const el = document.createElement(tag);
    sandbox.appendChild(el);
    const cs = getComputedStyle(el);
    const o = {};
    PROPS.forEach((p) => { o[p] = cs.getPropertyValue(p); });
    sandbox.removeChild(el);
    return (defaults[tag] = o);
  };
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'META']);
  const styleOf = (el, pseudo) => {
    const cs = getComputedStyle(el, pseudo || null);
    const pcs = el.parentElement ? getComputedStyle(el.parentElement) : null;
    const def = defFor(el.tagName.toLowerCase());
    const o = {};
    PROPS.forEach((p) => {
      const v = cs.getPropertyValue(p);
      if (pseudo) { if (v && v !== 'none' && v !== 'normal' && v !== 'auto' && v !== '0px' && v !== 'rgba(0, 0, 0, 0)') o[p] = v; return; }
      if (INHERITED.has(p) && pcs && pcs.getPropertyValue(p) === v) return;
      if (!INHERITED.has(p) && v === def[p]) return;
      if (INHERITED.has(p) && !pcs && v === def[p]) return;
      o[p] = v;
    });
    return o;
  };
  let n = 0;
  const walk = (el) => {
    const node = { i: n++, t: el.tagName.toLowerCase() };
    if (el.id) node.id = el.id;
    const cls = (el.getAttribute('class') || '').trim();
    if (cls) node.c = cls.split(/\s+/);
    const attrs = {};
    ['href', 'target', 'src', 'alt', 'placeholder', 'type', 'name', 'value', 'required', 'rows', 'tabindex', 'title', 'data-type', 'data-name', 'data-replace-str'].forEach((a) => {
      if (el.hasAttribute(a)) attrs[a] = el.getAttribute(a);
    });
    if (Object.keys(attrs).length) node.a = attrs;
    node.s = styleOf(el);
    ['::before', '::after', '::placeholder'].forEach((ps) => {
      const c = getComputedStyle(el, ps).content;
      if (ps === '::placeholder' ? /^(input|textarea)$/i.test(el.tagName) : (c && c !== 'none' && c !== 'normal')) {
        node.ps = node.ps || {};
        node.ps[ps] = styleOf(el, ps);
      }
    });
    if (el.tagName === 'svg' || el.tagName === 'SVG' || el instanceof SVGElement) {
      node.svg = el.outerHTML;
      return node;
    }
    if (el.tagName === 'SELECT') node.options = [...el.options].map((o) => [o.value, o.textContent]);
    const kids = [];
    el.childNodes.forEach((c) => {
      if (c.nodeType === 3) { if (c.textContent !== '') kids.push(c.textContent); }
      else if (c.nodeType === 1 && !SKIP.has(c.tagName)) kids.push(walk(c));
    });
    if (kids.length) node.k = kids;
    return node;
  };
  const root = document.querySelector('.ladi-wraper') || document.body;
  const tree = walk(root);
  sandbox.remove();
  const bodyCs = getComputedStyle(document.body);
  return {
    tree,
    body: { 'font-family': bodyCs.fontFamily, 'font-size': bodyCs.fontSize, 'line-height': bodyCs.lineHeight, color: bodyCs.color, 'background-color': bodyCs.backgroundColor },
    title: document.title,
  };
}

async function scrollAll(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
    window.scrollTo(0, 0);
    document.querySelectorAll('.ladi-lazyload').forEach((e) => e.classList.remove('ladi-lazyload'));
  });
  await page.waitForTimeout(300);
}

const browser = await chromium.launch();
for (const [slug, d] of pages) {
  const url = d.source;
  const out = { slug, url, title: '', fonts: [], viewports: {} };
  // 1) cấu hình hành vi (runtime đã giải mã)
  {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.LadiPageScript && window.LadiPageScript.runtime && window.LadiPageScript.runtime.eventData, null, { timeout: 30000 }).catch(() => {});
    out.config = await page.evaluate(() => {
      const r = window.LadiPageScript && window.LadiPageScript.runtime;
      let ed = r && r.eventData;
      if (typeof ed === 'string') ed = JSON.parse(ed);
      return ed || {};
    });
    out.fonts = await page.evaluate(() => [...document.querySelectorAll('link[href*="fonts.googleapis"]')].map((l) => l.href));
    out.meta = await page.evaluate(() => ({ description: (document.querySelector('meta[name=description]') || {}).content || '', image: (document.querySelector('meta[property="og:image"]') || {}).content || '' }));
    await ctx.close();
  }
  // 2) bố cục tĩnh ở 2 viewport
  for (const [vp, size] of [['d', { width: 1200, height: 900 }], ['m', { width: 420, height: 900 }]]) {
    const ctx = await browser.newContext({ viewport: size });
    const page = await ctx.newPage();
    await page.route(/ladicdn\.com\/v\d\/source\/.*\.js|googletagmanager|facebook|gtag|doubleclick|mrktmtrcs|crwdcntrl|histats/, (r) => r.abort());
    await page.goto(url, { waitUntil: 'load' }).catch(() => {});
    await page.waitForTimeout(800);
    await scrollAll(page);
    const snap = await page.evaluate(snapshot, PROPS);
    out.title = snap.title;
    out.viewports[vp] = snap;
    await ctx.close();
  }
  await fs.writeFile(path.join(ROOT, 'data/landing', slug.replace(/\//g, '') + '.json'), JSON.stringify(out));
  console.log('captured', slug);
}
await browser.close();
