# GAS.md — Guideline CMS Adzo (Google Apps Script)

> Nguồn quyết định CHỐT cho mọi file trong `gas/` (`Code.js`, `index.html`, `app.html`,
> `css.html`, `js.html`). Đọc toàn bộ trước khi sửa code. Sửa code xong 1 quyết định → cập nhật
> lại file này trong CÙNG lượt sửa (theo playbook skill `free-cms-static-site-pipeline`).
>
> Các field/quy tắc dưới đây lấy theo đúng mô hình dữ liệu mà site đang hiển thị
> (`html/_dev/scripts/lib/templates.mjs`) — không thêm field site không dùng tới.

## 0. Phạm vi

| Nội dung | Lưu ở đâu | Ghi bởi |
|---|---|---|
| Bài viết | GitHub `data/posts.json` + `data/posts/<slug>.json` | CMS (Contents API) |
| Danh mục bài viết | GitHub `data/post-categories.json` | CMS |
| Sản phẩm | GitHub `data/products.json` + `data/products/<slug>.json` | CMS |
| Danh mục sản phẩm | GitHub `data/product-categories.json` | CMS |
| Người dùng | Google Sheet, sheet `Users` | CMS |
| Liên hệ | Google Sheet, sheet `Contacts` | Form public trên site → `doPost` |
| Đơn hàng | Google Sheet, sheet `Orders` | Trang Thanh toán + "Mua nhanh" ở Giỏ hàng → `doPost` |
| Thông tin website (logo, hotline, banner trang chủ...) | GitHub `data/settings.json` | CMS, tab "Quản lý website" |
| Thư viện ảnh (chỉ mục) | GitHub `data/media-index.json` | Build (CI) |

KHÔNG thuộc CMS (sửa tay trong repo, như cũ): trang tĩnh (giới thiệu, chính sách, liên hệ…),
landing page, menu (`html/js/menu-data.js`), khối danh mục/sản phẩm nổi bật ở trang chủ
(`html/js/data.js`; RIÊNG banner slide + dải banner giữa trang chủ đã chuyển sang mục II-C), giỏ hàng/thanh toán. Riêng các khối "tự động" sau do build tự cập nhật từ
`data/`: tin tức trang chủ, "TIN CHO BẠN" ở sidebar (5 bài mới nhất), dữ liệu thẻ sản phẩm ở
trang chủ + "SẢN PHẨM NỔI BẬT" (tên/giá/ảnh lấy lại theo sản phẩm hiện tại; sản phẩm đã xoá tự
biến mất khỏi khối).

Trang quản trị: `https://www.adzo.vn/admin/` (nhúng web app GAS bằng iframe).

## I. Đăng nhập & phân quyền

1. Luồng: nhập email → nhận OTP qua email → nhập OTP → vào Admin. Không mật khẩu.
2. Chỉ email có trong sheet `Users` mới được gửi OTP.
3. Chủ script (người deploy) LUÔN là `root`, không cần (và không hiện) trong sheet `Users`.
4. Phân quyền 3 cấp `root > admin > editor`:

   | Chức năng | editor | admin | root |
   |---|---|---|---|
   | Bài viết, danh mục bài viết, sản phẩm, danh mục sản phẩm (thêm/sửa/xoá) | ✔ | ✔ | ✔ |
   | Liên hệ (xem, đổi trạng thái, xoá) | ✘ | ✔ | ✔ |
   | Đơn hàng (xem, đổi trạng thái, ghi chú nội bộ, xoá) | ✘ | ✔ | ✔ |
   | Người dùng (thêm/sửa/xoá tài khoản `admin`/`editor`) | ✘ | ✔ | ✔ |
   | Quản lý website (logo, liên hệ, banner trang chủ — mục II-C) | ✘ | ✔ | ✔ |
   | Thống kê: Tổng quan, Từ khoá & SEO, Truy cập | ✘ | ✔ | ✔ |

   - Quyền `root` không cấp/sửa/xoá được qua CMS (chỉ sửa tay trong Sheet) — tránh lỡ tay khoá
     chủ hệ thống. Không ai tự sửa/xoá được tài khoản của chính mình.
   - Editor cố ý KHÔNG thấy Liên hệ (thông tin khách hàng).
5. OTP sống 10 phút, cooldown 60 giây/email, sai 5 lần phải xin mã mới. Token sống 30 ngày,
   lưu localStorage. Đăng xuất thu hồi token trên server; token hết hạn được dọn mỗi lần
   đăng nhập (`purgeExpiredTokens_`).
6. Mọi hàm server tự `requireRole_` — ẩn menu trên giao diện không phải bảo mật.

## II. Bài viết

1. Field có ô nhập:
   - Tiêu đề (bắt buộc)
   - URL (slug) — tự sinh từ tiêu đề, bất biến sau khi lưu lần đầu. URL công khai: `/<slug>/`.
   - Danh mục (1 danh mục, chọn trong danh mục bài viết; bắt buộc)
   - Ngày đăng (mặc định hôm nay; hiển thị dd/mm/yyyy)
   - Ảnh bìa (bắt buộc) — hiện đầu bài + thẻ bài viết + ảnh chia sẻ (og:image)
   - Mô tả ngắn (bắt buộc) — dùng cho thẻ bài viết ở trang danh sách VÀ meta description
   - Nội dung: TinyMCE — đoạn văn, H2/H3/H4, đậm/nghiêng/gạch chân, danh sách, link, bảng,
     xem mã HTML. **CÓ chèn ảnh trong nội dung**: nút "Chèn ảnh" nhanh (`quickimage`, mở thẳng
     file picker, chọn nhiều ảnh), ảnh bọc `<figure>` + caption; alt/title = caption, rơi về
     tiêu đề bài nếu caption trống; caption placeholder bị xoá lúc lưu. KHÔNG cho dán/kéo-thả
     ảnh trực tiếp (`paste_data_images: false` — ảnh sẽ nằm nguyên base64 trong nội dung).
   - Từ khoá SEO (tuỳ chọn, phân cách dấu phẩy)
   - Từ khoá chính (`focus_keyword`, tuỳ chọn) — CHỈ dùng cho bộ chấm điểm SEO trong Admin, build
     không dùng.
