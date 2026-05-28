// App chính — SPA hash routing
const SUBJECTS = {
  toan: { name: 'Toán', icon: '🔢', cls: 'toan' },
  'tieng-viet': { name: 'Tiếng Việt', icon: '📖', cls: 'tv' },
  'ngu-van': { name: 'Ngữ văn', icon: '📖', cls: 'tv' },
  'tieng-anh': { name: 'Tiếng Anh', icon: '🌍', cls: 'ta' },
  'vat-li': { name: 'Vật lí', icon: '⚛️', cls: 'toan' },
  'hoa-hoc': { name: 'Hóa học', icon: '🧪', cls: 'tv' },
  'sinh-hoc': { name: 'Sinh học', icon: '🧬', cls: 'toan' },
  'lich-su': { name: 'Lịch sử', icon: '📜', cls: 'tv' },
  'dia-li': { name: 'Địa lí', icon: '🌏', cls: 'ta' },
  'gdkt-pl': { name: 'GD Kinh tế & Pháp luật', icon: '⚖️', cls: 'ta' },
};
// Môn theo cấp học
const PRIMARY_SUBJECT_KEYS = ['toan', 'tieng-viet', 'tieng-anh'];
const THCS_SUBJECT_KEYS = ['toan', 'ngu-van', 'tieng-anh'];
const THPT_SUBJECT_KEYS = ['toan', 'ngu-van', 'tieng-anh', 'vat-li', 'hoa-hoc', 'sinh-hoc', 'lich-su', 'dia-li', 'gdkt-pl'];

// Mầm non: lĩnh vực phát triển (3-5 tuổi)
const PRESCHOOL = {
  'mau-sac': { name: 'Màu sắc', icon: '🎨' },
  'con-vat': { name: 'Con vật', icon: '🐶' },
  'dem-so': { name: 'Đếm số', icon: '🔢' },
  'hinh-khoi': { name: 'Hình khối & So sánh', icon: '🔺' },
  'chu-cai': { name: 'Chữ cái', icon: '🔤' },
  'cam-xuc': { name: 'Cảm xúc', icon: '😊' },
  'do-vat': { name: 'Đồ vật', icon: '🧸' },
};
const PRESCHOOL_AGES = [3, 4, 5];

const AVATARS = ['🦊', '🐼', '🐯', '🐰', '🦄', '🐲', '🐧', '🦉', '🐨', '🦁', '🐢', '🐝'];

// Huy hiệu — mở khóa theo thống kê (stars, số bài hoàn thành, số bài điểm tuyệt đối)
const BADGES = [
  { icon: '🌱', name: 'Mầm non', desc: 'Hoàn thành bài đầu tiên', earned: s => s.completedCount >= 1 },
  { icon: '⭐', name: 'Ngôi sao nhỏ', desc: 'Đạt 20 sao', earned: s => s.stars >= 20 },
  { icon: '🏅', name: 'Chăm chỉ', desc: 'Hoàn thành 5 bài', earned: s => s.completedCount >= 5 },
  { icon: '💯', name: 'Hoàn hảo', desc: 'Đạt điểm tuyệt đối 1 bài', earned: s => s.perfectCount >= 1 },
  { icon: '🌟', name: 'Ngôi sao sáng', desc: 'Đạt 50 sao', earned: s => s.stars >= 50 },
  { icon: '🏆', name: 'Nhà vô địch', desc: '10 bài điểm tuyệt đối', earned: s => s.perfectCount >= 10 },
  { icon: '💎', name: 'Kim cương', desc: 'Đạt 100 sao', earned: s => s.stars >= 100 },
  { icon: '👑', name: 'Bậc thầy', desc: 'Hoàn thành 20 bài', earned: s => s.completedCount >= 20 },
];

let CATALOG = null;

// ===== Routing =====
async function route() {
  const hash = window.location.hash.slice(1) || '/';
  const view = document.getElementById('view');
  view.innerHTML = '<div class="empty"><div class="emoji">⏳</div><div class="msg">Đang tải...</div></div>';
  updateHeader();

  if (!CATALOG) {
    try {
      CATALOG = await (await fetch('exercises/index.json')).json();
    } catch (e) {
      view.innerHTML = `<div class="empty"><div class="emoji">📭</div><div class="msg">Chưa có đề bài. Chạy <code>node tools/build-index.js</code>.</div></div>`;
      return;
    }
  }

  const parts = hash.split('/').filter(Boolean);
  if (parts.length === 0) return renderHome(view);
  if (parts[0] === 'thanh-tich') return renderAchievements(view);
  if (parts[0] === 'gioi-thieu') return renderAbout(view);
  if (parts[0] === 'chinh-sach') return renderPolicy(view);
  if (parts[0] === 'faq') return renderFAQ(view);
  if (parts[0] === 'tien-trinh') return renderProgress(view);
  if (parts[0] === 'doi-nhan-vat') return renderAvatarPicker(view, true);
  if (parts[0] === 'mam-non') {
    if (parts.length === 1) return renderPreschoolAges(view);
    const age = parseInt(parts[1].replace('age', ''));
    if (parts.length === 2) return renderPreschoolDomains(view, age);
    return renderPreschoolTopics(view, age, parts[2]);
  }
  if (parts[0].startsWith('lop')) {
    const grade = parseInt(parts[0].replace('lop', ''));
    if (parts.length === 1) return renderSubjects(view, grade);
    return renderTopicList(view, grade, parts[1]);
  }
  if (parts[0] === 'bai' && parts[1]) return renderExercise(view, parts[1]);
  return renderHome(view);
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);

