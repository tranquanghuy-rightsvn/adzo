// Smart content — DANH MỤC KHỐI DỰNG SẴN (nguồn duy nhất). Từ file này sinh ra:
//   - html/css/smart-blocks.css      : CSS của khối (từ html/_dev/src/smart-blocks.css + biểu tượng), đã gắn phạm vi.
//   - html/_dev/smart-blocks.html    : trang xem mọi khối × mọi kiểu (mở bằng serve.mjs: /_dev/smart-blocks.html).
//   - gas/smart-blocks.js            : danh mục cho Apps Script (prompt AI + danh sách kiểu cho trình thiết kế).
// Chạy: node html/_dev/scripts/smart-blocks.mjs (build-site.mjs cũng tự chạy phần CSS + trang demo).
//
// Mỗi khối có MỘT cấu trúc HTML; kiểu chọn bằng class `smb-<key>--<n>` trên phần tử gốc của khối.
// Đổi kiểu = đổi đúng 1 class -> trình thiết kế đổi được tức thì, không cần gọi AI.

/** Biểu tượng dạng mask SVG (nét 2px, khung 24). Tên dùng trong class smb-ico--<tên>. */
export const ICONS = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
  tip: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/>',
  star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  drop: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7z"/>',
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  tag: '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  thumb: '<path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
};