2. Server/build tự suy (không có ô nhập):
   - `<title>` = `<Tiêu đề> - Adzo`.
   - Mục lục (TOC) + ảnh đầu bài: build tự sinh từ các thẻ H2/H3 trong nội dung (giữ đúng cấu
     trúc HTML các bài cũ), tự gắn `id` cho H2/H3.
   - Lượt xem/đánh giá: giữ nguyên giá trị bài cũ; bài mới = "0 Lượt xem", "0 Đánh giá".
   - Bài liên quan: 4 bài cùng danh mục (build tự chọn).
3. Danh sách trong Admin: tải qua GAS đọc GitHub (luôn mới nhất), gộp trong `boot()`.
4. Ảnh: nén phía client (cạnh dài tối đa 1600px, JPEG 0.85), upload thẳng GitHub ngay khi chọn.
   Ảnh RIÊNG 1-1 cho từng bài, thư mục `html/assets/img/posts/<slug>/`:
   `cover.jpg` (ảnh bìa, tải lại = ghi đè), `cNN.jpg` (ảnh trong nội dung, đánh số bất biến).
   Bài cũ (migrate) dùng ảnh chung ở `/assets/img/images/` — KHÔNG bao giờ bị xoá theo bài.

5. Bộ chấm điểm SEO (kiểu Rank Math / SEOMath của Web100) — file `gas/rank-math-seo-js.html`
   (nạp qua `index.html`, có trong mã băm `clientBuild_()`), có ở form thêm/sửa bài viết VÀ sản
   phẩm (sản phẩm: xem mục III.7). Mỗi form có 1 bộ nút/panel/bộ đếm riêng trong `app.html`, tìm theo
   thuộc tính `data-seo` trong tab của form đang mở:
   - Nút nổi góc phải "Điểm SEO" (luôn hiện điểm) → mở panel: vòng điểm 0-100, 4 ô thống kê
     (số từ, số lần xuất hiện từ khoá, số ảnh, số liên kết) và 38 tiêu chí chia 4 nhóm: Bắt buộc ·
     Tiêu đề & mô tả · Nội dung & khả năng đọc · Hình ảnh & liên kết. Mỗi tiêu chí: ✓ đạt / ! đạt một
     phần / ✕ chưa đạt / – không áp dụng, kèm số liệu và gợi ý sửa.
   - Điểm có trọng số: mỗi tiêu chí trả mức đạt 0-1, nhân trọng số (nhóm Bắt buộc 4-10, các nhóm
     khác 2-6), chia tổng trọng số các tiêu chí áp dụng được. ≥ 80 Tốt · 50-79 Khá · < 50 Cần cải
     thiện. Ngưỡng chính: nội dung 800-2.000 từ, tiêu đề SEO 40-65 ký tự (đã gồm " - Adzo"), mô tả
     120-160 ký tự, mật độ từ khoá 0,5-2,5%, 3-6 từ khoá SEO, ~1 ảnh/400 từ, ≥ 2 H2, ≥ 2 liên kết nội
     bộ. KHÔNG kiểm tra sitemap/JSON-LD (build tự sinh).
   - Bộ đếm tự động dưới từng ô: Tiêu đề (ký tự + độ dài tiêu đề SEO /65), Mô tả (/160), Nội dung
     (số từ · ký tự · phút đọc), Từ khoá SEO (số từ khoá). Màu xanh/cam/đỏ theo ngưỡng.
   - Chạy hoàn toàn trên trình duyệt, không gọi server, KHÔNG chặn việc Lưu.

6. Thư viện ảnh — dùng lại ảnh đã có (bài viết VÀ sản phẩm): nút "Chọn ảnh từ thư viện" (icon
   gallery) trên thanh công cụ TinyMCE, nút "Chọn từ thư viện ảnh" cạnh ô Ảnh bìa và ô Ảnh sản phẩm.
   - Chỉ mục `data/media-index.json` do BUILD sinh (`mediaIndex()` trong
     `html/_dev/scripts/lib/cms.mjs`): mọi ảnh `/assets/...` ở ảnh bìa, ảnh sản phẩm, nội dung
     bài/sản phẩm; mỗi dòng `[src, caption/alt, nơi dùng (tối đa 3 tên + "(+N)")]`. Ảnh mới chỉ vào
     thư viện sau khi Lưu + build xong (~1-3 phút; nút "Làm mới" trong hộp chọn).
   - Hộp chọn: ô tìm kiếm bỏ dấu, mọi từ gõ vào phải có trong chú thích / tên bài-sản phẩm / tên
     file; hiện 60 ảnh/lượt + "Xem thêm"; chọn nhiều ảnh (nội dung, ảnh sản phẩm — theo thứ tự bấm)
     hoặc 1 ảnh (ảnh bìa).
   - Ảnh CHUNG (`/assets/img/images/`, `/assets/img/media/`...) dùng lại bằng cách trỏ thẳng tới,
     không chép. Ảnh trong thư mục RIÊNG của bài/sản phẩm khác (`/assets/img/{posts,products}/<slug>/`)
     bị xoá theo chủ của nó → server CHÉP sang thư mục riêng của chỗ dùng mới (`cNN`/`gNN`) qua
     `reuseImage()`. Ảnh bìa luôn được chép thành `cover.jpg` của bài. Quy tắc "có cần chép" khai ở 2
     chỗ phải khớp: `reuseImage()` (Code.js) và `mediaNeedsCopy_()` (js.html).
   - `saveProduct` chấp nhận thêm ảnh CHUNG có trong thư viện (ngoài ảnh cũ + `gNN` riêng).