function updateHeader() {
  document.getElementById('star-count').textContent = Progress.getStars();
  const av = Progress.getAvatar();
  document.getElementById('header-avatar').textContent = av || '📚';
}

// ===== Avatar =====
function renderAvatarPicker(view, isChanging) {
  view.innerHTML = `
    <div class="hero" style="padding:30px 10px 20px">
      <h1>${isChanging ? '🎭 Đổi nhân vật' : '👋 Chào bạn nhỏ!'}</h1>
      <p>Chọn một người bạn đồng hành cùng bạn học nhé</p>
    </div>
    <div class="avatar-grid">
      ${AVATARS.map(a => `<button class="avatar-pick" data-a="${a}">${a}</button>`).join('')}
    </div>
  `;
  view.querySelectorAll('.avatar-pick').forEach(btn => {
    btn.onclick = () => {
      Progress.setAvatar(btn.dataset.a);
      updateHeader();
      window.location.hash = isChanging ? '#/thanh-tich' : '#/';
    };
  });
}

// ===== Views =====
function renderHome(view) {
  const total = CATALOG.exercises.length;
  const av = Progress.getAvatar();
  view.innerHTML = `
    <section class="hero-pro">
      <h1>Học vui mỗi ngày, vững vàng mỗi kỳ thi</h1>
      <p class="hero-sub">Bài tập &amp; đề thi thử bám sát chương trình GDPT 2018 — từ Mầm non đến THPT. Hiện có <b>${total}</b> bộ đề, hoàn toàn miễn phí.</p>
      <div class="hero-cta">
        <button class="btn btn-primary" onclick="document.getElementById('cap-hoc').scrollIntoView({behavior:'smooth'})">Bắt đầu học</button>
        <a href="#/gioi-thieu" class="btn btn-secondary">Tìm hiểu thêm</a>
      </div>
      ${av ? '' : '<a href="#/doi-nhan-vat" class="avatar-hint">🐾 Chọn một nhân vật học tập đồng hành cùng bạn</a>'}
    </section>

    ${renderDailyHomeSection()}

    <section class="features" aria-label="Điểm nổi bật">
      <div class="feature"><div class="f-icon">📋</div><div class="f-text"><b>Bám chương trình</b><span>Theo yêu cầu cần đạt GDPT 2018 (Kết nối tri thức)</span></div></div>
      <div class="feature"><div class="f-icon">📝</div><div class="f-text"><b>Luyện thi thật</b><span>Đề thi thử bấm giờ, đúng cấu trúc thi tốt nghiệp &amp; ĐGNL</span></div></div>
      <div class="feature"><div class="f-icon">🎯</div><div class="f-text"><b>Chấm điểm ngay</b><span>Trắc nghiệm, điền đáp án, đúng/sai, ghép cặp</span></div></div>
      <div class="feature"><div class="f-icon">⭐</div><div class="f-text"><b>Vui &amp; có thưởng</b><span>Sao, huy hiệu, nhân vật đồng hành</span></div></div>
    </section>

    <h2 class="home-section" id="cap-hoc">Chọn cấp học</h2>
    <a href="#/mam-non" class="preschool-banner">
      <span class="pb-icon">🧸</span>
      <span class="pb-text"><b>Khu Mầm Non</b><small>Cho bé 3 – 5 tuổi · chạm tranh, nghe đọc</small></span>
      <span class="pb-arrow">→</span>
    </a>
    <h3 class="home-subsection">🎒 Tiểu học</h3>
    <div class="grade-grid">
      ${[1, 2, 3, 4, 5].map(g => `
        <a href="#/lop${g}" class="grade-card">
          <div class="num">${g}</div>
          <div class="label">Lớp ${g}</div>
        </a>`).join('')}
    </div>
    <h3 class="home-subsection">📚 Trung học cơ sở</h3>
    <div class="grade-grid">
      ${[6, 7, 8, 9].map(g => `
        <a href="#/lop${g}" class="grade-card thcs">
          <div class="num">${g}</div>
          <div class="label">Lớp ${g}</div>
        </a>`).join('')}
    </div>
    <h3 class="home-subsection">🎓 Trung học phổ thông</h3>
    <div class="grade-grid">
      ${[10, 11, 12].map(g => `
        <a href="#/lop${g}" class="grade-card thpt">
          <div class="num">${g}</div>
          <div class="label">Lớp ${g}</div>
        </a>`).join('')}
    </div>
  `;
}

