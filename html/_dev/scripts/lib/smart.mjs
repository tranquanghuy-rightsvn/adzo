// Smart content (GAS.md mục II-D): bài viết / mô tả sản phẩm có nội dung do AI thiết kế bằng HTML + CSS
// riêng, lưu ở field `smart` của file chi tiết. Có `smart.html` thì trang dùng bản thiết kế thay cho
// content_html (content_html vẫn giữ làm bản gốc để quay về).
import { readFileSync } from 'node:fs';

// Hàm gắn phạm vi CSS dùng chung với trang quản trị: chạy đúng file trình duyệt nạp (js/smart-scope.js).
const scopeSrc = readFileSync(new URL('../../../js/smart-scope.js', import.meta.url), 'utf8');
const { smcScopeCss, smcColorStyle } = new Function(scopeSrc + '\nreturn { smcScopeCss, smcColorStyle };')();

/** d.smart hợp lệ -> { html (đã bọc khung .smc-root), css (đã gắn phạm vi) }, không thì null. */
export function smartContent(d) {
  const s = d && d.smart;
  if (!s || !String(s.html || '').trim()) return null;
  const style = smcColorStyle(s.primary, s.accent);
  return {
    html: `<div class="smc-root smc-a"${style ? ` style="${style}"` : ''}>${s.html}</div>`,
    css: smcScopeCss(s.css),
  };
}
