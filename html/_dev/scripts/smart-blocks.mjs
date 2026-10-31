// Sinh các file của thư viện khối Smart content - CHẠY Ở MÁY LOCAL, KHÔNG chạy trên CI/server:
//   node html/_dev/scripts/smart-blocks.mjs
// Nguồn: lib/smart-blocks.mjs (danh mục khối, HTML mẫu, biểu tượng) + ../src/smart-blocks.css.
// Sinh ra:
//   html/css/smart-blocks.css    -> commit + push lên site (CSS của khối, đã gắn phạm vi)
//   html/_dev/smart-blocks.html  -> commit + push (trang xem thử mọi khối)
//   gas/smart-blocks.js          -> KHÔNG qua git; đưa lên Apps Script (clasp push hoặc dán tay, xem gas/README.md)
// Kết quả tất định: không đổi nguồn thì không sinh diff.
import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { BLOCKS, iconCss, blockStyles, catalogPrompt } from './lib/smart-blocks.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const WEB = path.resolve(HERE, '../..'); // html/
const REPO = path.resolve(WEB, '..');

const scopeSrc = readFileSync(path.join(WEB, 'js/smart-scope.js'), 'utf8');
const { smcScopeCss } = new Function(scopeSrc + '\nreturn { smcScopeCss };')();

/** Ảnh mẫu cho trang demo (ảnh thật của site). */
const DEMO_IMAGES = [
  '/assets/img/images/2631.jpg', '/assets/img/images/373.jpg', '/assets/img/images/7450.jpg',
  '/assets/img/images/2600.jpg', '/assets/img/images/7956.jpg', '/assets/img/images/2457.jpg',
  '/assets/img/images/7318.jpg',
];

export function buildCss() {
  const src = readFileSync(path.join(WEB, '_dev/src/smart-blocks.css'), 'utf8');
  return '/* FILE SINH TỰ ĐỘNG từ html/_dev/src/smart-blocks.css (html/_dev/scripts/smart-blocks.mjs) - đừng sửa tay. */\n' +
    smcScopeCss(src + '\n' + iconCss()) + '\n';
}

function demoHtml() {
  const img = (i) => DEMO_IMAGES[i % DEMO_IMAGES.length];
  const nav = BLOCKS.map((b) => `<a href="#b-${b.key}">${b.name} <small>${b.styles.length}</small></a>`).join('');
  const body = BLOCKS.map((b) => `<section class="demo-block" id="b-${b.key}">
<h1>${b.name} <code>smb-${b.key}</code></h1>
${b.styles.map(([n, vi]) => `<div class="demo-style"><div class="demo-label"><code>smb-${b.key}--${n}</code> ${vi}</div>
<div class="smc-root smc-a">${b.html(n, img)}</div></div>`).join('\n')}
</section>`).join('\n');
  const total = BLOCKS.reduce((s, b) => s + b.styles.length, 0);
  return `<!DOCTYPE html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Thư viện khối Smart content</title>
<!-- FILE SINH TỰ ĐỘNG (html/_dev/scripts/smart-blocks.mjs) - đừng sửa tay. -->
<link rel="stylesheet" href="/css/smart.css">
<link rel="stylesheet" href="/css/smart-blocks.css">
<style>
body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#f4f5f7;color:#222}
.demo-top{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;padding:10px 16px;background:#fff;border-bottom:1px solid #ddd}
.demo-top b{font-size:15px}.demo-top label{display:flex;gap:6px;align-items:center;font-size:14px}
.demo-top button{padding:5px 10px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer}.demo-top button.on{background:#222;color:#fff;border-color:#222}
.demo-wrap{display:grid;grid-template-columns:220px 1fr;gap:24px;max-width:1240px;margin:0 auto;padding:20px 16px}
.demo-nav{position:sticky;top:70px;align-self:start;display:grid;gap:2px}
.demo-nav a{padding:6px 10px;border-radius:6px;color:#333;text-decoration:none;font-size:14px}.demo-nav a:hover{background:#e8eaee}.demo-nav small{color:#999}
.demo-main{min-width:0}.demo-block{margin-bottom:48px}
.demo-block>h1{font-size:22px;margin:0 0 14px}.demo-block code{font-size:13px;color:#c7254e;background:#f9f2f4;padding:1px 6px;border-radius:4px}
.demo-style{margin:0 auto 18px;padding:22px;background:#fff;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.06);max-width:var(--demo-w,920px)}
.demo-label{margin:-6px 0 16px;font-size:13px;color:#666}
@media (max-width:760px){.demo-wrap{grid-template-columns:1fr}.demo-nav{position:static;grid-auto-flow:column;overflow-x:auto}}
</style></head>
<body>
<div class="demo-top"><b>Thư viện khối Smart content — ${BLOCKS.length} khối, ${total} kiểu</b>
<label>Màu chính <input type="color" id="c1" value="#139bce"></label>
<label>Màu nhấn <input type="color" id="c2" value="#ff6600"></label>
<span>Bề rộng khung bài:</span><button data-w="920px" class="on">Máy tính</button><button data-w="620px">Máy tính bảng</button><button data-w="360px">Điện thoại</button>
</div>
<div class="demo-wrap"><nav class="demo-nav">${nav}</nav><main class="demo-main">
${body}
</main></div>
<script src="/js/smart.js"></script>
<script>
(function(){
  var r=document.documentElement;
  function col(){r.style.setProperty('--smc-primary',document.getElementById('c1').value);r.style.setProperty('--smc-accent',document.getElementById('c2').value);}
  document.getElementById('c1').oninput=col;document.getElementById('c2').oninput=col;
  document.querySelectorAll('[data-w]').forEach(function(b){b.onclick=function(){
    document.querySelectorAll('[data-w]').forEach(function(x){x.classList.toggle('on',x===b)});
    r.style.setProperty('--demo-w',b.getAttribute('data-w'));window.dispatchEvent(new Event('resize'));};});
})();
</script>
</body></html>
`;
}

