# tahawa.com.vn — Behaviors (trích xuất 2026-10-07)

Font: `'Sans-Serif', sans-serif` (font hệ thống, KHÔNG có webfont). Icon: Font Awesome 5 Free (solid 900).
Body: 16px / line-height 1.6, bg `#eeeeee`. Dưới 992px: html font 14.4px (90%).
Biến màu: primary `#139bce`, menu `#298ae1`, footer `#298ae1`, giá `#ff0000`, giá cũ `rgba(255,0,0,.45)`, sao `#ffc120`.

## Header (desktop ≥992px)
- Topbar 37px, bg `#298ae1`, chữ đen 14.4px. Link hover → `#ff0000` (`--header-txt-color-hover`).
- Main header trắng 130px: logo 226x100, ô tìm kiếm 635x38 bo 5px viền `#e5e5e5`, "Gọi ngay / 0564 77 88 67", giỏ hàng (icon 25px + badge đen 20px).
- Nav bar 50px bg `#298ae1`: khối "DANH MỤC" nền đen 295px; danh mục dọc luôn mở trên trang chủ (6 mục + "Xem thêm ..."). Click "Xem thêm ..." → slideToggle các mục ẩn, chữ đổi thành "Thu gọn".
- Hover mục danh mục: `::before` viền trái 3px đen. Mục có `has-sub` → mũi tên `\f105` trong ô xám `#f2f2f2`; hover → popup bên phải (left 110% → 100%, .3s).
- Menu ngang: chữ trắng 16px uppercase, line-height 50px, padding 0 15px. CHÍNH SÁCH hover → submenu 200px, nền trắng, chữ trắng (y hệt bản gốc), opacity 0→1 .5s ease-out, shadow `0 5px 5px rgba(0,0,0,.1)`.
- **Sticky**: khi scrollTop > offsetTop của `.page-content` (558px) → clone header-container thành `position:fixed` top 0, cao 50px, nền trắng, shadow `0 10px 10px rgba(0,0,0,.1)`, chữ menu đen (mục active trắng), ẩn main header, danh mục chỉ hiện khi hover "DANH MỤC" (opacity/visibility .3s), hiện icon search (hover → input mở rộng 200px) + giỏ hàng bên phải. Không có animation vào.

## Header (mobile <992px)
- Topbar căn giữa, 2 dòng (điện thoại / mạng xã hội).
- Header trắng padding 8px: nút ☰ MENU trái, logo giữa 50px cao, search + giỏ bên phải.
- Click MENU → `.main-nav.active`: hamburger biến thành X (before/after rotate ±45°/135°, .2s), panel 290px nền `#298ae1` trượt từ translateX(-500px) → 0 (.5s ease-out), chứa menu chính + "DANH MỤC" + danh mục đầy đủ. Nút "+" toggle (slide) submenu.
- Sticky: tương tự desktop, khi cuộn qua header.

## Carousel (Owl-like, tự viết)
- smartSpeed 500ms, loop, autoplayHoverPause, kéo chuột/vuốt.
- Hero: 1 item, fade (animateIn fadeIn), autoplay 7s, dots + nav (nav ẩn opacity 0 ở left 0, hover slider → left 30px opacity 1). Nút tròn 60px `rgba(19,155,206,.25)`, icon 40px trắng; hover nền primary opacity .85.
- "Bạn đang tìm gì": items 1/2/4/5 (0/576/768/992), margin 20, autoplay 5s, dots, nav 28px.
- Sản phẩm bán chạy: 1/2/4/5, autoplay 5s, nav tròn 28px ở -10px hai bên, không dots.
- Máy giặt thảm 1/2/3/4 không autoplay; Rửa xe & Bơm nước 1/2/4/5 không autoplay.
- Đối tác 1/2/3/4; Dự án 1/2/2/3; Cảm nhận 2/3/3/4 (autoHeight); Tin tức 1/2/2/3 autoplay 5s.
- Nav nhỏ: 28x28, bg `rgba(19,155,206,.25)`, icon trắng 20px; hover bg primary opacity .85.
- Dots: 10px, bg `rgba(19,155,206,.25)`, active primary opacity .85.

## Hover khác
- Link `a.nav-link` / `a[title]` hover opacity .75.
- `.btn-primary` hover opacity .9.
- Nút ĐĂNG KÝ hover opacity .8 (transition .5s).
- Float buttons (Zalo/Messenger/Email/Hotline) fixed phải: vòng tròn rung/pulse liên tục (keyframes zoomIn/pulse/tada). Hover → vòng fill primary .75.
- Nút cuộn lên đầu: xuất hiện khi scroll > 200 (fadeIn), click → cuộn mượt về đầu.

## Video
- lite-youtube: ảnh thumbnail + nút play đỏ YouTube; click → thay bằng iframe autoplay.
