// Sinh /llms.txt (https://llmstxt.org) từ data/ để các AI (ChatGPT, Perplexity, Claude...) hiểu nhanh site.
// Tất định: cùng dữ liệu -> cùng nội dung (không chèn ngày giờ build), để CI không sinh diff thừa.
// Dùng: node _dev/scripts/llms.mjs   (seo.mjs tự gọi sau khi build)
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadSettings } from './lib/settings.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const WEB = path.resolve(ROOT, '..');
const REPO = path.resolve(WEB, '..');
const SITE_URL = 'https://www.adzo.vn';

const readJson = async (p) => JSON.parse(await fs.readFile(path.join(REPO, p), 'utf8'));
const url = (p) => `${SITE_URL}/${String(p).replace(/^\/|\/$/g, '')}${p && p !== '/' ? '/' : ''}`;
const clean = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const link = (name, href, desc) => `- [${clean(name)}](${href})${clean(desc) ? `: ${clean(desc)}` : ''}`;
const byOrder = (a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name, 'vi');

const POLICIES = [
  ['Giới thiệu', 'gioi-thieu'],
  ['Liên hệ', 'lien-he'],
  ['Chính sách bán hàng', 'chinh-sach-ban-hang'],
  ['Chính sách bảo hành', 'chinh-sach-bao-hanh'],
  ['Chính sách đổi trả', 'chinh-sach-doi-tra'],
  ['Chính sách vận chuyển - giao nhận', 'chinh-sach-van-chuyen-giao-nhan'],
  ['Chính sách thanh toán', 'chinh-sach-thanh-toan'],
  ['Chính sách trả góp', 'chinh-sach-tra-gop'],
  ['Chính sách đại lý', 'chinh-sach-dai-ly'],
  ['Bảo mật thông tin khách hàng', 'chinh-sach-bao-mat-thong-tin-khach-hang'],
  ['Điều khoản dịch vụ', 'dieu-khoan-dich-vu'],
];

export async function run() {
  const S = await loadSettings(REPO);
  const cats = await readJson('data/product-categories.json');
  const postCats = await readJson('data/post-categories.json');
  const posts = await readJson('data/posts.json');
  const products = await readJson('data/products.json');

  // Chỉ liệt kê trang thật sự tồn tại sau build (tránh link chết).
  const exists = async (p) => fs.access(path.join(WEB, p, 'index.html')).then(() => true, () => false);

  const L = [];
  L.push(`# ${S.brand_name} (adzo.vn)`, '');
  L.push(`> ${clean(S.home_description)}`, '');
  L.push(
    `${S.brand_name} là website bán hàng của ${S.legal_name} (MST ${S.tax_code}), chuyên phân phối thiết bị công nghiệp và gia dụng chính hãng: ` +
      'máy bơm nước, bồn nước inox/nhựa, bồn tự hoại, máy nước nóng năng lượng mặt trời, động cơ điện, máy thổi khí, thiết bị bếp công nghiệp... ' +
      `Website có ${products.length} sản phẩm, giá niêm yết bằng VNĐ; nội dung bằng tiếng Việt.`,
    '',
  );
  L.push('Thông tin liên hệ:', '');
  L.push(`- Hotline/Zalo: ${S.hotline}`);
  L.push(`- Địa chỉ: ${S.address}`);
  L.push(`- Giờ làm việc: ${S.hours}`);
  L.push(`- Sitemap đầy đủ: ${SITE_URL}/sitemap.xml`, '');

  // Danh mục sản phẩm: cấp 1, kèm danh mục con (thương hiệu/dòng) ngay bên dưới.
  const children = new Map();
  for (const c of cats) if (c.parent) (children.get(c.parent) || children.set(c.parent, []).get(c.parent)).push(c);
  L.push('## Danh mục sản phẩm', '');
  for (const c of cats.filter((c) => !c.parent).sort(byOrder)) {
    if (!(await exists(c.path))) continue;
    L.push(link(c.meta_title || c.name, url(c.path), c.meta_description !== c.name ? c.meta_description : ''));
    for (const k of (children.get(c.path) || []).sort(byOrder)) {
      if (await exists(k.path)) L.push(`  ${link(k.name, url(k.path))}`);
    }
  }
  L.push('');

  L.push('## Tin tức & kinh nghiệm', '');
  L.push(link('Tất cả tin tức', url('tin-tuc')));
  for (const c of [...postCats].sort(byOrder)) if (await exists(c.path)) L.push(link(c.h1 || c.name, url(c.path), c.meta_description));
  L.push('');
  L.push('## Bài viết', '');
  const sortedPosts = [...posts].sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.slug.localeCompare(b.slug));
  for (const p of sortedPosts) if (await exists(p.slug)) L.push(link(p.title, url(p.slug), p.description));
  L.push('');

  L.push('## Chính sách', '');
  for (const [name, p] of POLICIES) if (await exists(p)) L.push(link(name, url(p)));
  L.push('');

  await fs.writeFile(path.join(WEB, 'llms.txt'), L.join('\n'));
  console.log(`llms: ${L.length} dòng`);
}

if (process.argv[1]?.endsWith('llms.mjs')) await run();