7. Danh sách bài viết và sản phẩm có nút "Xem" mở trang thật `https://www.adzo.vn/<slug>/` (tab mới).

## II-D. Smart content (AI Gemini dàn trang bài viết + mô tả sản phẩm)

Port từ plugin WordPress "Smart Content SEO" (`~/Desktop/smart-content-wp`): AI đọc nội dung đã viết
trong TinyMCE (chữ, ảnh, bảng, link) rồi trình bày lại bằng HTML + CSS riêng cho từng bài (bảng thông
số, thẻ, quy trình, slider ảnh, tab, hỏi đáp xổ xuống...). Có ở form bài viết VÀ form sản phẩm.

1. Dưới ô nội dung có thanh Smart content: "✨ Chuyển sang Smart content" / "Mở trình thiết kế" /
   "Bỏ Smart content". Trình thiết kế (lớp phủ toàn màn hình, `gas/smart-content-js.html`):
   - Khung xem trước dùng CSS thật của site, đổi bề rộng Máy tính / Máy tính bảng / Điện thoại;
     chế độ "Chọn để góp ý" (bấm/bôi đen chỗ cần sửa) hoặc "Xem thử" (slider, tab chạy thật).
   - Tab Thiết kế: chữ "Giữ nguyên, chỉ dàn trang" (mặc định) hoặc "Cho phép viết lại"; yêu cầu thêm
     cho AI; màu chính/màu nhấn riêng của bài (đổi thấy ngay, không gọi AI); Chuyển / Thiết kế lại
     (làm lại từ nội dung gốc).
   - Tab Góp ý: nhiều góp ý (mỗi góp ý gắn số vào chỗ đã chọn) → "Nhờ AI sửa" gửi 1 lần. AI trả các
     chỗ thay thế find/replace, áp tất cả hoặc không gì; tìm không thấy thì AI thử lại 1 lần.
   - Tab Phiên bản: mỗi lần AI làm xong lưu 1 phiên bản, giữ 5 bản gần nhất, khôi phục được.
2. Lưu: bản đang soạn nằm ở trình duyệt, CHỈ lên web khi bấm Lưu bài viết / Lưu sản phẩm — field
   `smart` trong file chi tiết: `{html, css, primary, accent, mode, instructions, versions[]}`
   (`cleanSmart_()` lọc script/iframe/on*/style=""; tối đa ~600KB, thừa thì bỏ phiên bản cũ).
   `content_html` KHÔNG bị đụng tới — là bản gốc: "Bỏ Smart content" (+ Lưu) là quay về nó.
3. Gọi AI: client → `smartGenerate` / `smartRevise` (Code.js) → Gemini `generateContent` (không
   stream, kết quả JSON theo schema). Server không lưu gì ở bước này. Ảnh gửi cho AI = ảnh trong
   nội dung gốc (+ ảnh sản phẩm), kèm kích thước thật đo ở trình duyệt; AI chỉ được dùng các ảnh đó.
4. Build (`html/_dev/scripts/lib/smart.mjs`): có `smart.html` thì trang dùng nó thay `content_html`
   (bài viết: vẫn sinh mục lục từ H2/H3; sản phẩm: tab "Mô tả"), bọc `<div class="smc-root smc-a">`
   (+ `style` màu riêng), nạp `/css/smart.css` (reset + biến `--smc-*` theo màu site) + `<style>` CSS
   của bài đã gắn phạm vi `.smc-a.smc-a.smc-a` + `/js/smart.js` (slider, tab, phóng to ảnh, video,
   hiện dần). Hàm gắn phạm vi CSS ở `html/js/smart-scope.js` dùng CHUNG cho build và khung xem
   trước của Admin (Admin nạp từ `https://www.adzo.vn/js/...` → sửa file này phải deploy site trước).
