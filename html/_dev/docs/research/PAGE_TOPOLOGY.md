# Page topology — tahawa.com.vn (trang chủ)

| # | Section | Interaction model | File/selector clone |
|---|---------|-------------------|---------------------|
| 1 | Topbar (điện thoại, MXH, đăng nhập) | static + hover đỏ | `.topbar` |
| 2 | Header desktop: logo / search / hotline / giỏ | static; sticky khi scroll > 558px | `.hd-bar` (`is-fixed`) |
| 3 | Nav: DANH MỤC (dọc, luôn mở ở trang chủ) + menu ngang (dropdown CHÍNH SÁCH) | hover + click "Xem thêm" | `.hd-nav` |
| 4 | Header mobile (<992): MENU off-canvas, logo, search, giỏ | click | `.hm-bar`, `.m-nav` |
| 5 | Hero slider 6 ảnh (col 75%) | time 7s + fade + click/drag | `[data-hero]` |
| 6 | Bạn đang tìm gì (13 danh mục) | time 5s + click/drag | `[data-cats]` |
| 7 | Banner x3 | static | `[data-banners=205]` |
| 8 | Sản phẩm bán chạy | time 5s carousel | `[data-product-carousel=234]` |
| 9 | Banner x3 | static | `[data-banners=201]` |
| 10 | Máy hút bụi công nghiệp (grid 5 cột) | static | `[data-product-grid=230]` |
| 11 | Máy chà sàn (grid) | static | `[data-product-grid=117]` |
| 12 | Máy giặt thảm (carousel 4) | click/drag | `232` |
| 13 | Máy rửa xe (carousel 5) | click/drag | `236` |
| 14 | Thiết bị bếp (grid) | static | `231` |
| 15 | Máy bơm nước (carousel 5) | click/drag | `233` |
| 16 | Khách hàng tiêu biểu (carousel 4) | click/drag | `[data-partners]` |
| 17 | Báo chí nói gì (3 banner link) | static | `224` |
| 18 | Dự án, đối tác (carousel 3) | click/drag | `[data-posts=projects]` |
| 19 | Thư viện video (2x2 lite-youtube) | click → iframe | `[data-videos]` |
| 20 | Các giải thưởng (heading) + ảnh lớn | static | `184` |
| 21 | Video 10 năm | click → iframe | `[data-video-single]` |
| 22 | Cảm nhận khách hàng (carousel 4) | click/drag | `[data-testimonials]` |
| 23 | Tin tức (carousel 3) | time 5s | `[data-posts=news]` |
| 24 | Banner thanh toán/ngân hàng x2 | static | `151` |
| 25 | Footer: form đăng ký tư vấn + counter + 3 cột + bản đồ | form submit | `.footer` |
| — | Float buttons (Zalo, Messenger, Email, Hotline) + nút lên đầu | fixed overlay, animation | `.float-button`, `.scroll-to-top` |
