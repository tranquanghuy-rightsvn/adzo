// Tải toàn bộ ảnh dùng trên trang chủ về assets/img, giữ nguyên cấu trúc đường dẫn.
// Đồng thời sinh js/data.js với đường dẫn ảnh đã đổi sang local.
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const WEB = path.resolve(ROOT, '..');
const data = JSON.parse(await fs.readFile(path.join(ROOT, 'docs/research/data.json'), 'utf8'));

const EXTRA = [
  'https://media.loveitopcdn.com/42178/logo-tahawa-den.png',
  ...['facebook', 'twitter', 'youtube', 'instagram', 'linkedin'].map(
    (n) => `https://static.loveitopcdn.com/themes/base/images/icons-link/icon-${n}.png`
  ),
  'https://static.loveitopcdn.com/themes/base/images/icons/phone-ico.png',
  'https://static.loveitopcdn.com/themes/base/images/icons/icon-mail.png',
  'https://static.loveitopcdn.com/themes/base/images/icons/facebook-messenger.png',
  'https://static.loveitopcdn.com/themes/base/images/icons/icon-zalo.svg',
  // footer cột 1
  'https://media.loveitopcdn.com/42178/dc.png',
  'https://media.loveitopcdn.com/42178/alarm-clock-icon.png',
  'https://media.loveitopcdn.com/42178/icon-07-1-300x300.png',
  'https://media.loveitopcdn.com/42178/phone-icon.png',
  'https://media.loveitopcdn.com/42178/1200px-email-shiny-iconsvg.png',
  'https://media.loveitopcdn.com/42178/20150827110756-dathongbao.png',
  'https://media.loveitopcdn.com/42178/thiet-ke-chua-co-ten-36.png',
  // footer cột 2
  'https://media.loveitopcdn.com/42178/ezgifcom-gif-maker.png',
  'https://media.loveitopcdn.com/42178/store.png',
  'https://media.loveitopcdn.com/42178/pos-icon-02-removebg-preview.png',
  'https://media.loveitopcdn.com/42178/ezgifcom-gif-maker-5.png',
  'https://media.loveitopcdn.com/42178/ezgifcom-gif-maker-2.png',
  'https://media.loveitopcdn.com/42178/ezgifcom-gif-maker-1.png',
  'https://media.loveitopcdn.com/42178/ezgifcom-gif-maker-4.png',
  'https://media.loveitopcdn.com/42178/png-clipart-computer-icons-symbol-professional-business-folder-miscellaneous-service-thumbnail-removebg-preview.png',
  // footer cột 3
  'https://media.loveitopcdn.com/42178/facebook1.png',
  'https://media.loveitopcdn.com/42178/142452-youtube.png',
  'https://media.loveitopcdn.com/42178/instagram.png',
  'https://media.loveitopcdn.com/42178/tiktok-logo-1f4a5dcd45-seeklogocom.png',
  'https://media.loveitopcdn.com/42178/zalo-icon.png',
  'https://media.loveitopcdn.com/42178/logo-lazada-2.png',
  'https://media.loveitopcdn.com/42178/iu.png',
];

const toLocal = (url) => {
  const u = new URL(url);
  const host = u.hostname.startsWith('img.youtube') ? 'youtube' : u.hostname.startsWith('static') ? 'static' : 'media';
  const p = decodeURIComponent(u.pathname).replace(/^\/(42178\/)?/, '');
  return `assets/img/${host}/${p}`;
};

const urls = new Set(EXTRA);
const walk = (v) => {
  if (typeof v === 'string' && /^https?:\/\/(media|static)\.loveitopcdn\.com\/.+\.(png|jpe?g|gif|svg|webp)/i.test(v)) urls.add(v);
  else if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === 'object') Object.values(v).forEach(walk);
};
walk(data);
for (const id of [...data.videos, data.video2]) {
  urls.add(`https://img.youtube.com/vi/${id}/hqdefault.jpg`);
  urls.add(`https://img.youtube.com/vi/${id}/mqdefault.jpg`);
}

const list = [...urls];
let ok = 0, fail = 0;
for (let i = 0; i < list.length; i += 6) {
  await Promise.all(list.slice(i, i + 6).map(async (url) => {
    const dest = path.join(WEB, toLocal(url));
    try {
      await fs.access(dest);
      ok++;
      return;
    } catch {}
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://tahawa.com.vn/' } });
      if (!res.ok) throw new Error(res.status);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
      ok++;
    } catch (e) {
      fail++;
      console.error('FAIL', url, e.message);
    }
  }));
}
console.log(`downloaded ${ok}/${list.length}, failed ${fail}`);

// Rewrite URLs in data → js/data.js
const rewrite = (v) => {
  if (typeof v === 'string') {
    return v.replace(/https?:\/\/(media|static)\.loveitopcdn\.com\/[^"'\s)]+?\.(png|jpe?g|gif|svg|webp)(\?[^"'\s)]*)?/gi, (m) => toLocal(m));
  }
  if (Array.isArray(v)) return v.map(rewrite);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, rewrite(x)]));
  return v;
};
const out = rewrite(data);
delete out.footer1; delete out.footer2; delete out.footer3;
await fs.mkdir(path.join(WEB, 'js'), { recursive: true });
await fs.writeFile(path.join(WEB, 'js/data.js'), '/* Dữ liệu trang chủ (sản phẩm, bài viết, banner...) */\nwindow.TAHAWA_DATA = ' + JSON.stringify(out, null, 1) + ';\n');
console.log('wrote js/data.js');