5. Bộ chấm điểm SEO (mục II.5, III.7) chấm theo bản Smart content khi đang dùng.
6. AI viết bài (nút "✍️ Viết bài / mô tả bằng AI" ở cùng thanh; port SMC_Writer của plugin):
   - Bước 1: Tiêu đề/Tên, Từ khoá chính, Từ khoá phụ, Ý chính + thông tin thực tế, Độ dài (bài viết
     1.000-2.500 chữ, sản phẩm 400-1.500), tuỳ chọn lấy thêm ảnh trong thư viện. Tiêu đề/từ khoá điền
     sẵn từ form và ghi ngược lại (để URL tự sinh, cần cho việc chép ảnh).
   - Bước 2: `smartOutline` → dàn ý: hướng bài, mô tả SEO 120-160 ký tự, các mục (mở bài / thân bài /
     hỏi đáp / kết bài) với số chữ từng mục (không chia đều), ý chính, H3/câu hỏi, ảnh. Sửa được mọi
     thứ: tiêu đề, số chữ, ý, thứ tự, thêm/xoá mục, thêm/bỏ ảnh (chọn từ thư viện).
   - Bước 3: viết TỪNG MỤC (`smartWriteSection`, mỗi mục 1 lần gọi - tránh giới hạn thời gian Apps
     Script, thấy tiến độ, mục lỗi thì "Viết tiếp" từ mục đó). Xong thì THAY nội dung ô soạn thảo,
     điền Từ khoá chính/phụ + Mô tả (bài viết: Mô tả ngắn; sản phẩm: Mô tả SEO) nếu đang trống. KHÔNG
     tự Lưu.
   - Ảnh CHỈ từ: ảnh người viết đã chèn sẵn trong ô nội dung (AI phải dùng hết) + tối đa 14 ảnh thư
     viện gần chủ đề nhất (điểm = số từ của tiêu đề/từ khoá có trong chú thích/tên bài của ảnh). Server
     tải ảnh (≤ 1,5MB) gửi kèm để AI nhìn rồi chọn. Không dùng ảnh ngoài. Ảnh thư viện của bài/sản phẩm
     khác được chép sang thư mục của bài này (`adoptLibraryFigure_` trong js.html, như chèn tay).
   - Link nội bộ: tối đa 12 sản phẩm/bài viết gần chủ đề; AI chèn tối đa 1 link mỗi mục, không lặp.
   - Không bịa số liệu: chỉ dùng thông tin có trong ô Ý chính hoặc nội dung đang có (sản phẩm: cấm tự
     đưa thông số, model, công suất, bảo hành...).

## II-C. Quản lý website (thông tin chung)

- Tab "Quản lý website" (admin trở lên), lưu `data/settings.json` (1 commit, kích hoạt build).
  Build đọc qua `html/_dev/scripts/lib/settings.mjs`: `DEFAULTS` trong file đó = nội dung site trước
  khi có tab này; thiếu file/ô chữ để trống = dùng mặc định (riêng Từ khoá trang chủ, Zalo → dùng
  hotline, Bản đồ → dùng Địa chỉ được phép trống).
- Field: Tên thương hiệu, Tên công ty, Tiêu đề / Mô tả / Từ khoá trang chủ, dòng chữ topbar (trái),
  slogan (topbar phải), câu giới thiệu chân trang; Logo, Favicon, Ảnh chia sẻ mặc định (og:image);
  Hotline, Zalo, Địa chỉ, Tỉnh/Thành phố, Giờ mở cửa, MST, dòng bản quyền, địa chỉ bản đồ; Banner
  slide đầu trang chủ (`hero`: ảnh máy tính + ảnh điện thoại tuỳ chọn + link, ≥ 1, tối đa 10, đổi
  thứ tự được); Dải banner giữa trang chủ (`home_banners`: ảnh + link + mở tab mới, tối đa 4).
- Dùng ở: header (logo, hotline, Zalo, topbar), footer (logo, tagline, địa chỉ, giờ, MST, hotline,
  Zalo, bản đồ, bản quyền), nút gọi/Zalo nổi, `<title>`/mô tả/từ khoá trang chủ, favicon mọi trang,
  trang thanh toán (logo, hotline), JSON-LD tổ chức + câu mô tả tự sinh (`seo.mjs`), banner trang
  chủ (`html/js/data.js` do build ghi lại). Partial dùng token `{{S:key}}` (`fillSettings`, key sai
  → build báo lỗi).
- Ảnh: tải lên `html/assets/img/site/<loại>-<thời điểm>.<ext>` (tên mới mỗi lần, không ghi đè; logo
  và favicon xuất PNG giữ nền trong, cạnh dài 512px; ảnh khác JPEG 1900px), hoặc chọn từ thư viện
  ảnh (mục II.6; ảnh riêng của bài/sản phẩm được chép sang `site/lib-*.jpg`). Ảnh cũ không tự xoá.

## II-B. Danh mục bài viết

- `/tin-tuc/` là trang TỔNG hiện mọi bài viết (build sinh từ hằng `BLOG` trong
  `html/_dev/scripts/lib/cms.mjs`), KHÔNG phải danh mục, không sửa qua CMS. Breadcrumb mọi bài/danh
  mục: Trang chủ › TIN TỨC › <danh mục> › <bài>. Đầu trang tin tức + mỗi trang danh mục có thanh
  chọn danh mục (Tất cả + các danh mục đang có bài).
- Danh mục bài viết luôn nằm dưới `/tin-tuc/<slug>/` (server tự thêm tiền tố `tin-tuc/`).
- Danh mục hiện có (sắp xếp lại 18/10/2026): Bồn nước & bồn tự hoại, Máy bơm nước, Máy nước nóng,
  Thiết bị gia đình, Thiết bị công nghiệp (giữ URL cũ `/tin-tuc/thong-tin-san-pham-cong-nghiep/`).
  Đã gỡ `/feed-back-khach-hang/`, `/tin-tuc/thong-tin-xe-dien/` (rỗng) → 301 về `/tin-tuc/` trong
  `html/_redirects`.
- `<title>` danh mục để trống = `<Tên> - Tin tức Adzo`.

- Field có ô nhập: Tên (hiện ở breadcrumb), Tiêu đề trang H1 (trống = Tên), URL (bất biến sau
  khi lưu lần đầu; danh mục con mới có URL `/<url-cha>/<slug>/`), Danh mục cha (tuỳ chọn; đổi cha
  của danh mục đã có chỉ đổi breadcrumb, không đổi URL; chặn chọn chính nó/con cháu làm cha),
  Tiêu đề SEO (trống = Tên), Mô tả SEO, Từ khoá SEO.
