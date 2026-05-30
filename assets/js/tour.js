// ===== 4D.1 — Onboarding tour ===== //
// Tour.show(steps) hiển thị overlay tuần tự, Next/Prev/Skip. Khi đóng (Xong hoặc Skip)
// → onDone callback (caller dùng để set Progress.settings.onboardingDone = true).
// Mỗi step: { icon, title, body, ctaLabel?, ctaUrl? }.
// Tôn trọng prefers-reduced-motion (qua CSS).
const Tour = (() => {
  let curSteps = [], curIdx = 0, onDoneCb = null, overlay = null;

  function show(steps, onDone) {
    if (!Array.isArray(steps) || !steps.length) return;
    curSteps = steps; curIdx = 0; onDoneCb = onDone || null;
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.className = 'tour-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-live', 'polite');
    document.body.appendChild(overlay);
    render();
    requestAnimationFrame(() => overlay.classList.add('show'));
  }

  function render() {
    if (!overlay) return;
    const s = curSteps[curIdx];
    if (!s) return finish();
    const isLast = curIdx === curSteps.length - 1;
    const isFirst = curIdx === 0;
    const ctaHTML = s.ctaUrl ? `<a class="tour-cta" href="${s.ctaUrl}" onclick="Tour.close()">${s.ctaLabel || 'Mở luôn'} →</a>` : '';
    overlay.innerHTML = `
      <div class="tour-card">
        <button class="tour-x" aria-label="Đóng" onclick="Tour.close()">×</button>
        <div class="tour-icon">${s.icon || '✨'}</div>
        <h2 class="tour-title">${s.title}</h2>
        <div class="tour-body">${s.body}</div>
        ${ctaHTML}
        <div class="tour-dots" aria-label="Bước ${curIdx + 1}/${curSteps.length}">
          ${curSteps.map((_, i) => `<span class="tour-dot ${i === curIdx ? 'cur' : ''} ${i < curIdx ? 'done' : ''}"></span>`).join('')}
        </div>
        <div class="tour-nav">
          <button class="tour-skip" onclick="Tour.skip()">${isLast ? 'Đóng' : 'Bỏ qua'}</button>
          <div class="tour-nav-right">
            ${!isFirst ? '<button class="tour-prev" onclick="Tour.prev()">← Quay lại</button>' : ''}
            <button class="tour-next" onclick="Tour.next()">${isLast ? '🎉 Bắt đầu học!' : 'Tiếp →'}</button>
          </div>
        </div>
      </div>`;
  }

  function next() { if (curIdx < curSteps.length - 1) { curIdx++; render(); } else finish(); }
  function prev() { if (curIdx > 0) { curIdx--; render(); } }
  function skip() { finish(); }
  function close() { finish(); }
  function finish() {
    if (overlay) {
      overlay.classList.remove('show');
      setTimeout(() => { if (overlay) { overlay.remove(); overlay = null; } }, 250);
    }
    if (onDoneCb) try { onDoneCb(); } catch (_) { }
    onDoneCb = null;
  }

  // Steps mặc định theo stage (caller có thể truyền steps tự định nghĩa nếu muốn)
  function defaultSteps(stage) {
    const common = [
      { icon: '🔥', title: 'Streak — chuỗi ngày học liên tiếp',
        body: 'Mỗi ngày làm ít nhất 1 đề là streak +1. Nếu quên 1 ngày, app tự dùng <b>🛡️ bùa cứu</b> (3 bùa/tháng). Streak 7/14/30/100 ngày nhận <b>sticker đặc biệt</b>!' },
      { icon: '⚙️', title: 'Cài đặt cá nhân',
        body: 'Vào <b>Tài khoản</b> để bật/tắt âm thanh, rung, đổi avatar. THCS/THPT thêm: đặt ngày thi (đếm ngược) + mã PIN cho phụ huynh xem từ xa.',
        ctaLabel: 'Mở Tài khoản', ctaUrl: '/tai-khoan' },
    ];
    if (stage === 'tieu-hoc') return [
      { icon: '👋', title: 'Chào mừng đến Bé Học Vui!',
        body: 'Bé sẽ có 1 con <b>rồng nhỏ</b> riêng — càng học sao càng nhiều, rồng càng <b>lớn lên</b> qua 4 giai đoạn: 🥚 Trứng → 🐣 Bé con → 🐱 Trẻ con → 🦊 Trưởng thành.' },
      { icon: '⭐', title: 'Sao + Sticker',
        body: 'Mỗi câu đúng = 1 sao. Có <b>14 sticker</b> sưu tập: thường (làm xong đề mới), hiếm (100% lần đầu), huyền thoại (streak dài).' },
      ...common,
      { icon: '📅', title: 'Bắt đầu nào!',
        body: 'Trang chủ có <b>"Đề hôm nay"</b> — 3 đề Toán/Tiếng Việt/Tiếng Anh đúng lớp của bé. Làm xong sẽ kiếm sao + giữ streak.' },
    ];
    if (stage === 'thcs') return [
      { icon: '👋', title: 'Chào mừng đến Bé Học Vui!',
        body: 'Web học bám đúng chương trình GDPT 2018 (bộ Kết nối tri thức). Có cả <b>luyện tập + đề thi thử bấm giờ</b> như thi thật.' },
      { icon: '⭐', title: 'Sao, huy hiệu + bảng xếp hạng',
        body: 'Mỗi câu đúng = 1 sao. Có <b>22 huy hiệu</b> để mở khóa. <a href="/bang-xep-hang">Bảng xếp hạng</a> theo tuần — so kiến thức với bạn cùng lớp.' },
      ...common,
      { icon: '🏅', title: 'Thử thách tuần',
        body: 'Mỗi tuần có 1 đề <b>khó</b> được chọn riêng cho bạn. Đạt ≥ 80% → +50 sao bonus. Thử ngay từ trang chủ nhé!' },
    ];
    if (stage === 'thpt') return [
      { icon: '👋', title: 'Chào mừng đến Bé Học Vui!',
        body: 'Web luyện thi tốt nghiệp THPT + ĐGNL miễn phí. Có <b>dashboard cá nhân</b> 2 cột (cột trái thông tin, cột phải gợi ý) ở <a href="/tien-trinh">/tien-trinh</a>.' },
      { icon: '🥉', title: '5 rank — Đồng → Bậc thầy',
        body: 'Mỗi câu đúng = 1 sao. <b>Đồng</b> (0-99) → <b>Bạc</b> (100-499) → <b>Vàng</b> (500-1999) → <b>Kim Cương</b> (2000-4999) → <b>Bậc thầy</b> (5000+).' },
      { icon: '🔁', title: 'Ôn câu sai + Luyện chuyên đề yếu',
        body: 'Mỗi câu sai tự động vào hàng đợi <a href="/on-tap-cau-sai">/on-tap-cau-sai</a>. App tự phát hiện chuyên đề yếu nhất → tạo 10 câu ôn tại <a href="/luyen-chuyen-de">/luyen-chuyen-de</a>.' },
      ...common,
      { icon: '🏅', title: 'Thử thách tuần + Ngày thi',
        body: 'Mỗi tuần 1 đề khó +50 sao bonus. Đặt ngày thi trong Tài khoản → trang chủ hiện đếm ngược.' },
    ];
    return common;
  }

  return { show, next, prev, skip, close, defaultSteps };
})();
if (typeof window !== 'undefined') window.Tour = Tour;
