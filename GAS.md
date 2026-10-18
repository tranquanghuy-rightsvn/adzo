# GAS.md — Guideline CMS Adzco (Google Apps Script)

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

KHÔNG thuộc CMS (sửa tay trong repo, như cũ): trang tĩnh (giới thiệu, chính sách, liên hệ…),
landing page, menu (`html/js/menu-data.js`), khối banner/danh mục/sản phẩm nổi bật ở trang chủ
(`html/js/data.js`), giỏ hàng/thanh toán. Riêng các khối "tự động" sau do build tự cập nhật từ
`data/`: tin tức trang chủ, "TIN CHO BẠN" ở sidebar (5 bài mới nhất), dữ liệu thẻ sản phẩm ở
trang chủ + "SẢN PHẨM NỔI BẬT" (tên/giá/ảnh lấy lại theo sản phẩm hiện tại; sản phẩm đã xoá tự
biến mất khỏi khối).

Trang quản trị: `https://adzo.vn/admin/` (nhúng web app GAS bằng iframe).

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
   - Từ khoá SEO (tuỳ chọn)
2. Server/build tự suy (không có ô nhập):
   - `<title>` = `<Tiêu đề> - Adzco`.
   - Mục lục (TOC) + ảnh đầu bài: build tự sinh từ các thẻ H2/H3 trong nội dung (giữ đúng cấu
     trúc HTML các bài cũ), tự gắn `id` cho H2/H3.
   - Lượt xem/đánh giá: giữ nguyên giá trị bài cũ; bài mới = "0 Lượt xem", "0 Đánh giá".
   - Bài liên quan: 4 bài cùng danh mục (build tự chọn).
3. Danh sách trong Admin: tải qua GAS đọc GitHub (luôn mới nhất), gộp trong `boot()`.
4. Ảnh: nén phía client (cạnh dài tối đa 1600px, JPEG 0.85), upload thẳng GitHub ngay khi chọn.
   Ảnh RIÊNG 1-1 cho từng bài, thư mục `html/assets/img/posts/<slug>/`:
   `cover.jpg` (ảnh bìa, tải lại = ghi đè), `cNN.jpg` (ảnh trong nội dung, đánh số bất biến).
   Bài cũ (migrate) dùng ảnh chung ở `/assets/img/images/` — KHÔNG bao giờ bị xoá theo bài.

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
- `<title>` danh mục để trống = `<Tên> - Tin tức Adzco`.

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

- Google Sheet `Adzco CMS Data` (tự tạo lần đầu):
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
- `seo.mjs` quét mọi file `.html` nên đã chèn `index, follow` vào `/admin/` → đã cho bỏ qua
  `admin/` và `vendor/`.

## X. Script Properties (tên cố định)

- `GITHUB_TOKEN` — fine-grained PAT, quyền Contents: Read and write trên repo site.
- `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH` — bắt buộc.
- `NOTIFY_EMAIL` — nhận mail báo liên hệ mới (tuỳ chọn).
- `SPREADSHEET_ID` — KHÔNG cần điền, code tự tạo Sheet lần đầu và tự lưu.