- Field giữ nguyên, không có ô nhập: `order` (chỉ là thứ tự lúc migrate, site không dùng), `og_image`.
- Trang danh mục liệt kê bài thuộc chính nó + mọi danh mục con, mới nhất trước, 9 bài/trang,
  trang 2 trở đi ở `/<url>-trang-N/`.
- Xoá: CHẶN nếu danh mục còn bài viết hoặc còn danh mục con (chuyển/xoá chúng trước).

## III. Sản phẩm

1. Field có ô nhập:
   - Tên sản phẩm (bắt buộc)
   - URL (slug) — bất biến sau khi lưu lần đầu. URL công khai: `/<slug>/`.
   - Danh mục (chọn nhiều, ít nhất 1). Breadcrumb dùng danh mục "sâu" nhất đã chọn.
     Trang danh mục cha tự hiện sản phẩm của mọi danh mục con → chỉ cần tick danh mục cụ thể nhất.
   - Giá bán (số, VND). Để trống = sản phẩm "Liên hệ" (nút Liên hệ thay cho giỏ hàng).
   - Giá gốc (tuỳ chọn, số). Lớn hơn giá bán thì hiện giá gạch + nhãn giảm "-X%" (tự tính).
   - Tình trạng: `Còn hàng` | `Hết hàng`.
   - Ảnh sản phẩm (nhiều ảnh, ảnh đầu = ảnh chính; gỡ được từng ảnh; ≥1 ảnh bắt buộc).
   - Mô tả ngắn (văn bản thường, mỗi dòng 1 đoạn) — hiện cạnh giá.
   - Mô tả chi tiết: TinyMCE (cùng cấu hình bài viết, CÓ chèn ảnh nhanh) — tab "Mô tả".
   - Tiêu đề SEO (trống = Tên), Mô tả SEO (trống = tự trích 160 ký tự đầu mô tả chi tiết),
     Từ khoá SEO (tuỳ chọn).
   - Từ khoá chính (`focus_keyword`, tuỳ chọn) — CHỈ dùng cho bộ chấm điểm SEO trong Admin, build
     không dùng.
2. Server/build tự suy: mã sản phẩm `id` (số tăng dần, server cấp), giá hiển thị
   "48.000.000VND", nhãn giảm giá, 4 sản phẩm liên quan (cùng danh mục chính), og:image = ảnh
   chính, dữ liệu tìm kiếm (`html/js/search-index.js`).
3. Danh sách trong Admin: gộp trong `boot()` (index nhẹ, không kèm nội dung); có ô tìm theo tên +
   lọc theo danh mục; mở form sửa mới tải nội dung đầy đủ.
4. Ảnh: RIÊNG 1-1 cho từng sản phẩm, thư mục `html/assets/img/products/<slug>/`:
   `gNN.jpg` (ảnh sản phẩm), `cNN.jpg` (ảnh trong mô tả chi tiết). Gỡ ảnh khỏi danh sách rồi Lưu
   → file `gNN.jpg` không còn trong danh sách bị xoá khỏi repo (đồng bộ xoá, chỉ áp dụng cho
   `gNN.jpg` trong thư mục riêng của sản phẩm). Sản phẩm cũ dùng ảnh chung `/assets/img/images/`
   — KHÔNG bao giờ bị xoá.
5. Thứ tự: sản phẩm mới đứng đầu danh sách (trang danh mục hiện theo thứ tự trong
   `data/products.json`), 60 sản phẩm/trang, trang 2 trở đi ở `/<url>-trang-N/`.
6. "Có thể bạn sẽ thích": khối ở sidebar trang chi tiết sản phẩm, NGAY TRÊN "SẢN PHẨM NỔI BẬT",
   cùng kiểu hiển thị. Field `suggested` (tối đa 4 slug, chọn ở form sản phẩm bằng ô tìm theo tên;
   server bỏ slug không tồn tại/trùng/chính nó). Thiếu (hoặc chưa chọn) thì build bù cho đủ 4 bằng
   chọn "ngẫu nhiên" CỐ ĐỊNH (`suggestFor()` trong `cms.mjs`, rendezvous hashing theo slug — thêm/xoá
   1 sản phẩm không làm đổi khối này ở cả nghìn trang). Sản phẩm đã chọn mà sau bị xoá → tự bỏ qua.
7. Bộ chấm điểm SEO sản phẩm (cùng file/cách tính với mục II.5) — chỉ chấm **Tiêu đề + Nội dung**
   (25 tiêu chí; bỏ các tiêu chí mô tả, URL, ảnh bìa, liên kết của bài viết):
   - Tiêu đề SEO = ô Tiêu đề SEO, trống thì = Tên sản phẩm (không có hậu tố, khớp `<title>` ở build).
     Có thêm tiêu chí "Tiêu đề có thông số (dung tích, công suất, model…)".
   - Nội dung = Mô tả chi tiết; ngưỡng độ dài 300-1.500 từ (bài viết 800-2.000). Có tiêu chí "Nội
     dung có ảnh minh hoạ" (ngoài ảnh sản phẩm); kiểm tra trùng tên với sản phẩm khác.

## III-B. Danh mục sản phẩm

- Field có ô nhập: giống danh mục bài viết (Tên, H1, URL, Danh mục cha, SEO×3).
- Field giữ nguyên, không có ô nhập: `order`, `description` (khối mô tả cuối trang danh mục,
  hiện đều trống), `og_image`, `has_filter`.
