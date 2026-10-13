// Quy tắc ánh xạ URL gốc -> đường dẫn local của bản clone.
//   /abc.html, /cat/abc.html  -> /abc/
//   /cat/sub/                 -> /cat/sub/
//   /cart, /login, /register  -> /cart/, /login/, /register/
//   ảnh media/static CDN       -> /assets/img/{media|static|youtube}/...
export const ORIGIN = 'https://tahawa.com.vn';
const HOST_RE = /^(www\.)?tahawa\.(com\.)?vn$/i;
const IMG_RE = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i;
export const PATH_OVERRIDES = {};

export function localPath(href, base = ORIGIN + '/') {
  if (!href) return href;
  const raw = String(href).trim();
  if (/^(#|mailto:|tel:|javascript:|data:|zalo:|sms:)/i.test(raw)) return raw;
  let u;
  try { u = new URL(raw, base); } catch { return raw; }
  if (!HOST_RE.test(u.hostname)) return raw;
  let p = decodeURI(u.pathname).replace(/\/{2,}/g, '/');
  if (IMG_RE.test(p)) return assetPath(u.href);
  if (PATH_OVERRIDES[p.endsWith('/') ? p : p + '/']) return encodeURI(PATH_OVERRIDES[p.endsWith('/') ? p : p + '/']) + (u.hash || '');
  if (p.endsWith('.html')) p = '/' + p.split('/').pop().replace(/\.html$/, '') + '/';
  else if (p !== '/' && !p.endsWith('/')) p += '/';
  return encodeURI(p) + (u.hash || '');
}

export function slugPathFromPage(p) {
  // p là đường dẫn đã chuẩn hoá của crawler (vd /may-cha-san/abc.html)
  return decodeURI(localPath(ORIGIN + encodeURI(p)));
}

export function assetPath(url) {
  if (!url) return url;
  let u;
  try { u = new URL(url, ORIGIN + '/'); } catch { return url; }
  if (/^img\.youtube\.com$/.test(u.hostname) || /ytimg\.com$/.test(u.hostname)) {
    return '/assets/img/youtube' + decodeURI(u.pathname);
  }
  if (HOST_RE.test(u.hostname) && IMG_RE.test(u.pathname)) return '/assets/img/site' + decodeURI(u.pathname);
  if (/loveitopcdn\.com$/.test(u.hostname)) {
    const host = u.hostname.startsWith('static') ? 'static' : 'media';
    const p = decodeURI(u.pathname).replace(/^\/(42178\/)?/, '');
    return `/assets/img/${host}/${p}`;
  }
  return url;
}

export function isAssetUrl(url) {
  try {
    const u = new URL(url, ORIGIN + '/');
    return /loveitopcdn\.com$/.test(u.hostname) || /^img\.youtube\.com$/.test(u.hostname) || (HOST_RE.test(u.hostname) && IMG_RE.test(u.pathname));
  } catch { return false; }
}