function renderDailyHomeSection() {
  const today = Progress.getTodayDaily().subjects || {};
  const streak = Progress.getStreak();
  const grade = Daily.getGrade();
  const cards = Daily.SUBJECTS.map(s => {
    const r = today[s.key];
    return `<a href="#/bai/daily-${grade}-${s.key}" class="daily-card ${r ? 'done' : ''}">
        <span class="dc-icon">${s.icon}</span>
        <span class="dc-name">${s.name}</span>
        <span class="dc-status">${r ? `✓ ${r.score}/${r.total}` : 'Chưa làm'}</span>
      </a>`;
  }).join('');
  const gradeTabs = Daily.GRADES.map(g =>
    `<button class="daily-grade-tab ${g === grade ? 'active' : ''}" onclick="setDailyGrade(${g})">Lớp ${g}</button>`
  ).join('');
  const doneCount = Daily.SUBJECTS.filter(s => today[s.key]).length;
  const allDone = doneCount === Daily.SUBJECTS.length;
  return `
    <section class="daily-section">
      <div class="daily-head">
        <h2>📅 Đề hôm nay <small>· Lớp ${grade}</small></h2>
        <div class="daily-meta">
          ${streak > 0 ? `<span class="streak">🔥 ${streak} ngày</span>` : ''}
          <a href="#/tien-trinh" class="daily-progress-link">Xem tiến trình →</a>
        </div>
      </div>
      <div class="daily-grade-tabs" role="tablist" aria-label="Chọn lớp">${gradeTabs}</div>
      ${allDone
        ? '<div class="daily-banner ok">🎉 Tuyệt vời! Bạn đã hoàn thành cả 3 đề hôm nay.</div>'
        : `<div class="daily-banner">⏰ Hôm nay đã làm ${doneCount}/3 đề — cố gắng hoàn thành nhé!</div>`}
      <div class="daily-grid">${cards}</div>
    </section>`;
}

// Đổi lớp cho "Đề hôm nay" rồi vẽ lại trang chủ
window.setDailyGrade = function (g) {
  Daily.setGrade(g);
  route();
};

function renderProgress(view) {
  const month = Progress.getMonthInfo();
  const log = Progress.getDailyLog();
  const streak = Progress.getStreak();
  const subjStats = Progress.getSubjectStats();

  const weekHead = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
    .map(w => `<div class="cal-dow">${w}</div>`).join('');
  const blanks = Array.from({ length: month.leading }, () => '<div class="hm-cell blank"></div>').join('');
  const dayCells = month.days.map(d => {
    const day = log[d.key];
    let pct = null, count = 0;
    if (day) {
      const subs = Object.values(day.subjects || {});
      count = subs.length;
      const sc = subs.reduce((a, r) => a + r.score, 0);
      const tt = subs.reduce((a, r) => a + r.total, 0);
      pct = tt ? Math.round(sc / tt * 100) : 0;
    }
    const lvl = pct === null ? 'none' : pct >= 80 ? 'l4' : pct >= 60 ? 'l3' : pct >= 40 ? 'l2' : 'l1';
    const cls = ['hm-cell', lvl, d.isToday ? 'today' : '', d.isFuture ? 'future' : ''].filter(Boolean).join(' ');
    const title = `${d.key}${pct !== null ? ` · ${count} đề · ${pct}%` : (d.isFuture ? ' · sắp tới' : ' · chưa làm')}`;
    return `<div class="${cls}" title="${title}">${d.dom}</div>`;
  }).join('');

  const SUB = { toan: 'Toán', 'tieng-viet': 'Tiếng Việt', 'tieng-anh': 'Tiếng Anh' };
  const rows = Object.keys(SUB).map(s => {
    const st = subjStats[s];
    const pct = st && st.total ? Math.round(st.score / st.total * 100) : null;
    const spd = st && st.total && st.timeMs ? (st.timeMs / 1000 / st.total) : null;
    return { name: SUB[s], pct, spd };
  });
  const done = rows.filter(r => r.pct !== null);
  const weak = done.length ? done.reduce((a, b) => (b.pct < a.pct ? b : a)) : null;
  const activeDays = Progress.getActiveDays();
  const avgSpeed = Progress.getAvgSecPerQ();

  view.innerHTML = `
    <a href="#/" class="back-btn">← Về trang chủ</a>
    <div class="hero" style="padding:16px 10px 14px"><h1>📈 Tiến trình</h1><p>Lịch tháng này · số liệu phân tích theo 28 ngày gần nhất</p></div>
    <div class="achv-stats">
      <div class="achv-stat"><div class="n">🔥 ${streak}</div><div class="l">Ngày liên tiếp</div></div>
      <div class="achv-stat"><div class="n">📅 ${activeDays}</div><div class="l">Ngày có học (28n)</div></div>
      <div class="achv-stat"><div class="n">⚡ ${avgSpeed !== null ? Math.round(avgSpeed) + 's' : '—'}</div><div class="l">Giây/câu (TB)</div></div>
    </div>
    <h2 class="home-section">📅 ${month.label}</h2>
    <div class="cal-head">${weekHead}</div>
    <div class="heatmap month-cal">${blanks}${dayCells}</div>
    <div class="hm-legend">Ít <span class="hm-cell l1"></span><span class="hm-cell l2"></span><span class="hm-cell l3"></span><span class="hm-cell l4"></span> Nhiều / đúng cao · <span class="hm-cell today legend-today"></span> hôm nay</div>
    <h2 class="home-section">Kết quả theo môn <small style="font-weight:600;color:var(--c-text-soft)">(28 ngày gần nhất)</small></h2>
    <div class="subj-stats">
      ${rows.map(r => `<div class="subj-row"><span class="sr-name">${r.name}</span><div class="sr-bar"><div class="sr-fill" style="width:${r.pct || 0}%"></div></div><span class="sr-pct">${r.pct !== null ? r.pct + '%' : '—'}</span><span class="sr-spd">${r.spd !== null ? Math.round(r.spd) + 's/câu' : ''}</span></div>`).join('')}
    </div>
    ${weak && done.length > 1 ? `<p class="about-note">💡 Nên ôn thêm môn <b>${weak.name}</b> (đang ${weak.pct}%).</p>` : ''}
    ${activeDays === 0 ? '<div class="empty"><div class="emoji">📭</div><div class="msg">Chưa có dữ liệu. Hãy làm "Đề hôm nay" trên trang chủ để bắt đầu ghi tiến trình!</div></div>' : ''}
  `;
}