- Mọi trang danh mục sản phẩm phân trang 60 sản phẩm/trang (trước khi có CMS một số danh mục
  hiện hết trên 1 trang, vd Bồn nước 243 SP — nay thống nhất 60/trang).
- Xoá: CHẶN nếu còn danh mục con. Sản phẩm đang thuộc danh mục bị xoá được tự gỡ danh mục đó
  (sản phẩm không bị xoá; sản phẩm không còn danh mục nào vẫn có trang riêng).
- Menu danh mục ở header KHÔNG tự đổi theo (sửa tay `html/js/menu-data.js`).

## IV. Sửa / Xoá (mọi loại nội dung)

- URL bất biến sau khi lưu lần đầu: server throw nếu đổi, client disable ô URL; mở form "tạo mới"
  luôn bật lại ô URL. Tải ảnh lên cũng khoá URL (ảnh đặt tên theo URL).
- URL mới không được trùng bất kỳ đường dẫn nào đang có ở gốc site (sản phẩm, bài viết, danh mục,
  trang tĩnh, landing, thư mục hệ thống — danh sách đặt trước ở `data/reserved-paths.json` do
  build sinh) và không được kết thúc bằng `-trang-<số>`.
- Ảnh trong editor hiển thị qua URL tuyệt đối `raw.githubusercontent.com/<owner>/<repo>/<branch>/html/...`;
  nội dung lưu dạng `/assets/...` (đường dẫn tuyệt đối theo domain, không phụ thuộc độ sâu trang).
- Xoá bài viết/sản phẩm: xoá file chi tiết + gỡ khỏi index + xoá thư mục ảnh riêng 1-1 của nó.
- Mọi thao tác xoá có popup xác nhận (Huỷ/Xoá) trước.

## V. Form công khai: Liên hệ

- Form liên hệ trên trang `/lien-he/`: Họ tên*, Email, Số điện thoại*, Tin nhắn* (+ captcha
  phía client như cũ). Khối form "ĐĂNG KÝ NHẬN TIN" ở sidebar và form bình luận đã được gỡ khỏi
  HTML trước khi có CMS — template build đã được sửa theo, không đưa lại.
- Gửi `fetch()` tới URL `/exec`, `Content-Type: text/plain;charset=utf-8` (né CORS preflight).
- Honeypot ô ẩn `_hp` (ẩn bằng class `hp-field` trong `html/css/pages.css`). Có giá trị → âm
  thầm trả ok, không lưu.
- Rate-limit 20 giây/số điện thoại.
- Lưu sheet `Contacts`, gửi mail báo tới Script Property `NOTIFY_EMAIL` (để trống = không gửi
  mail, liên hệ vẫn lưu). Quota Gmail ~100 mail/ngày DÙNG CHUNG với OTP đăng nhập.
- Mọi email (mã OTP + báo liên hệ mới) dùng chung mẫu HTML `gas/email.html` (bảng + style inline
  cho Gmail/Outlook, logo + màu thương hiệu), render bằng `renderEmail_()`, luôn kèm bản chữ
  thường. Mail báo liên hệ đặt `replyTo` = email khách (nếu có) để bấm Trả lời là gửi thẳng cho khách.

## VI. Form công khai loại 2: Đặt hàng

- Giỏ hàng vẫn lưu ở trình duyệt (localStorage) như cũ. Khi khách đặt, đơn gửi về `doPost`
  (`formType: "order"`) từ 2 nơi: trang `/checkout/` (`source: checkout` — họ tên*, SĐT*, email,
  địa chỉ* + tỉnh/quận/phường, ghi chú; ĐÃ BỎ "giao tới địa chỉ khác" 18/10/2026, cột `ship_to`
  chỉ còn cho đơn cũ) và ô "Mua nhanh bằng số điện thoại" ở `/cart/` (`source: fast` — chỉ SĐT,
  tên = "Khách mua nhanh").
- Giá KHÔNG tin client: server tra lại theo `data/products.json` (sản phẩm "Liên hệ" hoặc không
  còn tồn tại → giá trống, không cộng vào tổng). Mã giảm giá trên site vẫn chỉ là giao diện (luôn
  báo không hợp lệ).
- Thanh toán (`payment`): `COD` → "Thanh toán khi nhận hàng (COD)" | `BANK` → "Chuyển khoản ngân
  hàng" (giá trị lạ → COD). Tài khoản: **ACB 260613369 — CTY TNHH ALO MUA BÁN**, khai ở 2 chỗ phải
  khớp nhau: `BANK` trong `html/_dev/scripts/lib/templates.mjs` (trang checkout) và `BANK_INFO`
  trong `gas/Code.js` (email). Mã QR VietQR sinh bằng `html/_dev/scripts/make-bank-qr.py` →
  `html/assets/img/payment/qr-code.svg` (+ `.png`). Chọn chuyển khoản: trang checkout hiện QR + số
  tài khoản; sau khi đặt hiện lại kèm số tiền và nội dung CK = mã đơn; email xác nhận cho khách
  kèm thông tin chuyển khoản. Đối soát tiền vào làm tay (đổi trạng thái đơn).