function gasJs() {
  return '/** FILE SINH TỰ ĐỘNG từ html/_dev/scripts/lib/smart-blocks.mjs (node html/_dev/scripts/smart-blocks.mjs) - đừng sửa tay.\n' +
    ' * Thư viện khối Smart content: phần prompt cho AI + danh sách kiểu của từng khối (trình thiết kế). */\n\n' +
    'const SMART_BLOCKS_PROMPT_ = ' + JSON.stringify(catalogPrompt()) + ';\n\n' +
    'const SMART_BLOCK_STYLES_ = ' + JSON.stringify(blockStyles(), null, 1) + ';\n';
}

async function writeIfChanged(file, text) {
  const old = await fs.readFile(file, 'utf8').catch(() => null);
  if (old !== text) await fs.writeFile(file, text);
}

export async function writeSmartBlocks() {
  await writeIfChanged(path.join(WEB, 'css/smart-blocks.css'), buildCss());
  await writeIfChanged(path.join(WEB, '_dev/smart-blocks.html'), demoHtml());
  // gas/ không có trên CI (gitignore) -> chỉ ghi ở máy dev, rồi clasp push.
  if (existsSync(path.join(REPO, 'gas'))) await writeIfChanged(path.join(REPO, 'gas/smart-blocks.js'), gasJs());
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  await writeSmartBlocks();
  const gas = existsSync(path.join(REPO, 'gas'));
  console.log(`Đã sinh xong thư viện khối Smart content. Việc tiếp theo:

1) SITE (push từ local, CI không sinh lại các file này):
   git add html/css/smart-blocks.css html/_dev/smart-blocks.html html/_dev/src/smart-blocks.css html/_dev/scripts/lib/smart-blocks.mjs
   git commit -m "Smart content: cập nhật thư viện khối" && git push
   -> đợi site deploy xong (admin nạp CSS từ https://www.adzo.vn/css/smart-blocks.css).

2) APPS SCRIPT (sau bước 1):
` + (gas
    ? `   - Thay file  smart-blocks  bằng nội dung gas/smart-blocks.js (clasp push, hoặc dán tay vào editor).
   - Deploy -> Manage deployments -> Edit -> New version.
   (Chỉ đổi khối/kiểu thì CHỈ file này đổi; Code.js, index.html, smart-content-js.html giữ nguyên.)`
    : '   - Không thấy thư mục gas/ -> chưa sinh gas/smart-blocks.js. Chạy lại lệnh này ở máy có thư mục gas/.'));
}