function renderAbout(view) {
  view.innerHTML = `
    <a href="#/" class="back-btn">← Về trang chủ</a>
    <article class="about">
      <h1>Giới thiệu Bé Học Vui</h1>
      <p><b>Bé Học Vui</b> là nền tảng học và luyện tập <b>miễn phí</b>, giúp học sinh ôn luyện đúng chương trình và chuẩn bị cho các kỳ thi — từ Mầm non đến THPT.</p>
      <h2>Dành cho ai?</h2>
      <ul>
        <li><b>Mầm non (3–5 tuổi):</b> màu sắc, con vật, đếm số, hình khối — chạm tranh, nghe đọc, chưa cần biết chữ.</li>
        <li><b>Tiểu học (1–5):</b> Toán, Tiếng Việt, Tiếng Anh.</li>
        <li><b>THCS (6–9):</b> Toán, Ngữ văn, Tiếng Anh.</li>
        <li><b>THPT (10–12):</b> Toán, Ngữ văn, Tiếng Anh, Vật lí, Hóa học, Sinh học, Lịch sử, Địa lí, GDKT-PL.</li>
      </ul>
      <h2>Cách dùng</h2>
      <p>Chọn cấp học → lớp → môn → bài. Mỗi bài chấm điểm ngay, có chế độ <b>Luyện tập</b> (biết đúng/sai từng câu) và <b>Làm bài thi</b> (chấm cuối). Riêng <b>đề thi thử</b> có bấm giờ như phòng thi.</p>
      <h2>Cam kết chất lượng</h2>
      <p>Đề được biên soạn <b>bám yêu cầu cần đạt của chương trình GDPT 2018</b> (bộ Kết nối tri thức) và tham khảo cấu trúc đề thi thật. Mỗi câu gắn nhãn chủ đề và mức độ tư duy (Nhận biết / Thông hiểu / Vận dụng / Vận dụng cao).</p>
      <p class="about-note">⚠️ Nội dung mang tính tham khảo. Đáp án các môn khoa học – xã hội và tự luận nên được giáo viên hoặc phụ huynh kiểm tra trước khi dùng chính thức.</p>
      <h2>Liên hệ</h2>
      <p>Mọi góp ý xin gửi tới quản trị viên của trang để chúng tôi hoàn thiện nội dung. <em>(Bạn có thể cập nhật thông tin liên hệ cụ thể tại đây.)</em></p>
    </article>
  `;
}

function renderPolicy(view) {
  view.innerHTML = `
    <a href="#/" class="back-btn">← Về trang chủ</a>
    <article class="about">
      <h1>Chính sách & Điều khoản</h1>

      <h2>1. Quyền riêng tư</h2>
      <p><b>Bé Học Vui không thu thập thông tin cá nhân.</b> Trang không yêu cầu đăng ký, không đăng nhập, không có máy chủ lưu dữ liệu người dùng.</p>
      <ul>
        <li>Tiến độ học (sao, huy hiệu, nhân vật, kết quả bài làm) chỉ được lưu trong <b>bộ nhớ trình duyệt (localStorage)</b> trên chính thiết bị của bạn — <b>không gửi đi đâu</b>.</li>
        <li>Không dùng cookie theo dõi, không quảng cáo, không chia sẻ dữ liệu cho bên thứ ba.</li>
        <li>Vì dữ liệu nằm trên thiết bị nên nếu xóa dữ liệu trình duyệt hoặc đổi máy, tiến độ sẽ mất và không đồng bộ giữa các thiết bị.</li>
        <li>Trang phù hợp cho trẻ em do không thu thập dữ liệu cá nhân.</li>
      </ul>
      <p>Một số thư viện hiển thị (phông chữ, biểu tượng, công thức) được tải từ dịch vụ CDN công cộng (Google Fonts, jsDelivr) — các dịch vụ này có thể ghi nhận yêu cầu tải tệp theo chính sách riêng của họ.</p>

      <h2>2. Điều khoản sử dụng</h2>
      <ul>
        <li>Trang được cung cấp <b>miễn phí</b> cho mục đích học tập, ôn luyện.</li>
        <li>Nội dung được biên soạn <b>tham khảo</b>, bám chương trình GDPT 2018 nhưng <b>có thể có sai sót</b>; không thay thế cho sách giáo khoa, giáo viên hay đề thi chính thức.</li>
        <li>Phụ huynh/giáo viên nên kiểm tra đáp án trước khi dùng chính thức, đặc biệt với các môn khoa học – xã hội và câu tự luận.</li>
        <li>Trang được cung cấp "nguyên trạng", không kèm bảo đảm về tính chính xác tuyệt đối.</li>
      </ul>

      <h2>3. Bản quyền & nguồn</h2>
      <ul>
        <li>Các câu hỏi do nhóm biên soạn tạo mới (đề gốc), không sao chép nguyên văn đề thi có bản quyền.</li>
        <li>Biểu tượng minh họa: <a href="https://github.com/jdecked/twemoji" target="_blank" rel="noopener">Twemoji</a> — giấy phép CC-BY 4.0.</li>
        <li>Hiển thị công thức: <a href="https://katex.org" target="_blank" rel="noopener">KaTeX</a> (MIT). Phông chữ: Nunito (Google Fonts, OFL).</li>
      </ul>
      <p class="about-note">Đây là chính sách mẫu cho trang học tập phi lợi nhuận. Bạn có thể chỉnh lại cho phù hợp nhu cầu thực tế.</p>
    </article>
  `;
}