- Mã đơn 4 ký tự = 2 chữ + 2 số (vd `KT27`, chữ bỏ I/O cho khỏi nhầm 1/0). Trang checkout sinh mã
  NGAY khi mở trang (giữ trong sessionStorage, F5 không đổi) và hiện luôn làm "Nội dung CK"; đơn gửi
  kèm `code` và server GIỮ ĐÚNG mã đó (kiểm tra trùng trong khoá). Trùng (rất hiếm) → trả
  `code: "DUPLICATE_CODE"`, trang tự đổi mã mới và yêu cầu khách kiểm tra lại rồi bấm đặt lần nữa
  (không đổi âm thầm vì khách có thể đã chuyển khoản theo mã cũ). Đơn "Mua nhanh" không gửi mã →
  server tự sinh. Hàm sinh mã ở 2 chỗ phải cùng quy tắc: `randomOrderCode()` (html/js/pages.js) và
  `randomOrderCode_()` (gas/Code.js).
- Chọn chuyển khoản: BẮT BUỘC tick "Tôi đã chuyển khoản..." mới đặt được — chặn ở trang (báo lỗi
  "Bạn phải thanh toán") VÀ ở server (`paid !== true` → cùng lỗi). Đơn lưu payment = "Chuyển khoản
  ngân hàng (khách báo đã chuyển)"; vẫn phải tự đối soát tiền vào.
- Honeypot `_hp`, rate-limit 30 giây/SĐT (chỉ đánh dấu SAU khi lưu đơn thành công), SĐT phải dạng
  `0xxxxxxxxx`.
- Mail báo đơn mới tới `NOTIFY_EMAIL` (replyTo = email khách) + mail xác nhận cho khách nếu có
  email — dùng chung mẫu `email.html`, chung quota Gmail.
- Trạng thái: `Mới` → `Đã xác nhận` → `Đang giao` → `Hoàn thành` | `Đã huỷ`. Sửa được trong Admin:
  trạng thái + ghi chú nội bộ (`admin_note`). Không sửa được nội dung đơn.

## VII. UX chung

- 2 popup riêng: XÁC NHẬN (Huỷ/Xoá) trước khi xử lý; THÔNG BÁO kết quả (1 nút Đóng) sau khi xử
  lý — không `alert()`/`confirm()`, không toast tự ẩn. Sau mỗi Lưu/Xoá nhắc "Website sẽ được cập
  nhật sau 1-3 phút".
- Mọi nút async: disable + spinner, tự phục hồi kể cả khi lỗi.
- Lưu/Xoá xong: quay về danh sách của chính loại đó, danh sách tự cập nhật ngay.
- Chuyển tab chỉ ẩn/hiện, không tải lại dữ liệu.
- 1 lượt `boot()` duy nhất khi mở; lần sau hiện ngay từ cache localStorage rồi làm mới ngầm.
- Key localStorage (trừ token) mang hậu tố `CLIENT_BUILD` do server băm từ nội dung
  `app.html` + `js.html` (`clientBuild_()`), tự dọn key bản cũ → không ai phải nhớ bump.
- Không lộ tên hạ tầng (Sheet/Drive/Apps Script/GitHub) trong chữ hiển thị, comment hay thông
  báo lỗi gửi xuống trình duyệt.

## VIII. Kiến trúc lưu trữ (tên cố định)

- Google Sheet `Adzo CMS Data` (tự tạo lần đầu):
  - `Users`: `email`, `role` (`root` | `admin` | `editor`)
  - `Contacts`: `id`, `created_at` (UTC ISO), `name`, `email`, `phone`, `message`, `page`,
    `status` (`Mới` | `Đã xử lý`)
  - `Orders`: `id`, `created_at`, `source` (`checkout` | `fast`), `name`, `phone`, `email`,
    `address`, `ship_to`, `note`, `items` (JSON `[{id, slug, name, price, qty}]`), `items_text`
    (bản dễ đọc khi mở Sheet), `total`, `payment`, `status`, `admin_note`
- GitHub (repo `adzo`, qua Contents API):
  - `data/posts.json` — index bài viết (commit CHỐT)
  - `data/posts/<slug>.json` — chi tiết 1 bài
  - `data/post-categories.json` — toàn bộ danh mục bài viết (commit CHỐT)
  - `data/products.json` — index sản phẩm, kèm `categories` (commit CHỐT)
  - `data/products/<slug>.json` — chi tiết 1 sản phẩm
  - `data/product-categories.json` — toàn bộ danh mục sản phẩm (commit CHỐT)
  - `data/reserved-paths.json` — đường dẫn gốc không thuộc CMS (build sinh, CMS chỉ đọc)
  - `html/assets/img/posts/<slug>/…`, `html/assets/img/products/<slug>/…` — ảnh upload
- File index/commit CHỐT luôn ghi SAU CÙNG; CI (`.github/workflows/build.yml`) chỉ trigger
  theo 4 file chốt (+ code build) → chạy `node html/_dev/scripts/build-site.mjs` → commit `html/`.
- Hosting: Cloudflare Pages (thư mục xuất bản `html/`). Mọi commit của CMS có hậu tố `[CI-Skip]`
  → Pages bỏ qua, chỉ deploy commit build của CI — tránh đốt quota build/tháng vì mỗi ảnh là 1
  commit. GitHub Actions không nhận dạng `[CI-Skip]` (có gạch ngang) nên workflow vẫn chạy; KHÔNG
  đổi thành `[skip ci]`. Header `noindex` cho `/admin/` khai ở `html/_headers`.
- Độ trễ Lưu → thấy trên site: ~1-3 phút (CI build ~30-60s + Cloudflare Pages deploy).

## VIII-B. Thống kê: Google Search Console + Google Analytics 4