/** CSS biểu tượng: `.smb-ico--<tên> { --smb-i: url(data:svg) }`. */
export function iconCss() {
  return Object.entries(ICONS).map(([name, body]) => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${body.replace(/"/g, "'")}</svg>`;
    const uri = 'data:image/svg+xml,' + svg.replace(/[<>#%{}"]/g, (c) => encodeURIComponent(c));
    return `.smb-ico--${name} { --smb-i: url("${uri}"); }`;
  }).join('\n') + '\n';
}

const ico = (n) => `<span class="smb-ico smb-ico--${n}"></span>`;

/**
 * Các khối. html(S, img): HTML mẫu với kiểu S (số) và img(i) = URL ảnh thứ i. Mẫu này vừa là
 * "khuôn" gửi cho AI (img trả về /assets/...), vừa là nội dung trang demo.
 * styles: [số, tên tiếng Việt (hiện trong trình thiết kế), mô tả tiếng Anh cho AI].
 */
export const BLOCKS = [
  {
    key: 'faq',
    name: 'Hỏi đáp (FAQ)',
    use: 'Questions and answers. Each answer is collapsible. Add `open` to the first item if it should start expanded.',
    styles: [
      [1, 'Cổ điển 1 khung', 'one bordered box, items divided by lines'],
      [2, 'Thẻ rời có bóng', 'separate shadowed cards'],
      [3, 'Huy hiệu Q / A', 'round Q and A badges, lines between items'],
      [4, 'Đánh số 01, 02', 'big numbers 01, 02 on soft cards'],
      [5, 'Vạch trái, 2 cột', 'left colour bar, two columns on wide screens (best with 4+ short questions)'],
      [6, 'Tối giản + / −', 'minimal underlined rows with +/− sign'],
    ],
    html: (S) => `<section class="smb smb-faq smb-faq--${S}">
  <h2 class="smb-title">Câu hỏi thường gặp</h2>
  <div class="smb-faq__list">
    <details class="smb-faq__item" open>
      <summary class="smb-faq__q">Bồn inox nên đặt ở đâu là tốt nhất?</summary>
      <div class="smb-faq__a"><p>Nên đặt trên chân đế chắc chắn, mặt bằng phẳng, cao hơn vòi sử dụng ít nhất 3m để nước có áp lực tốt.</p></div>
    </details>
    <details class="smb-faq__item">
      <summary class="smb-faq__q">Bao lâu cần vệ sinh bồn một lần?</summary>
      <div class="smb-faq__a"><p>Khoảng 6 tháng một lần, hoặc sớm hơn nếu nguồn nước nhiều cặn.</p></div>
    </details>
    <details class="smb-faq__item">
      <summary class="smb-faq__q">Có lắp được máy bơm tăng áp không?</summary>
      <div class="smb-faq__a"><p>Có. Nên chọn máy bơm có công suất phù hợp với số tầng và số thiết bị dùng nước.</p></div>
    </details>
  </div>
</section>`,
  },
  {
    key: 'list',
    name: 'Danh sách ý',
    use: 'A list of short points (benefits, features, notes, keywords). `smb-list__label` is an optional bold lead-in.',
    styles: [
      [1, 'Dấu tích tròn', 'round check marks'],
      [2, 'Số tròn', 'numbered circles (order matters)'],
      [3, 'Lưới 2 cột', 'two-column grid of soft boxes with dots'],
      [4, 'Vạch màu trái', 'rows with a coloured left bar; the label sits on its own line'],
      [5, 'Thẻ tag', 'pill tags in a wrapping row (very short items only, no labels)'],
      [6, 'Mũi tên', 'arrow bullets with dashed separators'],
    ],
    html: (S) => `<section class="smb smb-list smb-list--${S}">
  <h2 class="smb-title">Ưu điểm nổi bật</h2>
  <ul class="smb-list__items">
    <li class="smb-list__item"><b class="smb-list__label">Inox 304:</b> chống gỉ sét, an toàn cho nước sinh hoạt.</li>
    <li class="smb-list__item"><b class="smb-list__label">Dập nổi gân tăng cứng:</b> chịu được áp lực nước lớn.</li>
    <li class="smb-list__item"><b class="smb-list__label">Chân đế chắc chắn:</b> lắp đặt nhanh trên sân thượng.</li>
    <li class="smb-list__item"><b class="smb-list__label">Bảo hành dài hạn:</b> yên tâm sử dụng nhiều năm.</li>
  </ul>
</section>`,
  },
  {
    key: 'cards',
    name: 'Thẻ (item)',
    use: 'A set of items: features, products, services, reasons. Each card has an optional image OR an optional icon, then title, text and an optional link. Use 2-6 cards.',
    styles: [
      [1, 'Ảnh trên, khung viền', 'image on top, bordered card grid'],
      [2, 'Hàng ngang', 'horizontal rows: image/icon left, text right'],
      [3, 'Ô tính năng', 'soft feature boxes with top colour bar and solid icon (best with icons)'],
      [4, 'Chữ đè lên ảnh', 'text over the photo (needs an image in every card)'],
      [5, 'So le trái/phải', 'large alternating image/text rows (zigzag), good for 2-4 items with photos'],
      [6, 'Tối giản căn giữa', 'minimal centred cards with big icon or round image'],
    ],
    html: (S, img) => `<section class="smb smb-cards smb-cards--${S}">
  <h2 class="smb-title">Vì sao chọn sản phẩm này?</h2>
  <div class="smb-cards__grid">
    <article class="smb-card">
      <img class="smb-card__img" src="${img(0)}" alt="Bồn nước inox" width="600" height="450" loading="lazy">
      <div class="smb-card__body">
        <h3 class="smb-card__title">Bền bỉ theo năm tháng</h3>
        <p class="smb-card__text">Inox cao cấp, mối hàn chắc chắn, không rò rỉ.</p>
      </div>
    </article>
    <article class="smb-card">
      <img class="smb-card__img" src="${img(1)}" alt="Lắp đặt bồn nước" width="600" height="450" loading="lazy">
      <div class="smb-card__body">
        <h3 class="smb-card__title">Lắp đặt nhanh</h3>
        <p class="smb-card__text">Đội kỹ thuật lắp đặt tận nơi trong ngày.</p>
      </div>
    </article>
    <article class="smb-card">
      <span class="smb-card__icon">${ico('shield')}</span>
      <div class="smb-card__body">
        <h3 class="smb-card__title">Bảo hành chính hãng</h3>
        <p class="smb-card__text">Đổi mới nếu lỗi do nhà sản xuất.</p>
        <a class="smb-card__link" href="/chinh-sach-bao-hanh/">Xem chính sách →</a>
      </div>
    </article>
  </div>
</section>`,
  },
  {
    key: 'slider',
    name: 'Slide ảnh',
    use: 'A swipeable slider of pictures (or short testimonials). Each slide is a figure with an image and an optional caption (`<strong>` = caption title). Keep the nav markup exactly; the dots container stays empty.',
    styles: [
      [1, 'Ảnh toàn khung', 'one full-width photo per view, caption below'],
      [2, 'Nhiều thẻ một lượt', '1 → 2 → 3 cards per view depending on width'],
      [3, 'Chú thích đè ảnh', 'caption over the photo, arrows at both ends'],
      [4, 'Chia đôi ảnh/chữ', 'split slide: photo left, longer text right'],
      [5, 'Cảm nhận khách hàng', 'centred quote with small round photo (testimonials)'],
      [6, 'Lộ slide kế', 'shows part of the next slide (swipe hint)'],
    ],
    html: (S, img) => `<section class="smb smb-slider smb-slider--${S}" data-smc-slider data-smc-gallery>
  <h2 class="smb-title">Hình ảnh thực tế</h2>
  <div class="smb-slider__track" data-smc-track>
    <figure class="smb-slide"><img class="smb-slide__img" src="${img(2)}" alt="Bồn nước lắp trên sân thượng" width="900" height="600" loading="lazy" data-smc-zoom><figcaption class="smb-slide__cap"><strong>Công trình nhà phố</strong>Bồn 1.500 lít đặt trên sân thượng.</figcaption></figure>
    <figure class="smb-slide"><img class="smb-slide__img" src="${img(3)}" alt="Bồn nước nằm ngang" width="900" height="600" loading="lazy" data-smc-zoom><figcaption class="smb-slide__cap"><strong>Bồn ngang</strong>Phù hợp nơi có chiều cao hạn chế.</figcaption></figure>
    <figure class="smb-slide"><img class="smb-slide__img" src="${img(4)}" alt="Kho hàng bồn nước" width="900" height="600" loading="lazy" data-smc-zoom><figcaption class="smb-slide__cap"><strong>Kho hàng</strong>Luôn sẵn hàng, giao nhanh.</figcaption></figure>
    <figure class="smb-slide"><img class="smb-slide__img" src="${img(5)}" alt="Máy bơm nước" width="900" height="600" loading="lazy" data-smc-zoom><figcaption class="smb-slide__cap"><strong>Phụ kiện đi kèm</strong>Đầy đủ van, phao, ống.</figcaption></figure>
  </div>
  <div class="smb-slider__nav"><button type="button" class="smb-slider__btn" data-smc-prev aria-label="Trước">‹</button><div class="smb-slider__dots" data-smc-dots></div><button type="button" class="smb-slider__btn" data-smc-next aria-label="Sau">›</button></div>
</section>`,
  },
  {
    key: 'steps',
    name: 'Quy trình từng bước',
    use: 'An ordered process (installation, usage, buying steps). Numbers are drawn automatically; write only titles and texts. Optional `<img class="smb-step__img">` inside a step body.',
    styles: [
      [1, 'Dòng thời gian dọc', 'vertical timeline with numbered circles'],
      [2, 'Hàng ngang', 'horizontal row on wide screens (3-5 short steps)'],
      [3, 'Thẻ số lớn', 'cards with large faded numbers 01, 02'],
      [4, 'Thời gian so le', 'centre timeline, steps alternate left/right'],
      [5, 'Ô "Bước N" + mũi tên', 'boxes labelled "Bước N" joined by arrows'],
      [6, 'Gọn, cột số đặc', 'compact rows with a solid number column'],
    ],
    html: (S) => `<section class="smb smb-steps smb-steps--${S}">
  <h2 class="smb-title">Quy trình lắp đặt</h2>
  <ol class="smb-steps__list">
    <li class="smb-step"><div class="smb-step__body"><h3 class="smb-step__title">Khảo sát vị trí</h3><p class="smb-step__text">Kiểm tra mặt bằng, tải trọng sàn và đường ống.</p></div></li>
    <li class="smb-step"><div class="smb-step__body"><h3 class="smb-step__title">Lắp chân đế</h3><p class="smb-step__text">Cố định chân đế cân bằng, chắc chắn.</p></div></li>
    <li class="smb-step"><div class="smb-step__body"><h3 class="smb-step__title">Đặt bồn, nối ống</h3><p class="smb-step__text">Nối ống cấp, ống xả, lắp phao cơ.</p></div></li>
    <li class="smb-step"><div class="smb-step__body"><h3 class="smb-step__title">Chạy thử, bàn giao</h3><p class="smb-step__text">Kiểm tra rò rỉ, hướng dẫn sử dụng.</p></div></li>
  </ol>
</section>`,
  },
  {
    key: 'callout',
    name: 'Hộp nổi bật (lưu ý / mẹo)',
    use: 'A highlighted box: note, tip, warning, key takeaway. Icon optional (info, tip, warning, check, star...). `<aside>` with no section title.',
    styles: [
      [1, 'Vạch trái nền nhạt', 'left bar on a soft background'],
      [2, 'Khung + icon tròn', 'outlined box with a solid round icon'],
      [3, 'Khối màu đặc', 'solid colour block, white text (strong emphasis, use sparingly)'],
      [4, 'Ghi chú nét đứt', 'dashed outline note'],
      [5, 'Nhãn nhô lên', 'title as a pill label sticking out of the top edge'],
      [6, 'Điều cốt lõi', 'large centred key takeaway between two rules'],
    ],
    html: (S) => `<aside class="smb smb-callout smb-callout--${S}">
  <span class="smb-callout__icon">${ico('tip')}</span>
  <div class="smb-callout__body">
    <p class="smb-callout__title">Mẹo nhỏ</p>
    <p>Gia đình 4-5 người nên chọn bồn 1.000-1.500 lít để đủ dùng cả khi mất nước 1-2 ngày.</p>
  </div>
</aside>`,
  },
  {
    key: 'stats',
    name: 'Con số nổi bật',
    use: 'Key figures (capacity, years, customers, warranty). 2-4 stats; numbers come only from the material.',
    styles: [
      [1, 'Số lớn, vạch ngăn', 'big numbers with vertical dividers'],
      [2, 'Ô nền nhạt', 'soft tiles'],
      [3, 'Khung + vạch nhấn', 'outlined tiles with an accent top bar'],
      [4, 'Vòng tròn', 'numbers inside circles'],
      [5, 'Hàng ngang', 'rows: number left, label right'],
      [6, 'Dải màu đặc', 'solid colour band, white numbers'],
    ],
    html: (S) => `<section class="smb smb-stats smb-stats--${S}">
  <div class="smb-stats__grid">
    <div class="smb-stat"><strong class="smb-stat__num">15+</strong><span class="smb-stat__label">năm kinh nghiệm</span></div>
    <div class="smb-stat"><strong class="smb-stat__num">1.500L</strong><span class="smb-stat__label">dung tích</span></div>
    <div class="smb-stat"><strong class="smb-stat__num">12 năm</strong><span class="smb-stat__label">bảo hành</span></div>
  </div>
</section>`,
  },
  {
    key: 'table',
    name: 'Bảng / thông số',
    use: 'Tabular data or a specification sheet. Use `<thead>` for column headings; use `<th scope="row">` for row names. For a 2-column spec sheet (name/value) style 3 needs no thead.',
    styles: [
      [1, 'Đầu màu, dòng xen kẽ', 'coloured header, striped rows'],
      [2, 'Lưới kẻ ô', 'full grid lines'],
      [3, 'Bảng thông số', 'spec sheet: shaded name column (2 columns)'],
      [4, 'Tối giản kẻ ngang', 'minimal, horizontal rules only'],
      [5, 'Đầu tối, cột đầu màu', 'dark header, coloured first column'],
    ],
    html: (S) => `<section class="smb smb-table smb-table--${S}">
  <h2 class="smb-title">Thông số kỹ thuật</h2>
  <div class="smb-table__wrap">
    <table class="smb-table__t">
      <thead><tr><th>Model</th><th>Dung tích</th><th>Đường kính</th><th>Chiều cao</th></tr></thead>
      <tbody>
        <tr><th scope="row">Đứng 1.000L</th><td>1.000 lít</td><td>960 mm</td><td>1.550 mm</td></tr>
        <tr><th scope="row">Đứng 1.500L</th><td>1.500 lít</td><td>1.140 mm</td><td>1.660 mm</td></tr>
        <tr><th scope="row">Đứng 2.000L</th><td>2.000 lít</td><td>1.140 mm</td><td>2.130 mm</td></tr>
      </tbody>
    </table>
  </div>
</section>`,
  },
  {
    key: 'compare',
    name: 'So sánh / ưu nhược',
    use: 'Side-by-side comparison (pros vs cons, option A vs B, 2-3 choices). Add `smb-compare__col--bad` to a cons column (✕ marks) and `smb-compare__col--featured` to the recommended option.',
    styles: [
      [1, 'Thẻ đầu màu', 'cards with coloured headers'],
      [2, 'Đối đầu VS', '"VS" badge between two options (exactly 2 columns)'],
      [3, 'Kiểu bảng giá', 'pricing-table look, recommended column raised'],
      [4, 'Xếp hàng', 'stacked rows: heading left, points right'],
      [5, 'Tối giản', 'minimal columns divided by a line'],
    ],
    html: (S) => `<section class="smb smb-compare smb-compare--${S}">
  <h2 class="smb-title">Bồn inox hay bồn nhựa?</h2>
  <div class="smb-compare__grid">
    <div class="smb-compare__col smb-compare__col--featured">
      <h3 class="smb-compare__head">Bồn inox</h3>
      <ul class="smb-compare__list"><li>Bền, chịu nắng tốt</li><li>Dễ vệ sinh</li><li>Thẩm mỹ cao</li></ul>
    </div>
    <div class="smb-compare__col smb-compare__col--bad">
      <h3 class="smb-compare__head">Bồn nhựa</h3>
      <ul class="smb-compare__list"><li>Dễ lão hoá dưới nắng</li><li>Dễ bám rêu nếu bồn mỏng</li><li>Kém chịu va đập</li></ul>
    </div>
  </div>
</section>`,
  },
  {
    key: 'tabs',
    name: 'Tab nội dung',
    use: 'Content split into switchable tabs (e.g. per model, per use case). Each `data-smc-tab` key must match one `data-smc-panel`. Panels contain a `smb-prose` div or other blocks.',
    styles: [
      [1, 'Gạch chân', 'underlined tabs'],
      [2, 'Viên thuốc', 'pill buttons'],
      [3, 'Hồ sơ (folder)', 'folder tabs with a boxed panel'],
      [4, 'Dọc bên trái', 'vertical tab list on the left (wide screens)'],
      [5, 'Công tắc phân đoạn', 'segmented control spanning the width (2-4 short tabs)'],
    ],
    html: (S) => `<section class="smb smb-tabs smb-tabs--${S}" data-smc-tabs>
  <h2 class="smb-title">Chọn dung tích theo nhu cầu</h2>
  <div class="smb-tabs__nav" role="tablist">
    <button type="button" class="smb-tabs__btn" data-smc-tab="t1">2-3 người</button>
    <button type="button" class="smb-tabs__btn" data-smc-tab="t2">4-6 người</button>
    <button type="button" class="smb-tabs__btn" data-smc-tab="t3">Trên 6 người</button>
  </div>
  <div class="smb-tabs__panel" data-smc-panel="t1"><div class="smb-prose"><p>Bồn <strong>500-700 lít</strong> là đủ cho sinh hoạt hằng ngày.</p></div></div>
  <div class="smb-tabs__panel" data-smc-panel="t2"><div class="smb-prose"><p>Nên chọn bồn <strong>1.000-1.500 lít</strong>.</p></div></div>
  <div class="smb-tabs__panel" data-smc-panel="t3"><div class="smb-prose"><p>Chọn bồn <strong>2.000 lít</strong> trở lên hoặc ghép 2 bồn.</p></div></div>
</section>`,
  },
  {
    key: 'media',
    name: 'Ảnh + chữ',
    use: 'One picture with its explanation side by side. Body holds a title (h2 if it starts a new section, otherwise h3) and a `smb-prose` div. Caption optional.',
    styles: [
      [1, 'Ảnh trái', 'image left, text right'],
      [2, 'Ảnh phải', 'text left, image right'],
      [3, 'Thẻ chữ đè mép ảnh', 'wide photo with a text card overlapping its bottom edge'],
      [4, 'Ảnh có khung lệch', 'image with an offset colour frame behind it'],
      [5, 'Ảnh rộng, chữ giữa', 'wide photo on top, centred text below'],
    ],
    html: (S, img) => `<section class="smb smb-media smb-media--${S}">
  <figure class="smb-media__fig"><img class="smb-media__img" src="${img(6)}" alt="Bồn nước inox đứng" width="800" height="600" loading="lazy" data-smc-zoom><figcaption class="smb-media__cap">Bồn đứng tiết kiệm diện tích</figcaption></figure>
  <div class="smb-media__body">
    <h3 class="smb-media__title">Thiết kế đứng gọn gàng</h3>
    <div class="smb-prose"><p>Bồn đứng chiếm ít diện tích mặt sàn, phù hợp sân thượng nhà phố. Thân bồn dập gân giúp tăng độ cứng.</p></div>
  </div>
</section>`,
  },
  {
    key: 'gallery',
    name: 'Lưới ảnh',
    use: 'Several pictures shown together; click zooms with prev/next. Caption optional. 3-8 images.',
    styles: [
      [1, 'Lưới đều vuông', 'even grid of square crops'],
      [2, 'Kiểu gạch (masonry)', 'masonry columns keeping original proportions'],
      [3, 'Ảnh đầu to', 'first image large, others small'],
      [4, 'Polaroid', 'tilted polaroid prints with captions'],
      [5, 'Dải trượt ngang', 'horizontal scrolling strip'],
    ],
    html: (S, img) => `<section class="smb smb-gallery smb-gallery--${S}" data-smc-gallery>
  <h2 class="smb-title">Bộ sưu tập</h2>
  <div class="smb-gallery__grid">
    <figure class="smb-gallery__item"><img src="${img(0)}" alt="Ảnh 1" width="600" height="600" loading="lazy" data-smc-zoom><figcaption class="smb-gallery__cap">Mặt trước</figcaption></figure>
    <figure class="smb-gallery__item"><img src="${img(1)}" alt="Ảnh 2" width="600" height="600" loading="lazy" data-smc-zoom><figcaption class="smb-gallery__cap">Chân đế</figcaption></figure>
    <figure class="smb-gallery__item"><img src="${img(2)}" alt="Ảnh 3" width="600" height="600" loading="lazy" data-smc-zoom><figcaption class="smb-gallery__cap">Nắp bồn</figcaption></figure>
    <figure class="smb-gallery__item"><img src="${img(3)}" alt="Ảnh 4" width="600" height="600" loading="lazy" data-smc-zoom><figcaption class="smb-gallery__cap">Van xả</figcaption></figure>
    <figure class="smb-gallery__item"><img src="${img(4)}" alt="Ảnh 5" width="600" height="600" loading="lazy" data-smc-zoom><figcaption class="smb-gallery__cap">Phao cơ</figcaption></figure>
  </div>
</section>`,
  },
  {
    key: 'quote',
    name: 'Trích dẫn / cảm nhận',
    use: 'A quotation, customer feedback or an expert remark from the material. Attribution optional.',
    styles: [
      [1, 'Vạch trái', 'left bar, italic'],
      [2, 'Căn giữa, ngoặc lớn', 'centred with a large quotation mark'],
      [3, 'Thẻ nền nhạt', 'soft card with a faded quotation mark'],
      [4, 'Khối màu đặc', 'solid colour block'],
      [5, 'Trích dẫn kéo', 'pull quote: big bold text between rules'],
    ],
    html: (S) => `<figure class="smb smb-quote smb-quote--${S}">
  <blockquote class="smb-quote__text"><p>Lắp bồn inox 1.500 lít đã 5 năm, nước vẫn trong, không rỉ sét. Rất hài lòng!</p></blockquote>
  <figcaption class="smb-quote__by">Anh Minh — Hà Nội</figcaption>
</figure>`,
  },
  {
    key: 'cta',
    name: 'Kêu gọi liên hệ',
    use: 'Closing call to action, ONLY with links/phone numbers that exist in the material (never invent them, never add prices or buy buttons on product pages). `smb-btn--ghost` = secondary button.',
    styles: [
      [1, 'Dải màu đặc', 'solid colour band, white buttons'],
      [2, 'Khung viền, nút phải', 'outlined box, buttons on the right (wide)'],
      [3, 'Thẻ căn giữa', 'centred soft card'],
      [4, 'Vạch nhấn trái', 'accent left bar and accent buttons'],
      [5, 'Tối giản', 'minimal, between two rules'],
    ],
    html: (S) => `<section class="smb smb-cta smb-cta--${S}">
  <p class="smb-cta__title">Cần tư vấn chọn bồn phù hợp?</p>
  <p class="smb-cta__text">Gọi ngay để được kỹ thuật viên tư vấn miễn phí.</p>
  <div class="smb-cta__actions"><a class="smb-btn" href="tel:0900000000">${ico('phone')} Gọi tư vấn</a><a class="smb-btn smb-btn--ghost" href="/lien-he/">Gửi yêu cầu</a></div>
</section>`,
  },
];

/** {key: [số kiểu...]} - trình thiết kế dùng để đổi kiểu khối không cần AI. */
export function blockStyles() {
  return Object.fromEntries(BLOCKS.map((b) => [b.key, { name: b.name, styles: b.styles.map(([n, vi]) => [n, vi]) }]));
}

/** Phần prompt mô tả thư viện khối cho AI (tiếng Anh, cố định -> Gemini cache được phần đầu prompt). */
export function catalogPrompt() {
  const img = () => '/assets/...jpg';
  const out = [];
  out.push('## Block library');
  out.push('Build the whole content ONLY from the blocks below plus `smb-prose` for ordinary text. The CSS for every block already exists on the site, so you write HTML only and leave `css` empty. Copy a block\'s markup exactly (same elements, same class names, same data- attributes), repeat its items as needed, drop optional parts you do not need, and choose a style by the number in `smb-<block>--<n>`. Do not invent other `smb-` classes and do not add classes to restyle a block.');
  out.push('');
  out.push('Shared pieces:');
  out.push('- Ordinary text (paragraphs, h2/h3 headings, ul/ol lists, inline links, a single figure): `<div class="smb-prose">...</div>`; plain tags inside, no classes needed. Every top-level child of the content is either a block or a `smb-prose` div.');
  out.push('- Block title: `<h2 class="smb-title">` (optional, omit when a preceding h2 already introduces the block); optional intro line `<p class="smb-lead">`.');
  out.push('- Icons: `<span class="smb-ico smb-ico--NAME"></span>` where NAME is one of: ' + Object.keys(ICONS).join(', ') + '. Do not write inline SVG.');
  out.push('- Colour: add `smb-tone-accent` next to `smb` on a block to use the accent colour instead of the primary colour (use for one or two blocks at most).');
  out.push('- Button: `<a class="smb-btn" href="...">` (secondary: `smb-btn smb-btn--ghost`).');
  out.push('');
  for (const b of BLOCKS) {
    out.push(`### ${b.key} — ${b.use}`);
    out.push('Styles: ' + b.styles.map(([n, , en]) => `${n} ${en}`).join('; ') + '.');
    out.push('```html');
    out.push(b.html(b.styles[0][0], img).replace(/\n\s*/g, ''));
    out.push('```');
  }
  out.push('');
  out.push('Composition: pick for each part of the material the block that fits its content (do not force everything into blocks; prose stays prose). Vary the styles across the page so it does not look repetitive, and avoid putting two blocks of the same kind next to each other.');
  return out.join('\n');
}
