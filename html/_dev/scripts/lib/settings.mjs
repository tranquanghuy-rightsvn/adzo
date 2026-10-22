// Thông tin chung của website (logo, hotline, địa chỉ, banner trang chủ...) - CMS ghi
// data/settings.json (tab "Quản lý website", GAS.md mục II-C). Thiếu file/thiếu field = dùng
// DEFAULTS bên dưới (đúng nội dung site trước khi có tab này), nên build không bao giờ hỏng vì nó.
import fs from 'node:fs/promises';
import path from 'node:path';

export const DEFAULTS = {
  brand_name: 'Adzo',
  legal_name: 'Công Ty TNHH Adzo',
  home_title: 'Adzo - Thiết Bị Công Nghiệp Nhật Bản Chính Hãng',
  home_description: 'Adzo.vn - Cửa hàng thiết bị công nghiệp & gia dụng chính hãng: máy bơm nước, bồn nước inox, bồn nhựa, ' +
    'máy nước nóng năng lượng mặt trời, motor điện, máy thổi khí. Giao hàng tận nơi, hotline 0903 88 91 02.',
  home_keywords: '',
  logo: '/assets/img/media/logo-adzo.png',
  favicon: '/assets/img/media/favicon.png',
  og_image: '/assets/img/media/logo-adzo.png',
  topbar_text: 'Adzo.vn - Cửa hàng thiết bị công nghiệp & gia dụng chính hãng Nhật Bản',
  slogan: 'Đồng hành cùng hiệu suất',
  tagline: 'Thiết bị công nghiệp & gia dụng chính hãng Nhật Bản',
  hotline: '0903 88 91 02',
  zalo: '', // trống = dùng số hotline
  address: '39/14A Đường Phú Thọ, Phường 1, Quận 11, TP Hồ Chí Minh, Việt Nam',
  city: 'TP Hồ Chí Minh',
  hours: '07:00 – 22:00, Thứ 2 - Chủ Nhật',
  tax_code: '0314983819',
  copyright: '© Bản quyền thuộc về Công Ty TNHH Adzo',
  map_query: '39/14A đường Phú Thọ, Phường 1, Quận 11, TP.HCM', // trống = dùng Địa chỉ
  // Banner slide đầu trang chủ: [{img (máy tính), img_mobile, href}]. null = giữ nguyên js/data.js.
  hero: null,
  // Dải 2 banner dưới khối sản phẩm trang chủ: [{img, href, new_tab}]. null = giữ nguyên js/data.js.
  home_banners: null,
};

const OPTIONAL = new Set(['home_keywords', 'zalo', 'map_query']);

export async function loadSettings(repoRoot) {
  let saved = {};
  try {
    saved = JSON.parse(await fs.readFile(path.join(repoRoot, 'data/settings.json'), 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const S = { ...DEFAULTS };
  // Ô để trống trong CMS = dùng mặc định; riêng các ô có giá trị suy ra (từ khoá, Zalo, bản đồ) được phép trống.
  for (const k of Object.keys(DEFAULTS)) {
    const v = saved[k];
    if (Array.isArray(v)) S[k] = v.filter((it) => it && it.img);
    else if (typeof v === 'string' && (v.trim() || OPTIONAL.has(k))) S[k] = v.trim();
  }
  const digits = (s) => String(s || '').replace(/\D/g, '');
  S.hotline_tel = digits(S.hotline);
  S.hotline_intl = '+84' + S.hotline_tel.replace(/^0/, '');
  S.zalo_url = 'https://zalo.me/' + (digits(S.zalo) || S.hotline_tel);
  S.map_src = 'https://www.google.com/maps?q=' + encodeURIComponent(S.map_query || S.address) + '&output=embed';
  return S;
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Thay {{S:key}} trong partial bằng giá trị đã escape. Key lạ -> báo lỗi build (gõ nhầm tên). */
export function fillSettings(html, S) {
  return html.replace(/\{\{S:([a-z_]+)\}\}/g, (m, k) => {
    if (!(k in S)) throw new Error('settings: không có key ' + k + ' (partial dùng {{S:' + k + '}})');
    return esc(S[k]);
  });
}