function renderFAQ(view) {
  const faqs = [
    ['Trang web có miễn phí không?', 'Có, hoàn toàn miễn phí. Không thu phí, không quảng cáo.'],
    ['Có cần đăng ký hay đăng nhập không?', 'Không. Bạn vào là học được ngay. Tiến độ tự lưu trên trình duyệt của bạn.'],
    ['Tiến độ học của tôi được lưu ở đâu?', 'Lưu trong bộ nhớ trình duyệt (localStorage) trên chính thiết bị bạn đang dùng. Nếu xóa dữ liệu trình duyệt hoặc dùng máy khác, tiến độ sẽ không còn và không đồng bộ giữa các thiết bị.'],
    ['Nội dung bám theo chương trình/sách nào?', 'Bám chương trình GDPT 2018, chủ yếu theo bộ sách Kết nối tri thức với cuộc sống. Đề thi thử tham khảo cấu trúc thi tốt nghiệp THPT và đánh giá năng lực.'],
    ['Đáp án có chính xác 100% không?', 'Đề được biên soạn tham khảo và đã kiểm tra; phần số học tiểu học còn được máy tự kiểm tra lại. Tuy nhiên vẫn nên nhờ giáo viên/phụ huynh rà soát, nhất là môn khoa học – xã hội và câu tự luận.'],
    ['Học được trên điện thoại, máy tính bảng không?', 'Được. Giao diện tự co giãn theo màn hình, nút bấm to dễ dùng trên cảm ứng.'],
    ['Đề thi thử hoạt động thế nào?', 'Đề thi thử có bấm giờ như phòng thi: đồng hồ đếm ngược, hết giờ tự nộp, chấm điểm ở cuối và xem lại từng câu đúng/sai.'],
    ['Phần mầm non có giọng đọc nhưng không kêu?', 'Giọng đọc dùng bộ đọc tiếng Việt có sẵn của thiết bị/trình duyệt; máy nào không có giọng tiếng Việt sẽ không đọc. Đây là tính năng bổ trợ, bài vẫn làm được bằng hình.'],
    ['Làm sao xóa tiến độ hoặc đổi nhân vật?', 'Vào trang "Thành tích" — có nút Đổi nhân vật và Xóa tiến độ.'],
    ['Tôi muốn góp ý hoặc báo lỗi trong đề thì làm thế nào?', 'Xin gửi góp ý tới quản trị viên qua thông tin ở trang Giới thiệu. Mọi phản hồi giúp hoàn thiện nội dung.'],
  ];
  view.innerHTML = `
    <a href="#/" class="back-btn">← Về trang chủ</a>
    <article class="about">
      <h1>Câu hỏi thường gặp (FAQ)</h1>
      <div class="faq-list">
        ${faqs.map(([q, a]) => `
          <details class="faq-item">
            <summary>${q}</summary>
            <div class="faq-answer">${a}</div>
          </details>`).join('')}
      </div>
    </article>
  `;
}

// ===== Mầm non =====
function renderPreschoolAges(view) {
  view.innerHTML = `
    <a href="#/" class="back-btn">← Về trang chủ</a>
    <div class="hero"><h1>🧸 Khu Mầm Non</h1><p>Bé mấy tuổi nào?</p></div>
    <div class="grade-grid">
      ${PRESCHOOL_AGES.map(a => `
        <a href="#/mam-non/age${a}" class="grade-card mn">
          <div class="num">${a}</div>
          <div class="label">${a} tuổi</div>
        </a>`).join('')}
    </div>
  `;
}

function renderPreschoolDomains(view, age) {
  if (!PRESCHOOL_AGES.includes(age)) { window.location.hash = '#/mam-non'; return; }
  const counts = {};
  for (const k of Object.keys(PRESCHOOL))
    counts[k] = CATALOG.exercises.filter(e => e.stage === 'mam-non' && e.subject === k && e.grade === age).length;
  view.innerHTML = `
    <a href="#/mam-non" class="back-btn">← Chọn tuổi khác</a>
    <div class="hero" style="padding:20px 10px 30px"><h1>Bé ${age} tuổi</h1><p>Chọn trò chơi nhé!</p></div>
    <div class="subject-grid">
      ${Object.entries(PRESCHOOL).map(([k, d]) => `
        <a href="#/mam-non/age${age}/${k}" class="subject-card mn">
          <div class="icon">${d.icon}</div>
          <div class="name">${d.name}</div>
          <div class="count">${counts[k]} trò chơi</div>
        </a>`).join('')}
    </div>
  `;
}