- 3 tab (admin/root, editor không thấy; admin/root mở Admin là vào thẳng Tổng quan):
  - **Tổng quan**: người truy cập, lượt xem trang, lượt nhấp từ Google (kèm % so với kỳ trước), số
    đơn + doanh thu tạm tính (trừ đơn huỷ) + đơn chờ xử lý, liên hệ mới; biểu đồ phiên truy cập +
    lượt nhấp Google theo ngày; top 10 từ khoá; top trang được xem.
  - **Từ khoá & SEO** (Search Console): lượt nhấp, lượt hiển thị, CTR, vị trí TB; biểu đồ theo ngày;
    bảng tối đa 250 từ khoá (tìm, sắp xếp theo cột, lọc "top 3" / "cơ hội vị trí 4-15" / "hiển thị
    nhiều nhưng CTR < 2%"); top trang nhận lượt nhấp. Ghi chú rõ: "lượt hiển thị" ≠ tổng lượt tìm
    của từ khoá trên Google (số đó cần Google Ads Keyword Planner - không làm).
  - **Truy cập** (GA4): người dùng, phiên, lượt xem, thời gian TB/phiên, trang/phiên; biểu đồ theo
    ngày; nguồn truy cập, thiết bị, tỉnh/thành, top 20 trang.
  - Chọn 7 / 28 / 90 ngày; nút "Làm mới" bỏ qua cache.
- Server `getAnalytics(token, days, force)` gọi Search Console API + GA4 Data API bằng
  `ScriptApp.getOAuthToken()` của tài khoản DEPLOY (phải được thêm vào cả 2 property). Scope khai
  tường minh trong `gas/appsscript.json` (`analytics.readonly`, `webmasters.readonly` + các scope cũ)
  → sau khi `clasp push` phải chạy 1 hàm trong editor để cấp quyền mới.
- Script Properties: `GSC_SITE_URL` (`sc-domain:adzo.vn` cho property dạng Miền, hoặc
  `https://www.adzo.vn/`), `GA4_PROPERTY_ID` (dãy số, KHÔNG phải mã G-). Thiếu cái nào thì tab tương ứng
  báo "Chưa kết nối…", nguồn còn lại vẫn chạy.
- Cache: server 3 giờ (CacheService), trình duyệt 30 phút (localStorage, key có `CLIENT_BUILD`).
  Search Console lấy dữ liệu tới 3 ngày trước (dữ liệu Google chậm 2-3 ngày).
- Website: thẻ GA4 gắn qua hằng `GA4_ID` trong `html/_dev/scripts/lib/templates.mjs` (trống = không
  gắn). Có sự kiện `purchase` (đặt hàng thành công, kèm mã đơn/giá trị/sản phẩm) và `generate_lead`
  (gửi form liên hệ).

## IX. Bug đã gặp ở dự án này

- HTML đang chạy trên site đã bị sửa tay sau lần build cuối (gỡ form bình luận, gỡ form sidebar)
  — CI build lại sẽ đưa chúng trở lại. Đã sửa `templates.mjs` cho khớp. Bài học: TRƯỚC khi bật
  CI build tự động, build thử và so diff với HTML đang chạy.
- `templates.mjs` dùng `Date.now()` làm phiên bản CSS/JS → mỗi lần build đổi cả ~1.700 trang dù
  nội dung không đổi. Đã đổi sang băm nội dung CSS/JS.
- Đăng nhập báo `SyntaxError: Unexpected token ';'`: comment trong `gas/email.html` có chuỗi ký
  hiệu scriptlet in giá trị (dấu mở + `=` + dấu đóng, rỗng ở giữa) — HtmlService biên dịch scriptlet
  kể cả nằm trong `<!-- -->` → lỗi khi render email OTP. Không bao giờ viết ký hiệu scriptlet trong
  comment của file template (`email.html`, `index.html`, `app.html`).
- Mở Admin khi đã có cache báo `Cannot access 'PRODUCT_LIST_LIMIT' before initialization`: lời
  gọi khởi động `bootApp()` nằm giữa `gas/js.html`; có cache thì giao diện vẽ ĐỒNG BỘ ngay, đụng hằng
  `const`/`let` khai báo phía dưới (vùng TDZ). Lần đầu (không cache) boot bất đồng bộ nên không lộ.
  Đã dời khối khởi động xuống CUỐI file. Test admin phải chạy CẢ 2 trường hợp: có cache và không cache.
- `seo.mjs` quét mọi file `.html` nên đã chèn `index, follow` vào `/admin/` → đã cho bỏ qua
  `admin/` và `vendor/`.

## X. Script Properties (tên cố định)

- `GITHUB_TOKEN` — fine-grained PAT, quyền Contents: Read and write trên repo site.
- `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH` — bắt buộc.
- `NOTIFY_EMAIL` — nhận mail báo liên hệ mới (tuỳ chọn).
- `GSC_SITE_URL`, `GA4_PROPERTY_ID` — kết nối Search Console / GA4 cho tab thống kê (tuỳ chọn, mục VIII-B).
- `SPREADSHEET_ID` — KHÔNG cần điền, code tự tạo Sheet lần đầu và tự lưu.
- `GEMINI_API_KEY` — key Gemini (https://aistudio.google.com/apikey) cho Smart content (mục II-D).
- `GEMINI_MODEL` — tuỳ chọn, mặc định `gemini-3.8-flash`. `GEMINI_THINKING` — tuỳ chọn, `low`
  (mặc định) | `medium` | `high`: cao hơn đẹp hơn nhưng lâu hơn (Apps Script dừng ở 6 phút).