function renderPreschoolTopics(view, age, domain) {
  const d = PRESCHOOL[domain];
  if (!d) { window.location.hash = '#/mam-non'; return; }
  const list = CATALOG.exercises.filter(e => e.stage === 'mam-non' && e.grade === age && e.subject === domain);
  view.innerHTML = `
    <a href="#/mam-non/age${age}" class="back-btn">← Quay lại</a>
    <div class="hero" style="padding:20px 10px 30px"><h1>${d.icon} ${d.name}</h1><p>Bé ${age} tuổi</p></div>
    ${list.length === 0
      ? `<div class="empty"><div class="emoji">🧸</div><div class="msg">Sắp có trò chơi mới nhé!</div></div>`
      : `<div class="topic-list">${list.map(ex => {
          const done = Progress.getCompletion(ex.id);
          return `<a href="#/bai/${ex.id}" class="topic-item">
            <div><div class="title">${ex.topic}</div><div class="meta">${ex.questionCount} câu</div></div>
            ${done ? `<span class="badge">★ ${done.bestScore}/${done.total}</span>` : ''}
          </a>`;
        }).join('')}</div>`}
  `;
}

function renderSubjects(view, grade) {
  const keys = grade >= 10 ? THPT_SUBJECT_KEYS : grade >= 6 ? THCS_SUBJECT_KEYS : PRIMARY_SUBJECT_KEYS;
  const counts = {};
  for (const key of keys)
    counts[key] = CATALOG.exercises.filter(e => e.subject === key && e.grade === grade).length;
  view.innerHTML = `
    <a href="#/" class="back-btn">← Quay lại chọn lớp</a>
    <div class="hero" style="padding:20px 10px 30px"><h1>Lớp ${grade}</h1><p>Chọn môn học để bắt đầu</p></div>
    <div class="subject-grid">
      ${keys.map(key => { const s = SUBJECTS[key]; return `
        <a href="#/lop${grade}/${key}" class="subject-card ${s.cls}">
          <div class="icon">${s.icon}</div>
          <div class="name">${s.name}</div>
          <div class="count">${counts[key]} bài tập</div>
        </a>`; }).join('')}
    </div>
  `;
}

function renderTopicList(view, grade, subject) {
  const s = SUBJECTS[subject];
  if (!s) { window.location.hash = '#/'; return; }
  const list = CATALOG.exercises.filter(e => e.grade === grade && e.subject === subject);
  view.innerHTML = `
    <a href="#/lop${grade}" class="back-btn">← Quay lại môn lớp ${grade}</a>
    <div class="hero" style="padding:20px 10px 30px"><h1>${s.icon} ${s.name} - Lớp ${grade}</h1><p>Chọn bài tập để làm</p></div>
    ${list.length === 0
      ? `<div class="empty"><div class="emoji">📭</div><div class="msg">Chưa có bài nào. Sắp có rồi nhé!</div></div>`
      : `<div class="topic-list">${list.map(ex => {
          const done = Progress.getCompletion(ex.id);
          return `<a href="#/bai/${ex.id}" class="topic-item">
              <div><div class="title">${ex.timeLimit ? '📝 ' : ''}${ex.topic}</div>
              <div class="meta">${ex.questionCount} câu · Độ khó ${'⭐'.repeat(ex.difficulty || 1)}${ex.timeLimit ? ` · ⏱ ${ex.timeLimit} phút (đề thi thử)` : ''}</div></div>
              ${done ? `<span class="badge">★ ${done.bestScore}/${done.total}</span>` : ''}
            </a>`;
        }).join('')}</div>`}
  `;
}

function renderAchievements(view) {
  const stats = Progress.getStats();
  const av = Progress.getAvatar() || '📚';
  const earnedCount = BADGES.filter(b => b.earned(stats)).length;
  view.innerHTML = `
    <a href="#/" class="back-btn">← Về trang chủ</a>
    <div class="result-card" style="margin-bottom:20px">
      <div style="font-size:4.5rem">${av}</div>
      <div class="result-title">Thành tích của bé</div>
      <div class="achv-stats">
        <div class="achv-stat"><div class="n">⭐ ${stats.stars}</div><div class="l">Tổng sao</div></div>
        <div class="achv-stat"><div class="n">📚 ${stats.completedCount}</div><div class="l">Bài đã làm</div></div>
        <div class="achv-stat"><div class="n">💯 ${stats.perfectCount}</div><div class="l">Điểm tuyệt đối</div></div>
      </div>
    </div>
    <h2 style="margin:10px 4px">🏅 Huy hiệu (${earnedCount}/${BADGES.length})</h2>
    <div class="badge-grid">
      ${BADGES.map(b => {
        const got = b.earned(stats);
        return `<div class="badge-card ${got ? 'earned' : 'locked'}">
          <div class="badge-icon">${got ? b.icon : '🔒'}</div>
          <div class="badge-name">${b.name}</div>
          <div class="badge-desc">${b.desc}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="action-bar" style="justify-content:center;margin-top:24px">
      <a href="#/doi-nhan-vat" class="btn btn-secondary">🎭 Đổi nhân vật</a>
      <button class="btn btn-secondary" id="reset-btn" style="color:#EF5350">🗑️ Xóa tiến độ</button>
    </div>
  `;
  view.querySelector('#reset-btn').onclick = () => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ tiến độ và sao không?')) {
      Progress.reset();
      window.location.hash = '#/';
    }
  };
}

async function renderExercise(view, id) {
  let exercise;
  if (id.indexOf('daily-') === 0) {
    exercise = await Daily.getExercise(id);
    if (!exercise) { view.innerHTML = '<div class="empty">Chưa có đề hôm nay cho mục này.</div>'; return; }
  } else {
    const meta = CATALOG.exercises.find(e => e.id === id);
    if (!meta) { view.innerHTML = '<div class="empty">Không tìm thấy bài này.</div>'; return; }
    try {
      exercise = await (await fetch(`exercises/${meta.path}`)).json();
    } catch (e) {
      view.innerHTML = `<div class="empty">Không tải được bài: ${meta.path}</div>`;
      return;
    }
  }
  const isPreschool = exercise.stage === 'mam-non';
  const subject = isPreschool ? PRESCHOOL[exercise.subject] : SUBJECTS[exercise.subject];
  const backHref = exercise.daily
    ? '#/'
    : isPreschool
      ? `#/mam-non/age${exercise.grade}/${exercise.subject}`
      : `#/lop${exercise.grade}/${exercise.subject}`;
  const levelLabel = isPreschool ? `Bé ${exercise.grade} tuổi` : `Lớp ${exercise.grade}`;

  const isTimed = typeof exercise.timeLimit === 'number' && exercise.timeLimit > 0;

  // Mầm non: vào thẳng chế độ chơi (không có "Làm bài thi")
  if (isPreschool) { startQuestions('practice'); return; }
  // Đề thi thử có bấm giờ: vào thẳng chế độ thi
  if (isTimed) { startQuestions('exam'); return; }

  // Tiểu học / THCS: chọn chế độ
  view.innerHTML = `
    <a href="${backHref}" class="back-btn">← Quay lại danh sách bài</a>
    <div class="hero" style="padding:14px 10px 22px">
      <h1>${subject.icon} ${exercise.topic}</h1>
      <p>${levelLabel} · ${exercise.questions.length} câu · Chọn cách làm bài</p>
    </div>
    <div class="mode-grid">
      <button class="mode-card practice" data-mode="practice">
        <div class="icon">🎯</div><div class="name">Luyện tập</div>
        <div class="desc">Biết đúng/sai ngay sau mỗi câu, có gợi ý</div>
      </button>
      <button class="mode-card exam" data-mode="exam">
        <div class="icon">📝</div><div class="name">Làm bài thi</div>
        <div class="desc">Làm hết rồi mới chấm điểm, giống thi thật</div>
      </button>
    </div>
  `;
  view.querySelectorAll('.mode-card').forEach(btn => {
    btn.onclick = () => startQuestions(btn.dataset.mode);
  });

  // Bước 2: làm bài
  function startQuestions(mode) {
    let currentIdx = 0, score = 0;
    const total = exercise.questions.length;
    const answers = [];
    const timed = typeof exercise.timeLimit === 'number' && exercise.timeLimit > 0;
    const deadline = Date.now() + (exercise.timeLimit || 0) * 60000;
    let timerInterval = null, done = false;
    // Đo thời gian làm bài. Hiện đồng hồ đếm xuôi cho THCS/THPT (không phải đề bấm giờ); cấp nhỏ đo ngầm.
    const startTime = Date.now();
    const showCountUp = !timed && (exercise.stage === 'thcs' || exercise.stage === 'thpt');
    let elapsedInterval = null;

    const renderQuestion = () => {
      const q = exercise.questions[currentIdx];
      const modeLabel = timed ? '⏱ Đề thi thử' : (isPreschool ? '🧸 Chơi mà học' : (mode === 'exam' ? '📝 Làm bài thi' : '🎯 Luyện tập'));
      view.innerHTML = `
        <a href="${backHref}" class="back-btn">← Thoát</a>
        <div class="exercise-header">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
            <div><div style="font-weight:800;font-size:1.2rem">${subject.icon} ${exercise.topic}</div>
            <div style="color:#6B6B8C;font-size:0.9rem">${modeLabel} · ${levelLabel}</div></div>
            <div style="display:flex;align-items:center;gap:12px">
              ${timed ? '<span id="exam-timer" class="exam-timer">⏱ --:--</span>' : ''}
              ${showCountUp ? '<span id="elapsed-timer" class="exam-timer up">⏱ 0:00</span>' : ''}
              <span style="font-weight:700;color:#6B6B8C">Câu ${currentIdx + 1}/${total}</span>
            </div>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${(currentIdx / total) * 100}%"></div></div>
        </div>`;

      const onAnswer = (correct) => {
        answers.push({ correct });
        if (correct) score++;
        const delay = isPreschool ? 1700 : (mode === 'exam' ? 250 : 1500);
        setTimeout(() => {
          if (done) return;
          currentIdx++;
          if (currentIdx >= total) showResult();
          else renderQuestion();
        }, delay);
      };

      let card;
      if (q.type === 'image-choice') card = ImageChoice.render(q, currentIdx, onAnswer);
      else if (q.type === 'multiple-choice') card = MultipleChoice.render(q, currentIdx, onAnswer, mode);
      else if (q.type === 'fill-blank') card = FillBlank.render(q, currentIdx, onAnswer, mode);
      else if (q.type === 'matching') card = Matching.render(q, currentIdx, onAnswer, mode);
      else if (q.type === 'true-false') card = TrueFalse.render(q, currentIdx, onAnswer, mode);
      else if (q.type === 'true-false-group') card = TrueFalseGroup.render(q, currentIdx, onAnswer, mode);
      else { view.innerHTML += `<div class="empty">Loại câu chưa hỗ trợ: ${q.type}</div>`; return; }
      view.appendChild(card);
      Media.renderMath(card);
    };

    // Đồng hồ đếm ngược cho đề thi thử
    const startTimer = () => {
      const tick = () => {
        const el = document.getElementById('exam-timer');
        if (!el) { clearInterval(timerInterval); return; } // đã rời màn làm bài
        const remain = Math.max(0, deadline - Date.now());
        const s = Math.floor(remain / 1000);
        el.textContent = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
        el.classList.toggle('low', remain <= 60000);
        if (remain <= 0) { clearInterval(timerInterval); showResult(); }
      };
      tick();
      timerInterval = setInterval(tick, 1000);
    };

    // Đồng hồ đếm xuôi (THCS/THPT, đề không bấm giờ)
    const startElapsedTimer = () => {
      const tick = () => {
        const el = document.getElementById('elapsed-timer');
        if (!el) { clearInterval(elapsedInterval); return; }
        const s = Math.floor((Date.now() - startTime) / 1000);
        el.textContent = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      };
      tick();
      elapsedInterval = setInterval(tick, 1000);
    };

    const showResult = () => {
      if (done) return;
      done = true;
      if (timerInterval) clearInterval(timerInterval);
      if (elapsedInterval) clearInterval(elapsedInterval);
      const elapsedMs = Date.now() - startTime;
      const baseline = Progress.getAvgSecPerQ(); // tốc độ TB trước lần này (mốc so sánh là chính bé)
      const percent = Math.round((score / total) * 100);
      const isNewBest = Progress.markCompleted(exercise.id, score, total);
      Progress.addStars(score);
      Progress.recordTime(total, elapsedMs);
      if (exercise.daily) Progress.recordDaily(exercise.subject, score, total, elapsedMs);
      updateHeader();

      let emoji, title;
      if (percent === 100) { emoji = '🏆'; title = 'XUẤT SẮC!'; }
      else if (percent >= 80) { emoji = '🌟'; title = 'Rất giỏi!'; }
      else if (percent >= 50) { emoji = '👍'; title = 'Khá tốt!'; }
      else { emoji = '💪'; title = 'Cố gắng thêm nhé!'; }

      const recap = answers.map((a, i) =>
        `<span class="recap-item ${a.correct ? 'ok' : 'no'}">${i + 1}${a.correct ? ' ✓' : ' ✗'}</span>`
      ).join('');

      // Thời gian + nhận xét (so với tốc độ trung bình của chính học sinh)
      const secPerQ = total ? elapsedMs / 1000 / total : 0;
      const mm = Math.floor(elapsedMs / 60000), ss = Math.floor((elapsedMs % 60000) / 1000);
      const timeStr = mm ? `${mm} phút ${ss} giây` : `${ss} giây`;
      const fast = baseline !== null && secPerQ <= baseline * 1.05; // nhanh hơn/ngang trung bình
      let timeNote = '';
      if (baseline !== null) {
        if (percent >= 80 && fast) timeNote = 'Chính xác và nhanh — xuất sắc! 🚀';
        else if (percent >= 80) timeNote = 'Rất chính xác! Thử làm nhanh hơn một chút nhé.';
        else if (percent < 50 && fast) timeNote = 'Hơi vội rồi — chậm lại và đọc kỹ hơn nhé.';
        else timeNote = 'Cứ bình tĩnh, làm cẩn thận rồi sẽ tiến bộ!';
      }

      view.innerHTML = `
        <div class="result-card">
          <div class="result-emoji">${emoji}</div>
          <div class="result-title">${title}</div>
          <div class="result-score">${score}/${total}</div>
          <div class="result-stars">${'⭐'.repeat(Math.min(score, 10))}</div>
          ${isNewBest ? '<div style="color:#FF8A65;font-weight:700;margin-bottom:10px">🎉 Kỷ lục mới!</div>' : ''}
          <div class="result-time">⏱ ${timeStr} · ~${secPerQ.toFixed(0)} giây/câu</div>
          ${timeNote ? `<div class="time-note">${timeNote}</div>` : ''}
          <div style="color:#6B6B8C;margin:10px 0 16px">Bạn được +${score} ⭐</div>
          <div class="recap">${recap}</div>
          <div class="action-bar" style="justify-content:center;margin-top:22px">
            <button class="btn btn-secondary" onclick="location.hash='${backHref}'">Bài khác</button>
            <button class="btn btn-primary" id="retry-btn">Làm lại</button>
          </div>
        </div>`;
      view.querySelector('#retry-btn').onclick = () => renderExercise(view, id);
      if (percent >= 80) confetti();
    };

    renderQuestion();
    if (timed) startTimer();
    if (showCountUp) startElapsedTimer();
  }
}

// ===== Confetti =====
function confetti() {
  const colors = ['#A8E6CF', '#FFD3B6', '#FFAAA5', '#C9A3FF', '#FFC107'];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.left = Math.random() * 100 + 'vw';
    c.style.top = '-20px';
    c.style.animationDelay = Math.random() * 0.5 + 's';
    c.style.animationDuration = (1.5 + Math.random()) + 's';
    if (Math.random() > 0.5) c.style.borderRadius = '50%';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3000);
  }
}
