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

// ===== Chống thoát nhầm khi đang làm bài =====
// Khi vào màn làm câu hỏi: ẩn chrome điều hướng + chặn rời trang giữa chừng.
let exerciseGuard = null;   // { path } của màn làm bài đang dở; null khi không làm bài
function beginExerciseFocus() {
  exerciseGuard = { path: location.pathname };
  document.body.classList.add('in-exercise');
}
function endExerciseFocus() {
  exerciseGuard = null;
  document.body.classList.remove('in-exercise');
}

// ===== Điều hướng bằng URL thật (History API, không dùng dấu #) =====
// navTo: điều hướng có chủ đích (lập trình). goTo: do người dùng bấm link (có kiểm tra "đang làm bài dở").
function navTo(path) {
  if (path !== location.pathname) history.pushState(null, '', path);
  route();
}
window.navTo = navTo;
function goTo(path) {
  if (exerciseGuard && path !== exerciseGuard.path) {
    if (!window.confirm('Bạn đang làm bài dở. Thoát ra bây giờ sẽ KHÔNG lưu kết quả. Thoát không?')) return;
    endExerciseFocus();
  }
  navTo(path);
}

// ===== SEO: tiêu đề + mô tả riêng cho từng trang (đồng bộ với seo-meta.json do Worker dùng) =====
let SEO_META = null;
let currentPageSeo = null;
async function applySeo(path) {
  const key = ('/' + (path || '')).replace(/\/+$/, '') || '/';
  if (!SEO_META) { try { SEO_META = await (await fetch('/seo-meta.json')).json(); } catch { SEO_META = {}; } }
  const m = SEO_META[key] || null;
  currentPageSeo = m;
  document.title = m ? m.t : 'Bé Học Vui — Học & luyện thi từ Mầm non đến THPT';
  const md = document.querySelector('meta[name="description"]');
  if (md && m) md.setAttribute('content', m.d);
  const cn = document.querySelector('link[rel="canonical"]');
  if (cn) cn.setAttribute('href', 'https://behocvui.id.vn' + (key === '/' ? '/' : key));
  return m;
}

// ===== Routing =====
async function route() {
  const path = (location.pathname || '/').replace(/^\/+|\/+$/g, '');
  const view = document.getElementById('view');
  // Skeleton placeholder — mượt hơn spinner, gợi ý cấu trúc đang tới
  view.innerHTML = `
    <div class="skeleton-card"><div class="skeleton skeleton-line medium"></div><div class="skeleton skeleton-line short"></div></div>
    <div class="skeleton-card"><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line short"></div></div>`;
  updateHeader();
  updateTabbar(path);
  document.body.classList.remove('in-exercise'); // rời màn làm bài thì hiện lại chrome

  if (!CATALOG) {
    try {
      CATALOG = await (await fetch('/exercises/index.json')).json();
    } catch (e) {
      view.innerHTML = `<div class="empty"><div class="emoji">📭</div><div class="msg">Chưa có đề bài. Chạy <code>node tools/build-index.js</code>.</div></div>`;
      return;
    }
  }
  await Daily.loadManifest(); // biết lớp/môn nào có "đề hôm nay" (có cache, fetch 1 lần)

  await applySeo(path); // cập nhật tiêu đề + mô tả + canonical theo trang
  const parts = path.split('/').filter(Boolean);
  // Xác định "thế giới" (cấp học) để áp chủ đề + đánh dấu tab cấp ở đầu trang
  const PERSONAL = ['tien-trinh', 'thanh-tich', 'tai-khoan', 'doi-nhan-vat', 'bang-xep-hang'];
  const world = parts[0] === 'cap' ? (parts[1] || '')
    : parts[0] === 'mam-non' ? 'mam-non'
    : (parts[0] && parts[0].startsWith('lop')) ? stageFromGrade(parseInt(parts[0].replace('lop', '')))
    : (PERSONAL.includes(parts[0]) && Auth.isLoggedIn()) ? stageFromGrade(Auth.getUser().grade)
    : parts.length === 0 ? homeWorld()
    : '';
  if (parts[0] !== 'bai') applyStageTheme(world); // 'bai' tự đặt trong renderExercise
  updateWorldTabs(world);

  if (parts.length === 0) return renderWorldHome(view, homeWorld());
  if (parts[0] === 'cap' && parts[1]) return renderWorldHome(view, parts[1]);
  if (parts[0] === 'thanh-tich') return renderAchievements(view);
  if (parts[0] === 'bang-xep-hang') return renderLeaderboard(view);
  if (parts[0] === 'gioi-thieu') return renderAbout(view);
  if (parts[0] === 'chinh-sach') return renderPolicy(view);
  if (parts[0] === 'faq') return renderFAQ(view);
  if (parts[0] === 'huong-dan-cai-dat') return renderHelpSettings(view);
  if (parts[0] === 'tien-trinh') return renderProgress(view);
  if (parts[0] === 'tai-khoan') return renderAuth(view);
  if (parts[0] === 'phu-huynh') return renderParent(view);
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
  return renderWorldHome(view, homeWorld());
}

// Bắt click trên link nội bộ (href bắt đầu bằng "/") → điều hướng SPA, không tải lại trang
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest && e.target.closest('a');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href || href[0] !== '/' || a.target === '_blank' || a.hasAttribute('download')) return;
  e.preventDefault();
  goTo(href);
});
// Nút Back/Forward của trình duyệt
window.addEventListener('popstate', () => {
  // Đang làm bài dở mà điều hướng đi nơi khác → hỏi xác nhận
  if (exerciseGuard && location.pathname !== exerciseGuard.path) {
    if (!window.confirm('Bạn đang làm bài dở. Thoát ra bây giờ sẽ KHÔNG lưu kết quả. Thoát không?')) {
      history.pushState(null, '', exerciseGuard.path); // ở lại: đẩy lại đúng màn làm bài
      return;
    }
    endExerciseFocus();
  }
  route();
});
window.addEventListener('DOMContentLoaded', () => {
  // Tương thích link cũ dạng "#/..." (đã chia sẻ trước đây) → chuyển sang URL thật
  if ((location.pathname === '/' || location.pathname === '') && location.hash.indexOf('#/') === 0) {
    history.replaceState(null, '', location.hash.slice(1));
  }
  route();
});
// Chặn tải lại trang / đóng tab khi đang làm bài dở
window.addEventListener('beforeunload', (e) => {
  if (exerciseGuard) { e.preventDefault(); e.returnValue = ''; }
});

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ===== Xáo trộn đề (chống học thuộc thứ tự câu/đáp án qua nhiều lần làm) =====
function shuffleArr(a) { // Fisher–Yates, đổi tại chỗ
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const LEVEL_RANK = { M1: 0, NB: 0, M2: 1, TH: 1, M3: 2, VD: 2, VDC: 3 };
// Đáp án phụ thuộc vị trí ("Tất cả đáp án trên", "Cả A và B"...) → KHÔNG xáo đáp án câu đó
function isPositionalOption(text) {
  return /tất cả|cả (a|b|c|d|hai|ba)\b|\b[abcd]\b\s*(,|và|&)\s*\b[abcd]\b|không\s*(có)?\s*đáp án|đều (đúng|sai)/i.test(String(text || ''));
}
// Xáo đáp án 1 câu trắc nghiệm + đổi lại chỉ số đáp án đúng (trả bản sao, không đụng đề gốc)
function shuffleMcOptions(q) {
  if (q.type !== 'multiple-choice' || !Array.isArray(q.options) || typeof q.answer !== 'number') return q;
  if (q.options.some(isPositionalOption)) return q;
  const order = q.options.map((_, i) => i);
  shuffleArr(order);
  return { ...q, options: order.map(i => q.options[i]), answer: order.indexOf(q.answer) };
}
// Danh sách câu cho 1 lần làm: gom câu chung đoạn văn thành cụm; xáo trong từng mức độ
// (giữ dễ→khó) nếu đề có gắn mức, ngược lại xáo phẳng; rồi xáo đáp án từng câu.
function prepareQuestions(exercise) {
  const src = Array.isArray(exercise.questions) ? exercise.questions : [];
  const groups = [];
  for (const q of src) {
    const prev = groups[groups.length - 1];
    if (q.passage && prev && prev.passage === q.passage) prev.items.push(q);
    else groups.push({ passage: q.passage || null, level: q.level, items: [q] });
  }
  if (groups.every(g => LEVEL_RANK[g.level] != null)) {
    const bands = new Map();
    groups.forEach(g => { const r = LEVEL_RANK[g.level]; if (!bands.has(r)) bands.set(r, []); bands.get(r).push(g); });
    const ordered = [];
    [...bands.keys()].sort((a, b) => a - b).forEach(r => ordered.push(...shuffleArr(bands.get(r))));
    groups.length = 0; groups.push(...ordered);
  } else {
    shuffleArr(groups);
  }
  return groups.flatMap(g => g.items).map(shuffleMcOptions);
}

// Linh vật "Bé Học Vui" — màu theo chủ đề (--c-primary*); mood đổi biểu cảm: 'celebrate' | 'happy' | 'try'
function mascotSVG(mood) {
  const m = mood || 'happy';
  const eyes = m === 'celebrate'
    ? '<path d="M38 60 q7 -9 14 0" fill="none" stroke="#3A2A33" stroke-width="3.4" stroke-linecap="round"/><path d="M68 60 q7 -9 14 0" fill="none" stroke="#3A2A33" stroke-width="3.4" stroke-linecap="round"/>'
    : `<ellipse cx="45" cy="60" rx="7.5" ry="9.5" fill="#fff"/><ellipse cx="75" cy="60" rx="7.5" ry="9.5" fill="#fff"/><circle cx="${m === 'try' ? 44 : 46}" cy="62" r="4.2" fill="#3A2A33"/><circle cx="${m === 'try' ? 74 : 76}" cy="62" r="4.2" fill="#3A2A33"/><circle cx="47.6" cy="60" r="1.5" fill="#fff"/><circle cx="77.6" cy="60" r="1.5" fill="#fff"/>`;
  const mouths = {
    celebrate: '<path d="M46 74 q14 16 28 0 z" fill="#3A2A33"/><path d="M51 80 q9 4 18 0" fill="#FF8FA3"/>',
    happy: '<path d="M49 76 q11 11 22 0" fill="none" stroke="#3A2A33" stroke-width="3.4" stroke-linecap="round"/>',
    try: '<path d="M52 80 q8 5 16 0" fill="none" stroke="#3A2A33" stroke-width="3.4" stroke-linecap="round"/>',
  };
  const extra = m === 'celebrate'
    ? '<g fill="var(--c-star)"><path d="M12 52 l1.6 3.2 3.5.4 -2.6 2.4 .6 3.4 -3.1-1.7 -3.1 1.7 .6-3.4 -2.6-2.4 3.5-.4z"/><path d="M104 46 l1.6 3.2 3.5.4 -2.6 2.4 .6 3.4 -3.1-1.7 -3.1 1.7 .6-3.4 -2.6-2.4 3.5-.4z"/></g>'
    : '';
  return `
  <svg class="hero-mascot" viewBox="0 0 120 120" role="img" aria-label="Linh vật Bé Học Vui">
    <g fill="var(--c-primary-dark)" opacity=".5"><circle cx="16" cy="34" r="2.6"/><circle cx="103" cy="28" r="3"/><circle cx="106" cy="74" r="2.2"/></g>
    <line x1="60" y1="22" x2="60" y2="11" stroke="var(--c-primary-dark)" stroke-width="3" stroke-linecap="round"/>
    <path d="M60 1 l2.7 5.4 6 .6 -4.5 4 1.1 5.9 -5.3-3 -5.3 3 1.1-5.9 -4.5-4 6-.6z" fill="var(--c-star)"/>
    <circle cx="60" cy="66" r="45" fill="var(--c-primary-soft)" stroke="var(--c-primary-dark)" stroke-width="3"/>
    <ellipse cx="60" cy="76" rx="30" ry="26" fill="color-mix(in srgb, var(--c-card) 60%, var(--c-primary-soft))" opacity=".55"/>
    <circle cx="36" cy="74" r="7" fill="#FF8FA3" opacity=".5"/>
    <circle cx="84" cy="74" r="7" fill="#FF8FA3" opacity=".5"/>
    ${eyes}
    ${mouths[m] || mouths.happy}
    <path d="M101 70 q12 -6 14 4 q1 7 -8 8" fill="var(--c-primary-soft)" stroke="var(--c-primary-dark)" stroke-width="3" stroke-linecap="round"/>
    ${extra}
  </svg>`;
}

// Logo-mark trong topbar: sách mở cho THCS/THPT, mặt mascot cho lứa nhỏ
function brandMarkSVG(stage) {
  if (stage === 'thcs' || stage === 'thpt') {
    return '<svg viewBox="0 0 28 28" fill="none"><path d="M5 7 h8 a3 3 0 0 1 3 3 v11 h-8 a3 3 0 0 1 -3 -3 z" fill="#fff" opacity=".95"/><path d="M23 7 h-8 a3 3 0 0 0 -3 3 v11 h8 a3 3 0 0 0 3 -3 z" fill="#fff" opacity=".7"/><line x1="14" y1="11" x2="14" y2="21" stroke="var(--c-primary)" stroke-width="1.6"/></svg>';
  }
  return '<svg viewBox="0 0 28 28"><circle cx="14" cy="15" r="10" fill="#fff"/><circle cx="10.5" cy="14" r="2" fill="#3A2A33"/><circle cx="17.5" cy="14" r="2" fill="#3A2A33"/><path d="M10 18 q4 4 8 0" fill="none" stroke="#3A2A33" stroke-width="1.8" stroke-linecap="round"/><path d="M14 5 l1.3 2.6 2.9.3 -2.2 1.9 .6 2.8 -2.6-1.5 -2.6 1.5 .6-2.8 -2.2-1.9 2.9-.3z" fill="var(--c-star)"/></svg>';
}

function stageFromGrade(g) { return g >= 10 ? 'thpt' : g >= 6 ? 'thcs' : 'tieu-hoc'; }
// Trang chủ hiển thị "thế giới" theo lớp của tài khoản đang đăng nhập (mặc định Tiểu học)
function homeWorld() { return Auth.isLoggedIn() ? stageFromGrade(Auth.getUser().grade) : 'tieu-hoc'; }
const DARK_KEY = 'be-hoc-vui-theme-dark';
function applyStageTheme(stage) {
  if (stage) document.body.dataset.stage = stage;
  else delete document.body.dataset.stage;
  // Dark mode chỉ cho THCS/THPT (học buổi tối)
  const darkAllowed = stage === 'thcs' || stage === 'thpt';
  const pref = localStorage.getItem(DARK_KEY) === '1';
  document.body.classList.toggle('theme-dark', darkAllowed && pref);
  const tg = document.getElementById('dark-toggle');
  if (tg) { tg.hidden = !darkAllowed; tg.textContent = (darkAllowed && pref) ? '☀️' : '🌙'; }
  const bm = document.getElementById('brand-mark');
  if (bm) bm.innerHTML = brandMarkSVG(stage || '');
  const tag = document.getElementById('brand-tag');
  if (tag) tag.textContent = ({ 'mam-non': 'Bé 3–5 tuổi', 'tieu-hoc': 'Lớp 1–5', 'thcs': 'Lớp 6–9', 'thpt': 'Lớp 10–12' }[stage]) || 'Học & luyện thi · Mầm non → THPT';
}
window.toggleDark = function () {
  const cur = localStorage.getItem(DARK_KEY) === '1';
  localStorage.setItem(DARK_KEY, cur ? '0' : '1');
  applyStageTheme(document.body.dataset.stage || '');
};

// Vòng tiến trình tròn (đề hôm nay): done/total
function progressRing(done, total) {
  const r = 26, c = 2 * Math.PI * r;
  const frac = total ? Math.max(0, Math.min(1, done / total)) : 0;
  const off = c * (1 - frac);
  return `
  <svg class="progress-ring ${total && done >= total ? 'full' : ''}" viewBox="0 0 64 64" role="img"
    style="--pr-c:${c.toFixed(1)};--pr-off:${off.toFixed(1)}" aria-label="Đã làm ${done} trên ${total} đề hôm nay">
    <circle class="pr-track" cx="32" cy="32" r="${r}" fill="none" stroke-width="7"/>
    <circle class="pr-fill" cx="32" cy="32" r="${r}" fill="none" stroke-width="7"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
      stroke-linecap="round" transform="rotate(-90 32 32)"/>
    <text x="32" y="33" class="pr-text">${done}/${total}</text>
  </svg>`;
}

// Trạng thái trống có linh vật — đồng bộ phong cách
function emptyState(title, desc, actionHtml) {
  return `<div class="empty-state">
    ${mascotSVG()}
    <div class="es-title">${title}</div>
    ${desc ? `<div class="es-desc">${desc}</div>` : ''}
    ${actionHtml || ''}
  </div>`;
}

function updateHeader() {
  document.getElementById('star-count').textContent = Progress.getStars();
  // Sao là tính năng theo tài khoản → chỉ hiện khi đã đăng nhập
  const sd = document.getElementById('stars-display');
  if (sd) sd.style.display = Auth.isLoggedIn() ? '' : 'none';
  renderAccountArea();
}

// Đánh dấu tab đang mở ở thanh tab dưới (mobile)
function updateTabbar(hash) {
  const parts = (hash || '').split('/').filter(Boolean);
  const key = (parts.length === 0 || parts[0] === 'cap') ? 'home' : parts[0];
  document.querySelectorAll('#tabbar a').forEach(a => a.classList.toggle('active', a.dataset.tabkey === key));
}

// Đánh dấu tab cấp học (4 thế giới) đang chọn
function updateWorldTabs(world) {
  document.querySelectorAll('#world-tabs a').forEach(a => a.classList.toggle('active', a.dataset.world === world));
}

function renderAccountArea() {
  const el = document.getElementById('account-area');
  if (!el) return;
  const u = Auth.getUser();
  el.innerHTML = u
    ? `<a href="/tai-khoan" class="acct-chip" title="Tài khoản"><span class="acct-name">👤 ${escapeHtml(u.displayName)}</span><span class="acct-grade">Lớp ${u.grade}</span></a>`
    : `<a href="/tai-khoan" class="acct-login">Đăng nhập</a>`;
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
      navTo(isChanging ? '/thanh-tich' : '/');
    };
  });
}

// ===== Tài khoản =====
const AUTH_ERR = {
  name_short: 'Biệt danh quá ngắn (ít nhất 2 ký tự).',
  pass_short: 'Mật khẩu quá ngắn (ít nhất 4 ký tự).',
  grade: 'Hãy chọn lớp của bạn.',
  exists: 'Biệt danh này đã có người dùng. Hãy chọn biệt danh khác.',
  not_found: 'Không tìm thấy tài khoản. Kiểm tra biệt danh hoặc đăng ký mới.',
  wrong_pass: 'Sai mật khẩu, thử lại nhé.',
  server_error: 'Lỗi máy chủ, vui lòng thử lại sau.',
  network: 'Lỗi kết nối, kiểm tra mạng rồi thử lại.',
  pin_format: 'Mã phụ huynh phải gồm đúng 6 chữ số.',
  no_pin: 'Tài khoản này chưa bật mã phụ huynh. Nhờ con vào mục Tài khoản để bật nhé.',
  invalid: 'Sai biệt danh hoặc mã phụ huynh.',
  locked: 'Nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút.',
};

function renderAuth(view) {
  const u = Auth.getUser();
  if (u) {
    view.innerHTML = `
      <a href="/" class="back-btn">← Về trang chủ</a>
      <div class="auth-wrap">
        <div class="auth-card">
          <h1>👤 ${escapeHtml(u.displayName)}</h1>
          <p class="auth-sub">Đang đăng nhập · <b>Lớp ${u.grade}</b></p>
          <p class="about-note">Tiến trình của bạn được lưu trên máy chủ và đồng bộ trên mọi thiết bị khi đăng nhập cùng biệt danh.</p>
          <p class="about-note">⚠️ Tài khoản sẽ tự xóa nếu <b>15 ngày liên tiếp không làm bài</b>. Cứ làm bài đều đặn để giữ tài khoản nhé!</p>
          <div class="action-bar" style="justify-content:center;margin-top:18px">
            <a href="/" class="btn btn-primary">Vào học</a>
            <button class="btn btn-secondary" id="logout-btn" style="color:#EF5350">Đăng xuất</button>
          </div>
        </div>

        <div class="auth-card pp-card">
          <h2 style="margin-top:0">⚙️ Hiệu ứng khi làm bài</h2>
          <p class="about-note" style="margin-top:6px">Bật/tắt âm thanh phản hồi đúng-sai và rung nhẹ khi sai (chỉ trên điện thoại Android). Cài đặt lưu trên trình duyệt này.</p>
          <div class="action-bar" style="gap:10px;margin-top:8px">
            <label class="acct-toggle"><input type="checkbox" id="opt-sound"> 🔊 Âm thanh</label>
            <label class="acct-toggle"><input type="checkbox" id="opt-vibrate"> 📳 Rung khi sai</label>
          </div>
          <p class="about-note" style="margin-top:10px"><a href="/huong-dan-cai-dat">📖 Hướng dẫn chi tiết: cách tắt trên Windows, macOS, Android, iPhone →</a></p>
        </div>

        <div class="auth-card pp-card">
          <h2 style="margin-top:0">👨‍👩‍👧 Theo dõi của phụ huynh</h2>
          <p class="about-note" style="margin-top:6px">Đặt một <b>mã 6 chữ số</b> để bố mẹ xem được tiến trình học của con từ điện thoại của mình — vào <b>behocvui.id.vn/phu-huynh</b>, nhập biệt danh + mã. Phụ huynh <b>chỉ xem</b>, không sửa được gì.</p>
          <div id="pp-state"></div>
        </div>
      </div>`;
    view.querySelector('#logout-btn').onclick = () => { Auth.logout(); navTo('/'); };
    refreshPinCard(view);
    // Cài đặt âm thanh / rung (toggle, lưu vào localStorage qua Media)
    const optSound = view.querySelector('#opt-sound');
    const optVib = view.querySelector('#opt-vibrate');
    if (optSound) {
      optSound.checked = Media.soundOn();
      optSound.onchange = () => { Media.setSoundOn(optSound.checked); if (optSound.checked) Media.sound.correct(); };
    }
    if (optVib) {
      optVib.checked = Media.vibrateOn();
      optVib.onchange = () => { Media.setVibrateOn(optVib.checked); if (optVib.checked) Media.vibrate(80); };
    }
    return;
  }

  const gradeOpts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    .map(g => `<option value="${g}">Lớp ${g}</option>`).join('');
  view.innerHTML = `
    <a href="/" class="back-btn">← Về trang chủ</a>
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="login">Đăng nhập</button>
          <button class="auth-tab" data-tab="register">Đăng ký</button>
        </div>

        <form id="login-form" class="auth-form">
          <label>Biệt danh / Tên đăng nhập
            <input type="text" name="username" autocomplete="username" required placeholder="VD: Bé An 2A">
          </label>
          <label>Mật khẩu
            <input type="password" name="password" autocomplete="current-password" required>
          </label>
          <div class="auth-msg" id="login-msg"></div>
          <button type="submit" class="btn btn-primary auth-submit">Đăng nhập</button>
        </form>

        <form id="register-form" class="auth-form" hidden>
          <label>Biệt danh / Tên đăng nhập <small>(không phân biệt hoa/thường)</small>
            <input type="text" name="username" autocomplete="username" required placeholder="VD: Bé An 2A">
          </label>
          <label>Mật khẩu <small>(ít nhất 4 ký tự)</small>
            <input type="password" name="password" autocomplete="new-password" required>
          </label>
          <label>Lớp đang học
            <select name="grade" required>
              <option value="" selected disabled>— Chọn lớp —</option>
              ${gradeOpts}
            </select>
          </label>
          <div class="auth-msg" id="register-msg"></div>
          <button type="submit" class="btn btn-primary auth-submit">Đăng ký &amp; dùng ngay</button>
        </form>

        <p class="about-note">Không cần email. Chỉ lưu biệt danh + lớp + tiến trình học (mật khẩu được mã hóa). Tài khoản tự xóa sau 15 ngày không làm bài. Xem <a href="/chinh-sach">Chính sách</a>.</p>
      </div>
    </div>`;

  const loginForm = view.querySelector('#login-form');
  const registerForm = view.querySelector('#register-form');
  view.querySelectorAll('.auth-tab').forEach(tab => {
    tab.onclick = () => {
      view.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t === tab));
      const isLogin = tab.dataset.tab === 'login';
      loginForm.hidden = !isLogin;
      registerForm.hidden = isLogin;
    };
  });

  const submit = async (form, msgEl, fn) => {
    msgEl.className = 'auth-msg';
    msgEl.textContent = 'Đang xử lý...';
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    const data = Object.fromEntries(new FormData(form).entries());
    if (data.grade) data.grade = parseInt(data.grade, 10);
    let r;
    try { r = await fn(data); } catch { r = { ok: false, error: 'server_error' }; }
    btn.disabled = false;
    if (r && r.ok) {
      navTo('/');
    } else {
      msgEl.className = 'auth-msg error';
      msgEl.textContent = AUTH_ERR[r && r.error] || 'Có lỗi xảy ra, thử lại nhé.';
    }
  };

  loginForm.onsubmit = (e) => { e.preventDefault(); submit(loginForm, view.querySelector('#login-msg'), d => Auth.login(d)); };
  registerForm.onsubmit = (e) => { e.preventDefault(); submit(registerForm, view.querySelector('#register-msg'), d => Auth.register(d)); };
}

// ===== Mã phụ huynh: đặt/đổi/tắt trong trang Tài khoản =====
function refreshPinCard(view) {
  const box = view.querySelector('#pp-state');
  if (!box) return;
  const on = Auth.hasParentPin();
  box.innerHTML = `
    ${on
      ? `<div class="pp-status on">🔓 Đang bật mã phụ huynh.</div>
         <div class="action-bar" style="margin-top:10px">
           <button class="btn btn-secondary" data-pp="change">Đổi mã</button>
           <button class="btn btn-secondary" data-pp="off" style="color:#EF5350">Tắt mã</button>
         </div>`
      : `<div class="pp-status off">Chưa bật. Đặt mã để phụ huynh theo dõi từ xa.</div>
         <div class="action-bar" style="margin-top:10px"><button class="btn btn-primary" data-pp="set">Đặt mã phụ huynh</button></div>`}
    <form id="pp-form" class="auth-form" hidden style="margin-top:12px">
      <label>Mã phụ huynh <small>(6 chữ số)</small>
        <input type="password" inputmode="numeric" autocomplete="off" maxlength="6" id="pp-pin" placeholder="••••••" required>
      </label>
      <label>Nhập lại mã
        <input type="password" inputmode="numeric" autocomplete="off" maxlength="6" id="pp-pin2" placeholder="••••••" required>
      </label>
      <div class="auth-msg" id="pp-msg"></div>
      <div class="action-bar">
        <button type="submit" class="btn btn-primary">Lưu mã</button>
        <button type="button" class="btn btn-secondary" data-pp="cancel">Hủy</button>
      </div>
    </form>`;
  box.querySelectorAll('[data-pp]').forEach(b => { b.onclick = () => handlePp(view, b.dataset.pp); });
  box.querySelector('#pp-form').onsubmit = (e) => { e.preventDefault(); savePin(view); };
}

async function handlePp(view, action) {
  const form = view.querySelector('#pp-form');
  if (action === 'cancel') { form.hidden = true; return; }
  if (action === 'off') {
    if (!window.confirm('Tắt mã phụ huynh? Bố mẹ sẽ không xem được tiến trình từ xa cho đến khi bật lại.')) return;
    const r = await Auth.setParentPin('');
    if (r && r.ok) refreshPinCard(view);
    else window.alert(AUTH_ERR[r && r.error] || 'Không tắt được, thử lại nhé.');
    return;
  }
  // set | change → hiện form nhập
  form.hidden = false;
  form.querySelector('#pp-pin').value = '';
  form.querySelector('#pp-pin2').value = '';
  view.querySelector('#pp-msg').className = 'auth-msg';
  view.querySelector('#pp-msg').textContent = '';
  form.querySelector('#pp-pin').focus();
}

async function savePin(view) {
  const msg = view.querySelector('#pp-msg');
  const pin = view.querySelector('#pp-pin').value.trim();
  const pin2 = view.querySelector('#pp-pin2').value.trim();
  msg.className = 'auth-msg';
  if (!/^\d{6}$/.test(pin)) { msg.className = 'auth-msg error'; msg.textContent = 'Mã phải gồm đúng 6 chữ số.'; return; }
  if (pin !== pin2) { msg.className = 'auth-msg error'; msg.textContent = 'Hai lần nhập mã chưa khớp.'; return; }
  msg.textContent = 'Đang lưu...';
  const r = await Auth.setParentPin(pin);
  if (r && r.ok) { view.querySelector('#pp-form').hidden = true; refreshPinCard(view); }
  else { msg.className = 'auth-msg error'; msg.textContent = AUTH_ERR[r && r.error] || 'Không lưu được, thử lại nhé.'; }
}

// ===== Trang "Theo dõi của phụ huynh" (công khai, không cần đăng nhập) =====
function renderParent(view) {
  applyStageTheme(''); // chủ đề trung tính cho trang dành cho người lớn
  view.innerHTML = `
    <a href="/" class="back-btn">← Về trang chủ</a>
    <div class="auth-wrap">
      <div class="auth-card" style="text-align:center">
        <div style="font-size:3.2rem">👨‍👩‍👧</div>
        <h1>Theo dõi con học</h1>
        <p class="auth-sub">Nhập biệt danh của con và <b>mã phụ huynh (6 chữ số)</b> để xem tiến trình học. Bạn chỉ xem, không thay đổi được gì.</p>
        <form id="pv-form" class="auth-form" style="margin-top:8px">
          <label>Biệt danh của con
            <input type="text" id="pv-user" autocomplete="off" required placeholder="VD: Bé An 2A">
          </label>
          <label>Mã phụ huynh <small>(6 chữ số)</small>
            <input type="password" id="pv-pin" inputmode="numeric" autocomplete="off" maxlength="6" required placeholder="••••••">
          </label>
          <div class="auth-msg" id="pv-msg"></div>
          <button type="submit" class="btn btn-primary auth-submit">Xem tiến trình</button>
        </form>
        <p class="about-note">Chưa có mã? Nhờ con đăng nhập, vào mục <b>Tài khoản → Theo dõi của phụ huynh</b> để bật.</p>
      </div>
    </div>`;
  const form = view.querySelector('#pv-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const msg = view.querySelector('#pv-msg');
    const username = view.querySelector('#pv-user').value.trim();
    const pin = view.querySelector('#pv-pin').value.trim();
    msg.className = 'auth-msg';
    if (!username) { msg.className = 'auth-msg error'; msg.textContent = 'Hãy nhập biệt danh của con.'; return; }
    if (!/^\d{6}$/.test(pin)) { msg.className = 'auth-msg error'; msg.textContent = 'Mã phụ huynh gồm 6 chữ số.'; return; }
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; msg.textContent = 'Đang kiểm tra...';
    let r;
    try {
      r = await fetch('/api/parent-view', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      }).then(x => x.json());
    } catch { r = { ok: false, error: 'network' }; }
    btn.disabled = false;
    if (r && r.ok) { renderParentDashboard(view, r); return; }
    msg.className = 'auth-msg error';
    if (r && r.error === 'locked') msg.textContent = `Nhập sai quá nhiều lần. Thử lại sau ${r.retryInSec ? Math.ceil(r.retryInSec / 60) + ' phút' : 'ít phút'}.`;
    else if (r && r.error === 'invalid' && typeof r.left === 'number') msg.textContent = `Sai biệt danh hoặc mã. Còn ${r.left} lần thử.`;
    else msg.textContent = AUTH_ERR[r && r.error] || 'Không xem được, thử lại nhé.';
  };
}

// Tính thống kê CHỈ ĐỌC từ progress của con (không đụng tới localStorage của thiết bị).
function parentStats(p) {
  const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dailyLog = p.dailyLog || {};
  const has = k => dailyLog[k] && Object.keys(dailyLog[k].subjects || {}).length > 0;
  // streak: chuỗi ngày liên tiếp có làm bài tính tới hôm nay
  const d = new Date(); d.setHours(0, 0, 0, 0);
  if (!has(dayKey(d))) d.setDate(d.getDate() - 1);
  let streak = 0; while (has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1); }
  // 28 ngày gần nhất
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 27);
  const startKey = dayKey(start);
  let activeDays = 0; const subjAcc = {};
  for (const [k, day] of Object.entries(dailyLog)) {
    if (k < startKey) continue;
    if (Object.keys(day.subjects || {}).length) activeDays++;
    for (const [s, r] of Object.entries(day.subjects || {})) {
      if (!subjAcc[s]) subjAcc[s] = { score: 0, total: 0 };
      subjAcc[s].score += r.score; subjAcc[s].total += r.total;
    }
  }
  // sao 14 ngày gần nhất (cho biểu đồ cột)
  const starLog = p.starLog || {};
  const bars = []; const dd = new Date(); dd.setHours(0, 0, 0, 0); dd.setDate(dd.getDate() - 13);
  for (let i = 0; i < 14; i++) { const k = dayKey(dd); bars.push({ k, dom: dd.getDate(), v: starLog[k] || 0 }); dd.setDate(dd.getDate() + 1); }
  const completed = Object.values(p.completed || {});
  return {
    stars: p.stars || 0, streak, activeDays, subjAcc, bars,
    completedCount: completed.length,
    perfectCount: completed.filter(c => c.bestScore === c.total).length,
  };
}

function renderParentDashboard(view, data) {
  const p = data.progress || {};
  const grade = data.grade;
  applyStageTheme(stageFromGrade(grade));
  const st = parentStats(p);
  const maxBar = Math.max(1, ...st.bars.map(b => b.v));
  const barsHtml = st.bars.map(b =>
    `<div class="pv-bar" title="${b.k}: ${b.v} sao"><span class="pv-bar-fill" style="height:${Math.round(b.v / maxBar * 100)}%"></span><span class="pv-bar-dom">${b.dom}</span></div>`).join('');

  const SUB = grade >= 6 ? { toan: 'Toán', 'ngu-van': 'Ngữ văn', 'tieng-anh': 'Tiếng Anh' }
    : { toan: 'Toán', 'tieng-viet': 'Tiếng Việt', 'tieng-anh': 'Tiếng Anh' };
  const subjRows = Object.entries(SUB).map(([k, name]) => {
    const a = st.subjAcc[k];
    const pct = a && a.total ? Math.round(a.score / a.total * 100) : null;
    return `<div class="subj-row"><span class="sr-name">${name}</span><div class="sr-bar"><div class="sr-fill" style="width:${pct || 0}%"></div></div><span class="sr-pct">${pct !== null ? pct + '%' : '—'}</span></div>`;
  }).join('');
  const done = Object.entries(SUB).map(([k]) => st.subjAcc[k]).filter(a => a && a.total);

  // hoạt động gần đây (map id → tên bài từ CATALOG nếu có)
  const titleOf = id => {
    const ex = CATALOG && CATALOG.exercises && CATALOG.exercises.find(e => e.id === id);
    return ex ? `${(SUBJECTS[ex.subject] || {}).name || ''} · ${ex.topic || ex.title || id}` : id;
  };
  const fmtDate = ms => { const dt = new Date(ms); return `${dt.getDate()}/${dt.getMonth() + 1}`; };
  const history = (p.history || []).slice(0, 8).map(h =>
    `<div class="pv-act"><span class="pv-act-name">${escapeHtml(titleOf(h.exerciseId))}</span><span class="pv-act-score">${h.score}/${h.total}</span><span class="pv-act-date">${fmtDate(h.at)}</span></div>`).join('');

  view.innerHTML = `
    <a href="/phu-huynh" class="back-btn">← Xem tài khoản khác</a>
    <div class="hero" style="padding:16px 10px 14px">
      <h1>👨‍👩‍👧 Tiến trình của ${escapeHtml(data.displayName)}</h1>
      <p>Lớp ${grade} · số liệu 28 ngày gần nhất (chỉ xem)</p>
    </div>
    <div class="achv-stats">
      <div class="achv-stat"><div class="n">⭐ ${st.stars}</div><div class="l">Tổng sao</div></div>
      <div class="achv-stat"><div class="n">🔥 ${st.streak}</div><div class="l">Ngày liên tiếp</div></div>
      <div class="achv-stat"><div class="n">📅 ${st.activeDays}</div><div class="l">Ngày học (28n)</div></div>
    </div>
    <div class="achv-stats" style="margin-top:10px">
      <div class="achv-stat"><div class="n">✅ ${st.completedCount}</div><div class="l">Bài đã làm</div></div>
      <div class="achv-stat"><div class="n">💯 ${st.perfectCount}</div><div class="l">Bài điểm tối đa</div></div>
    </div>
    <h2 class="home-section">⭐ Sao 14 ngày gần nhất</h2>
    <div class="pv-bars">${barsHtml}</div>
    <h2 class="home-section">Kết quả theo môn <small style="font-weight:600;color:var(--c-text-soft)">(28 ngày)</small></h2>
    <div class="subj-stats">${subjRows}</div>
    ${st.activeDays === 0 ? `<p class="about-note">Bé chưa làm bài nào trong 28 ngày gần đây. Hãy động viên con học đều mỗi ngày nhé!</p>` : ''}
    ${history ? `<h2 class="home-section">🕑 Hoạt động gần đây</h2><div class="pv-acts">${history}</div>` : ''}
    <p class="about-note" style="margin-top:18px">Số liệu cập nhật khi con làm bài và thiết bị của con có mạng để đồng bộ.</p>
  `;
}

// Màn yêu cầu đăng nhập (tường mềm) cho các tính năng cần tài khoản
function loginRequiredView(view, title, desc) {
  view.innerHTML = `
    <a href="/" class="back-btn">← Về trang chủ</a>
    <div class="auth-wrap">
      <div class="auth-card" style="text-align:center">
        <div style="font-size:3.4rem">🔐</div>
        <h1>${title}</h1>
        <p class="auth-sub">${desc}</p>
        <div class="action-bar" style="justify-content:center;margin-top:16px">
          <a href="/tai-khoan" class="btn btn-primary">Đăng nhập / Đăng ký</a>
          <a href="/" class="btn btn-secondary">Về trang chủ</a>
        </div>
        <p class="about-note">Bạn vẫn luyện tập tự do ở từng môn mà không cần đăng nhập. Đăng nhập để lưu &amp; đồng bộ kết quả trên mọi thiết bị.</p>
      </div>
    </div>`;
}

// ===== Views =====
const WORLD_HERO = {
  'tieu-hoc': { a: 'Học vui mỗi ngày,', b: 'giỏi hơn mỗi tuần', sub: 'Bài tập & đề thi thử bám sát chương trình, chấm điểm ngay tức thì.', label: '🎒 Lớp 1–5' },
  'thcs': { a: 'Vững kiến thức,', b: 'tự tin vào cấp 3', sub: 'Luyện theo chủ đề và đề thi thử đúng cấu trúc, theo dõi tiến bộ từng môn.', label: '📐 Lớp 6–9' },
  'thpt': { a: 'Ôn luyện thông minh,', b: 'bứt phá kỳ thi', sub: 'Đề thi thử bấm giờ chuẩn tốt nghiệp & ĐGNL. Phân tích điểm mạnh – yếu theo môn.', label: '🎓 Lớp 10–12' },
};
const WORLD_FEATURES = {
  'tieu-hoc': [['📋', 'Bám chương trình', 'Theo GDPT 2018 (Kết nối tri thức)'], ['🎯', 'Chấm điểm ngay', 'Biết đúng/sai từng câu, có gợi ý'], ['⭐', 'Vui & có thưởng', 'Sao, huy hiệu, nhân vật đồng hành'], ['📅', 'Đề mỗi ngày', 'Giữ thói quen học đều đặn']],
  'thcs': [['📋', 'Bám chương trình', 'Yêu cầu cần đạt GDPT 2018'], ['📝', 'Đề thi thử', 'Bấm giờ, đúng cấu trúc đề thật'], ['📈', 'Theo dõi tiến bộ', 'Thống kê đúng/sai theo môn'], ['🎯', 'Chấm điểm ngay', 'Xem lại lời giải từng câu']],
  'thpt': [['📝', 'Đề chuẩn kỳ thi', 'Tốt nghiệp THPT & ĐGNL'], ['⏱️', 'Bấm giờ như thi', 'Đồng hồ đếm ngược, tự nộp'], ['📈', 'Phân tích năng lực', 'Điểm mạnh – yếu từng môn'], ['🎯', 'Lời giải chi tiết', 'Hiểu sâu sau mỗi câu sai']],
};
const WORLD_GRADES = { 'tieu-hoc': [1, 2, 3, 4, 5], 'thcs': [6, 7, 8, 9], 'thpt': [10, 11, 12] };

function renderWorldHome(view, world) {
  if (world === 'mam-non') { navTo('/mam-non'); return; }
  if (!WORLD_GRADES[world]) world = 'tieu-hoc';
  applyStageTheme(world);
  updateWorldTabs(world);
  const hero = WORLD_HERO[world];
  const gcls = world === 'thcs' ? ' thcs' : world === 'thpt' ? ' thpt' : '';
  const u = Auth.getUser();
  const deleted = Auth.consumeDeletedNotice();
  view.innerHTML = `
    ${deleted ? '<div class="acct-notice">⚠️ Tài khoản đã bị xóa do 15 ngày không làm bài. Hãy <a href="/tai-khoan">đăng ký lại</a> để tiếp tục lưu tiến trình.</div>' : ''}
    <section class="hero-pro">
      ${u ? `<div class="hero-greet">👋 Chào <b>${escapeHtml(u.displayName)}</b> · Lớp ${u.grade}</div>` : ''}
      ${mascotSVG()}
      <h1>${hero.a} <span class="accent">${hero.b}</span></h1>
      <p class="hero-sub">${hero.sub}</p>
      <div class="hero-cta">
        <button class="btn btn-primary" onclick="document.getElementById('chon-cap').scrollIntoView({behavior:'smooth'})">Bắt đầu học</button>
        <a href="/gioi-thieu" class="btn btn-secondary">Tìm hiểu thêm</a>
      </div>
      <div class="hero-chips">
        <span class="hero-chip">📚 <b>${CATALOG.exercises.length}</b> bộ đề</span>
        <span class="hero-chip">${hero.label}</span>
        <span class="hero-chip">💚 100% miễn phí</span>
      </div>
    </section>

    ${renderDailyHomeSection()}

    <section class="features" aria-label="Điểm nổi bật">
      ${WORLD_FEATURES[world].map(f => `<div class="feature"><div class="f-icon">${f[0]}</div><div class="f-text"><b>${f[1]}</b><span>${f[2]}</span></div></div>`).join('')}
    </section>

    <h2 class="home-section" id="chon-cap">Chọn lớp của bạn</h2>
    <div class="grade-grid">
      ${WORLD_GRADES[world].map(g => `<a href="/lop${g}" class="grade-card${gcls}"><div class="num">${g}</div><div class="label">Lớp ${g}</div></a>`).join('')}
    </div>
  `;
}

function dailyCard(grade, s, today, review) {
  const r = !review && today[s.key];
  return `<a href="/bai/daily-${grade}-${s.key}" class="daily-card ${r ? 'done' : ''} ${review ? 'review' : ''}">
      <span class="dc-icon">${s.icon}</span>
      <span class="dc-name">${s.name}</span>
      <span class="dc-status">${review ? 'Ôn tập' : (r ? `✓ ${r.score}/${r.total}` : 'Chưa làm')}</span>
    </a>`;
}

function renderDailyHomeSection() {
  const today = Progress.getTodayDaily().subjects || {};
  const streak = Progress.getStreak();
  const u = Auth.getUser();

  const head = (grade, extra) => `
    <div class="daily-head">
      <h2>📅 Đề hôm nay <small>· Lớp ${grade}</small></h2>
      <div class="daily-meta">
        ${streak > 0 ? `<span class="streak">🔥 ${streak} ngày</span>` : ''}
        <a href="/tien-trinh" class="daily-progress-link">Xem tiến trình →</a>
      </div>
    </div>${extra || ''}`;

  if (u) {
    const grade = u.grade;
    const subs = Daily.subjectsForGrade(grade);
    const belowSubs = Daily.subjectsForGrade(grade - 1);
    const hasMain = Daily.hasGrade(grade);
    const below = grade - 1;
    const hasBelow = Daily.hasGrade(below);
    const mainCards = hasMain ? subs.map(s => dailyCard(grade, s, today, false)).join('') : '';
    const belowCards = hasBelow ? belowSubs.map(s => dailyCard(below, s, today, true)).join('') : '';
    const totalSubs = subs.length;
    const doneCount = hasMain ? subs.filter(s => today[s.key]).length : 0;
    const allDone = hasMain && doneCount === totalSubs;
    const summary = hasMain
      ? `<div class="daily-summary">
          ${progressRing(doneCount, totalSubs)}
          <div class="ds-text">
            <b>${allDone ? '🎉 Hoàn thành cả ' + totalSubs + ' đề hôm nay!' : `Hôm nay đã làm ${doneCount}/${totalSubs} đề`}</b>
            <span>${allDone ? 'Tuyệt vời, hẹn gặp lại ngày mai nhé!' : 'Cố hoàn thành nốt để giữ chuỗi ngày học nhé!'}</span>
          </div>
        </div>`
      : `<div class="daily-banner">📚 "Đề hôm nay" cho Lớp ${grade} đang được xây dựng. Bạn vẫn vào từng môn để luyện tập nhé!</div>`;
    return `
    <section class="daily-section">
      ${head(grade)}
      ${summary}
      ${hasMain ? `<div class="daily-grid">${mainCards}</div>` : ''}
      ${hasBelow ? `<h3 class="daily-sub">📖 Ôn lại Lớp ${below} <small>(để nắm chắc kiến thức — không tính thành tích)</small></h3><div class="daily-grid">${belowCards}</div>` : ''}
    </section>`;
  }

  // Chưa đăng nhập: "Đề hôm nay" cần tài khoản (tường mềm)
  return `
    <section class="daily-section">
      <div class="daily-head"><h2>📅 Đề hôm nay</h2></div>
      <div class="daily-login-gate">
        <span class="dlg-icon">🔐</span>
        <span class="dlg-text">
          <b>Đăng nhập để làm "Đề hôm nay"</b>
          <small>Mỗi ngày một bộ đề theo đúng lớp của bạn, có chuỗi ngày học &amp; tiến trình — lưu trên mọi thiết bị.</small>
        </span>
        <a href="/tai-khoan" class="btn btn-primary">Đăng nhập / Đăng ký</a>
      </div>
    </section>`;
}

function renderProgress(view) {
  if (!Auth.isLoggedIn()) return loginRequiredView(view, 'Đăng nhập để xem Tiến trình', 'Lịch học theo tháng và phân tích 28 ngày được lưu theo tài khoản của bạn.');
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
    <a href="/" class="back-btn">← Về trang chủ</a>
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
    ${activeDays === 0 ? emptyState('Chưa có dữ liệu tiến trình', 'Hãy làm "Đề hôm nay" trên trang chủ để bắt đầu ghi nhận tiến trình của bạn!', '<a href="/" class="btn btn-primary" style="margin-top:14px">Về trang chủ</a>') : ''}
  `;
}

function renderAbout(view) {
  view.innerHTML = `
    <a href="/" class="back-btn">← Về trang chủ</a>
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
    <a href="/" class="back-btn">← Về trang chủ</a>
    <article class="about">
      <h1>Chính sách & Điều khoản</h1>

      <h2>1. Quyền riêng tư</h2>
      <p><b>Dùng không cần tài khoản:</b> nếu bạn không đăng ký, trang <b>không thu thập thông tin cá nhân</b>. Tiến độ học (sao, huy hiệu, nhân vật, kết quả bài làm) chỉ lưu trong <b>bộ nhớ trình duyệt (localStorage)</b> trên chính thiết bị — không gửi đi đâu. Nhược điểm: đổi máy hoặc xóa dữ liệu trình duyệt thì tiến độ mất và không đồng bộ giữa các thiết bị.</p>
      <p><b>Nếu tạo tài khoản (tùy chọn)</b> để đồng bộ tiến trình trên nhiều thiết bị, chúng tôi lưu trên máy chủ Cloudflare (dịch vụ KV) những dữ liệu sau:</p>
      <ul>
        <li><b>Biệt danh</b> do bạn tự đặt (không bắt buộc là tên thật), <b>lớp đang học</b>, và <b>tiến trình học</b> (kết quả, sao, lịch làm bài).</li>
        <li><b>Mật khẩu được mã hóa</b> (băm PBKDF2 + salt) — chúng tôi không lưu và không xem được mật khẩu gốc.</li>
        <li><b>Không thu thập email, số điện thoại</b> hay thông tin liên hệ nào khác. Không cookie theo dõi, không quảng cáo, không chia sẻ cho bên thứ ba.</li>
        <li><b>Tự động xóa:</b> tài khoản và toàn bộ dữ liệu sẽ <b>tự xóa vĩnh viễn sau 15 ngày liên tiếp không làm bài</b>; muốn dùng lại phải đăng ký mới.</li>
      </ul>
      <p class="about-note">💡 Để bảo vệ trẻ em, <b>khuyến nghị không dùng tên thật đầy đủ hay thông tin nhạy cảm</b> làm biệt danh/mật khẩu. Phụ huynh nên hỗ trợ trẻ khi đăng ký.</p>
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
    <a href="/" class="back-btn">← Về trang chủ</a>
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

// ===== Hướng dẫn cài đặt âm thanh, rung, hiệu ứng =====
function renderHelpSettings(view) {
  view.innerHTML = `
    <a href="/" class="back-btn">← Về trang chủ</a>
    <article class="about">
      <h1>Hướng dẫn cài đặt âm thanh, rung và hiệu ứng</h1>
      <p>Bé Học Vui có 3 mức kiểm soát: tắt riêng trong <b>app</b>, tắt <b>chuyển động</b> ở hệ điều hành, và tắt <b>âm lượng/rung</b> ở thiết bị. Mỗi mức phù hợp một nhu cầu khác nhau.</p>

      <h2>1. Trong app Bé Học Vui (nhanh nhất, chỉ áp dụng cho app này)</h2>
      <p>Cần đăng nhập. Vào <b>Tài khoản</b> → thẻ <b>"⚙️ Hiệu ứng khi làm bài"</b> → 2 toggle:</p>
      <ul>
        <li>🔊 <b>Âm thanh</b> — bật/tắt tiếng "ding" (đúng) và "buzz" (sai). Bấm vào nghe ngay một phát để xác nhận.</li>
        <li>📳 <b>Rung khi sai</b> — chỉ có tác dụng trên điện thoại Android (xem mục 4).</li>
      </ul>
      <p class="about-note">Cài đặt lưu trên trình duyệt của thiết bị đó. Đổi máy/đổi trình duyệt phải cài lại.</p>

      <h2>2. Giảm hiệu ứng chuyển động (Reduce motion)</h2>
      <p>Tắt mọi animation: shake khi sai, skeleton chạy lúc tải, mascot bay, confetti khi điểm cao… App tự đọc cài đặt này qua chuẩn web — không cần làm gì thêm trong app.</p>
      <div class="table-wrap"><table class="help-table">
        <thead><tr><th>Thiết bị</th><th>Đường dẫn</th></tr></thead>
        <tbody>
          <tr><td>Windows 11</td><td>Cài đặt → <b>Trợ năng</b> (Accessibility) → <b>Hiệu ứng hình ảnh</b> → tắt <b>Hiệu ứng động</b></td></tr>
          <tr><td>Windows 10</td><td>Cài đặt → <b>Dễ truy cập</b> → <b>Màn hình</b> → tắt <b>Hiện hoạt ảnh trong Windows</b></td></tr>
          <tr><td>macOS</td><td>Cài đặt hệ thống → <b>Trợ năng</b> → <b>Hiển thị</b> → bật <b>Giảm chuyển động</b></td></tr>
          <tr><td>iPhone / iPad</td><td>Cài đặt → <b>Trợ năng</b> → <b>Chuyển động</b> → bật <b>Giảm chuyển động</b></td></tr>
          <tr><td>Android (Samsung)</td><td>Cài đặt → <b>Trợ năng</b> → <b>Cải thiện hiển thị</b> → bật <b>Xóa hoạt ảnh</b></td></tr>
          <tr><td>Android (Pixel/khác)</td><td>Cài đặt → <b>Trợ năng</b> → bật <b>Xóa hoạt ảnh</b> (hoặc tìm trong "Hiển thị")</td></tr>
        </tbody>
      </table></div>

      <h2>3. Tắt âm thanh ở mức hệ điều hành</h2>
      <p>Nếu không muốn vào Tài khoản, có thể tắt nhanh ở hệ điều hành. Cách này sẽ tắt mọi tiếng trên thiết bị (toggle trong app chỉ tắt tiếng riêng của app).</p>
      <div class="table-wrap"><table class="help-table">
        <thead><tr><th>Thiết bị</th><th>Cách nhanh</th></tr></thead>
        <tbody>
          <tr><td>Windows</td><td>Bấm biểu tượng loa 🔊 góc dưới phải taskbar → kéo về 0, hoặc bấm phím <b>mute</b> trên bàn phím</td></tr>
          <tr><td>macOS</td><td>Biểu tượng loa trên menubar → kéo về 0, hoặc phím <b>F10</b> (mute)</td></tr>
          <tr><td>iPhone</td><td>Gạt <b>công tắc cứng bên trái máy</b> sang đỏ (Silent), hoặc Control Center → kéo âm lượng về 0</td></tr>
          <tr><td>iPad</td><td>Control Center (vuốt từ góc trên phải) → kéo âm lượng về 0</td></tr>
          <tr><td>Android</td><td>Bấm <b>phím âm lượng cứng</b> giảm về 0, hoặc kéo thanh thông báo xuống → nhấn biểu tượng âm lượng</td></tr>
        </tbody>
      </table></div>

      <h2>4. Rung — lưu ý quan trọng ⚠️</h2>
      <p>Rung từ web <b>chỉ hoạt động trên Android</b> (Chrome/Edge/Firefox). <b>iPhone (Safari iOS) KHÔNG hỗ trợ rung từ web</b> dù bật mọi thứ — đây là giới hạn của Apple, không phải lỗi app.</p>
      <div class="table-wrap"><table class="help-table">
        <thead><tr><th>Thiết bị</th><th>Hỗ trợ rung?</th><th>Cách bật/tắt</th></tr></thead>
        <tbody>
          <tr><td>Android</td><td>✅ Có</td><td>Cài đặt → <b>Âm thanh & rung</b> → bật/tắt <b>Rung</b> và <b>Phản hồi xúc giác</b></td></tr>
          <tr><td>iPhone / iPad</td><td>❌ Không (web Safari không có API)</td><td>Toggle 📳 trong app sẽ không có hiệu lực</td></tr>
          <tr><td>Windows / macOS</td><td>❌ Không (máy tính không có cơ chế rung)</td><td>Không áp dụng</td></tr>
        </tbody>
      </table></div>
      <p class="about-note">Nếu dùng iPhone và không thấy rung dù đã bật → là bình thường. Vẫn còn âm thanh "buzz" báo trả lời sai.</p>

      <h2>5. Tóm tắt nhanh</h2>
      <ul>
        <li>Muốn tắt nhanh chỉ cho app này → vào <b>Tài khoản → tắt toggle</b>.</li>
        <li>Muốn tắt toàn bộ chuyển động (chống chóng mặt, tiết kiệm pin) → bật <b>Reduce motion</b> ở Hệ điều hành.</li>
        <li>iPhone không rung khi sai = chuẩn (giới hạn Safari iOS, không phải lỗi app).</li>
      </ul>
    </article>
  `;
}

// ===== Mầm non =====
function renderPreschoolAges(view) {
  view.innerHTML = `
    <a href="/" class="back-btn">← Về trang chủ</a>
    <section class="hero-pro">
      ${mascotSVG()}
      <h1>Khu Mầm Non 🧸</h1>
      <p class="hero-sub">Bé mấy tuổi nào? Chạm để chọn nhé!</p>
    </section>
    <div class="mn-ages">
      ${PRESCHOOL_AGES.map(a => `
        <a href="/mam-non/age${a}" class="mn-age">
          <div class="a-num">${a}</div>
          <div class="a-label">tuổi</div>
        </a>`).join('')}
    </div>
    <section class="daily-section" style="margin-top:22px">
      <div class="daily-head"><h2>🌈 Hôm nay chơi gì?</h2></div>
      <div class="daily-grid">
        ${['mau-sac', 'con-vat', 'dem-so'].filter(k => PRESCHOOL[k]).map(k => `
          <a href="/mam-non/age4/${k}" class="daily-card">
            <span class="dc-icon">${PRESCHOOL[k].icon}</span>
            <span class="dc-name">${PRESCHOOL[k].name}</span>
          </a>`).join('')}
      </div>
    </section>
  `;
}

function renderPreschoolDomains(view, age) {
  if (!PRESCHOOL_AGES.includes(age)) { navTo('/mam-non'); return; }
  const counts = {};
  for (const k of Object.keys(PRESCHOOL))
    counts[k] = CATALOG.exercises.filter(e => e.stage === 'mam-non' && e.subject === k && e.grade === age).length;
  view.innerHTML = `
    <a href="/mam-non" class="back-btn">← Chọn tuổi khác</a>
    <section class="hero-pro"><h1>Bé ${age} tuổi 🎈</h1><p class="hero-sub">Chọn trò chơi nhé!</p></section>
    <div class="mn-domains">
      ${Object.entries(PRESCHOOL).map(([k, d]) => `
        <a href="/mam-non/age${age}/${k}" class="mn-domain">
          <div class="d-ic">${d.icon}</div>
          <div class="d-name">${d.name}</div>
          <div class="d-count">${counts[k]} trò chơi</div>
        </a>`).join('')}
    </div>
  `;
}

function renderPreschoolTopics(view, age, domain) {
  const d = PRESCHOOL[domain];
  if (!d) { navTo('/mam-non'); return; }
  const list = CATALOG.exercises.filter(e => e.stage === 'mam-non' && e.grade === age && e.subject === domain);
  view.innerHTML = `
    <a href="/mam-non/age${age}" class="back-btn">← Quay lại</a>
    <div class="hero" style="padding:20px 10px 30px"><h1>${d.icon} ${d.name}</h1><p>Bé ${age} tuổi</p></div>
    ${list.length === 0
      ? emptyState('Sắp có trò chơi mới nhé!', 'Bé quay lại sau để khám phá thêm nha!')
      : `<div class="topic-list">${list.map(ex => {
          const done = Progress.getCompletion(ex.id);
          return `<a href="/bai/${ex.id}" class="topic-item">
            <span class="ti-dot">${d.icon}</span>
            <span class="ti-body"><span class="ti-title">${ex.topic}</span><span class="ti-meta">${ex.questionCount} câu</span></span>
            ${done ? `<span class="ti-badge">★ ${done.bestScore}/${done.total}</span>` : ''}
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
    <a href="/" class="back-btn">← Quay lại chọn lớp</a>
    <div class="hero" style="padding:14px 10px 18px"><h1>Lớp ${grade}</h1><p class="hero-sub">Chọn môn học để bắt đầu</p></div>
    ${currentPageSeo ? `<p class="seo-desc">${currentPageSeo.d}</p>` : ''}
    <div class="subject-grid">
      ${keys.map(key => { const s = SUBJECTS[key]; return `
        <a href="/lop${grade}/${key}" class="subject-card ${s.cls}">
          <span class="sc-ic">${s.icon}</span>
          <span class="sc-body">
            <span class="sc-name">${s.name}</span>
            <span class="sc-count">${counts[key]} bài tập</span>
          </span>
          <span class="sc-arrow">›</span>
        </a>`; }).join('')}
    </div>
  `;
}

// Thứ tự nhóm: (1) đề theo SGK (chương/chủ đề) theo số tăng dần →
// (2) ôn tập giữa kỳ 1 → cuối kỳ 1 → giữa kỳ 2 → cuối kỳ 2. (Đề thi thử nằm ở mục riêng phía sau.)
function chapterRank(ch) {
  const lower = (ch || '').toLowerCase();
  if (lower.includes('ôn tập') || lower.includes('on tap')) {
    const ky2 = /k[ỳìy]\s*2/.test(lower);
    const cuoi = lower.includes('cuối') || lower.includes('cuoi');
    // giữa kỳ 1 = 0, cuối kỳ 1 = 1, giữa kỳ 2 = 2, cuối kỳ 2 = 3
    return [1, (ky2 ? 2 : 0) + (cuoi ? 1 : 0)];
  }
  const m = (ch || '').match(/\d+/);
  return [0, m ? parseInt(m[0], 10) : 9999];
}
// Đề kiểm tra định kỳ (ôn tập giữa/cuối kỳ) và đề thi thử bấm giờ → bắt buộc đăng nhập mới làm.
function isLockedExercise(ex) {
  if (!ex) return false;
  const ch = (ex.chapter || '').toLowerCase();
  return ch.includes('ôn tập') || ch.includes('on tap') || (typeof ex.timeLimit === 'number' && ex.timeLimit > 0);
}
function topicItemHTML(ex) {
  const done = Progress.getCompletion(ex.id);
  const locked = isLockedExercise(ex) && !Auth.isLoggedIn();
  const icon = locked ? '🔒' : (ex.timeLimit ? '📝' : '✏️');
  return `<a href="/bai/${ex.id}" class="topic-item${locked ? ' locked' : ''}">
      <span class="ti-dot">${icon}</span>
      <span class="ti-body">
        <span class="ti-title">${ex.topic}</span>
        <span class="ti-meta">${ex.questionCount} câu · Độ khó ${'★'.repeat(ex.difficulty || 1)}${ex.timeLimit ? ` · ⏱ ${ex.timeLimit} phút` : ''}${locked ? ' · 🔒 cần đăng nhập' : ''}</span>
      </span>
      ${done ? `<span class="ti-badge">★ ${done.bestScore}/${done.total}</span>` : ''}
    </a>`;
}
function renderTopicList(view, grade, subject) {
  const s = SUBJECTS[subject];
  if (!s) { navTo('/'); return; }
  const all = CATALOG.exercises.filter(e => e.grade === grade && e.subject === subject);
  const byDiff = (a, b) => (a.difficulty || 1) - (b.difficulty || 1);
  const practice = all.filter(e => !e.timeLimit).sort(byDiff);
  const exams = all.filter(e => e.timeLimit).sort(byDiff);

  // Phần luyện tập: nhóm theo chương nếu đề có gắn chapter; nếu không thì danh sách phẳng (đã sắp dễ→khó)
  let practiceHTML = '';
  if (practice.length) {
    // Chỉ nhóm theo chương khi có từ 2 đề trở lên (tránh tiêu đề thừa cho mục chỉ 1 đề)
    if (practice.length >= 2 && practice.some(e => e.chapter)) {
      const groups = {};
      for (const e of practice) (groups[e.chapter || 'Khác'] = groups[e.chapter || 'Khác'] || []).push(e);
      practiceHTML = Object.keys(groups)
        .sort((a, b) => { const ra = chapterRank(a), rb = chapterRank(b); return (ra[0] - rb[0]) || (ra[1] - rb[1]) || a.localeCompare(b, 'vi'); })
        .map(k => `<h3 class="topic-group">${k === 'Khác' ? '📦 Bài khác' : '📘 ' + escapeHtml(k)}</h3>
          <div class="topic-list">${groups[k].map(topicItemHTML).join('')}</div>`).join('');
    } else {
      practiceHTML = `<div class="topic-list">${practice.map(topicItemHTML).join('')}</div>`;
    }
  }

  const sections = [];
  if (practice.length) {
    sections.push((exams.length ? '<h2 class="topic-section">📚 Luyện tập theo chủ đề</h2>' : '') + practiceHTML);
  }
  if (exams.length) {
    sections.push(`<h2 class="topic-section">📝 Đề thi thử <small>(bấm giờ như thi thật)</small></h2>
      <div class="topic-list">${exams.map(topicItemHTML).join('')}</div>`);
  }

  view.innerHTML = `
    <a href="/lop${grade}" class="back-btn">← Quay lại môn lớp ${grade}</a>
    <div class="hero" style="padding:20px 10px 30px"><h1>${s.icon} ${s.name} - Lớp ${grade}</h1><p>Chọn bài tập để làm</p></div>
    ${currentPageSeo ? `<p class="seo-desc">${currentPageSeo.d}</p>` : ''}
    ${all.length === 0
      ? emptyState('Chưa có bài nào', 'Môn này sắp có thêm bài mới — bạn quay lại sau nhé!')
      : sections.join('')}
  `;
}

function renderAchievements(view) {
  if (!Auth.isLoggedIn()) return loginRequiredView(view, 'Đăng nhập để xem Thành tích', 'Sao, huy hiệu và thành tích được lưu theo tài khoản của bạn.');
  const stats = Progress.getStats();
  const av = Progress.getAvatar() || '📚';
  const earnedCount = BADGES.filter(b => b.earned(stats)).length;
  view.innerHTML = `
    <a href="/" class="back-btn">← Về trang chủ</a>
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
      <a href="/doi-nhan-vat" class="btn btn-secondary">🎭 Đổi nhân vật</a>
      <button class="btn btn-secondary" id="reset-btn" style="color:#EF5350">🗑️ Xóa tiến độ</button>
    </div>
  `;
  view.querySelector('#reset-btn').onclick = () => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ tiến độ và sao không?')) {
      Progress.reset();
      navTo('/');
    }
  };
}

// ===== Bảng xếp hạng =====
const LB_FILTER = { period: 'week', scope: 'lop', metric: 'stars' };
const LB_METRIC = {
  stars: { icon: '⭐', unit: 'sao' },
  streak: { icon: '🔥', unit: 'ngày' },
};
const STAGE_LABEL = { 'mam-non': 'Mầm non', 'tieu-hoc': 'Tiểu học', 'thcs': 'THCS', 'thpt': 'THPT' };
// Nhãn tăng/giảm bậc: dương = lên hạng (▲), âm = xuống (▼), 0 = giữ (—), null = không có
function lbDeltaTag(d) {
  if (d > 0) return { cls: 'up', sym: '▲', t: String(d) };
  if (d < 0) return { cls: 'down', sym: '▼', t: String(-d) };
  if (d === 0) return { cls: 'same', sym: '—', t: '' };
  return { cls: 'same', sym: '', t: '' };
}
function lbDeltaChip(d) {
  const x = lbDeltaTag(d);
  return `<span class="lb-delta ${x.cls}">${x.sym}${x.t ? `<span class="num">${x.t}</span>` : ''}</span>`;
}

function renderLeaderboard(view) {
  if (!Auth.isLoggedIn()) return loginRequiredView(view, 'Đăng nhập để xem Bảng xếp hạng', 'Đăng nhập để đua hạng cùng các bạn cùng lớp nhé!');
  const grade = Auth.getUser().grade;
  const stage = stageFromGrade(grade);
  const play = stage === 'mam-non' || stage === 'tieu-hoc';
  const back = '<a href="/" class="back-btn">← Về trang chủ</a>';
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const hero = (sub) => `
    <div class="hero" style="padding:14px 6px 6px">
      ${play ? mascotSVG('celebrate') : ''}
      <h1>${play ? '🏆 ' : ''}Bảng xếp hạng</h1>
      <p class="hero-sub">${escapeHtml(sub)}</p>
    </div>`;

  const lbSub = () => {
    const where = LB_FILTER.scope === 'lop' ? `Lớp ${grade}` : `Toàn cấp ${STAGE_LABEL[stage]}`;
    const when = LB_FILTER.period === 'week' ? 'Tuần này (đặt lại thứ Hai)' : 'Mọi lúc';
    return `${where} · ${when}`;
  };

  const segHTML = (name, opts) => {
    const n = opts.length;
    const idx = Math.max(0, opts.findIndex(o => o.v === LB_FILTER[name]));
    const w = 100 / n;
    const thumb = `<span class="seg-thumb" style="width:calc(${w}% - 4px);transform:translateX(calc(${idx * 100}%))"></span>`;
    const btns = opts.map(o => `<button class="seg-btn ${o.v === LB_FILTER[name] ? 'active' : ''}" data-seg="${name}" data-val="${o.v}">${o.icon ? `<span>${o.icon}</span>` : ''}${o.label}</button>`).join('');
    return `<div class="seg">${thumb}${btns}</div>`;
  };
  const filtersHTML = () => `
    <div class="lb-filters">
      ${segHTML('period', [{ v: 'week', label: 'Tuần này' }, { v: 'all', label: 'Mọi lúc' }])}
      ${segHTML('scope', [{ v: 'lop', label: 'Lớp tôi' }, { v: 'cap', label: 'Cùng cấp' }])}
      ${segHTML('metric', [{ v: 'stars', label: 'Sao', icon: play ? '⭐' : '' }, { v: 'streak', label: 'Chuỗi ngày', icon: play ? '🔥' : '' }])}
    </div>`;

  const podiumSpot = (row, place, mi) => {
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
    if (!row) return `<div class="podium-spot p${place} empty-spot">
      <div class="ps-avatar-wrap"><div class="ps-avatar">?</div></div>
      <div class="ps-name">Còn trống</div><div class="ps-score">Cố lên nào!</div>
      <div class="ps-base num">${place}</div></div>`;
    return `<div class="podium-spot p${place}">
      ${place === 1 && play ? '<div class="ps-crown">👑</div>' : ''}
      <div class="ps-avatar-wrap"><div class="ps-avatar">${escapeHtml(row.avatar)}</div><span class="ps-medal">${medals[place]}</span></div>
      <div class="ps-name">${escapeHtml(row.name)}</div>
      <div class="ps-score">${mi.icon} <span class="num">${row.score}</span></div>
      <div class="ps-base num">${place}</div></div>`;
  };

  const medalOrRank = (rank) => rank <= 3 ? `<span class="lb-rank-medal">${['🥇', '🥈', '🥉'][rank - 1]}</span>` : `<span class="num">${rank}</span>`;

  const meCardHTML = (me, mi, hidden, noScore) => {
    if (hidden) return `<div class="lb-me-card cta">
      <div class="lbm-cta-text">Bạn đang ẩn khỏi bảng xếp hạng.<small>Bật công tắc bên dưới để cùng đua với các bạn nhé.</small></div></div>`;
    if (noScore) return `<div class="lb-me-card cta">
      <div class="lbm-cta-text">${play ? '⭐ ' : ''}Chưa có ${mi.unit} ${LB_FILTER.period === 'week' ? 'tuần này' : ''} — làm 1 bài để lên bảng nhé!<small>Hạng của bé sẽ hiện ở đây ngay khi có điểm.</small></div>
      <a href="/" class="btn btn-primary">Làm bài ngay</a></div>`;
    const top3 = me.rank <= 3;
    const dt = lbDeltaTag(me.delta);
    const subTxt = me.delta == null ? 'Chào mừng lên bảng! 🎉'
      : me.delta > 0 ? `Tăng ${me.delta} bậc tuần này`
      : me.delta < 0 ? `Giảm ${-me.delta} bậc tuần này`
      : 'Giữ hạng tuần này';
    const right = top3
      ? `<div class="lbm-medal">${['🥇', '🥈', '🥉'][me.rank - 1]}</div>`
      : `<div class="lbm-rank num" data-count="${me.rank}" data-prefix="#">#${me.rank}</div>`;
    return `<div class="lb-me-card">
      <div class="lbm-avatar">${escapeHtml(me.avatar)}</div>
      <div class="lbm-info">
        <div class="lbm-label">Hạng của bé</div>
        <div class="lbm-name">${escapeHtml(me.name)}</div>
        <div class="lbm-sub ${dt.cls}">${dt.sym} ${subTxt}</div>
      </div>
      <div class="lbm-right">${right}<div class="lbm-score">${mi.icon} ${me.score} ${mi.unit}</div></div>
    </div>`;
  };

  const rowHTML = (r, me, mi) => `<div class="lb-row ${r.isMe ? 'lb-me' : ''}">
    <span class="lb-rank">${medalOrRank(r.rank)}</span>
    <span class="lb-avatar">${escapeHtml(r.avatar)}</span>
    <span class="lb-name">${escapeHtml(r.name)}</span>
    <span class="lb-score"><span class="lb-star">${mi.icon}</span><span class="num">${r.score}</span></span>
    ${lbDeltaChip(r.delta)}</div>`;

  const paintLoading = () => {
    view.innerHTML = back + hero('Đang tải…') + `
      <div class="lb-skeleton">
        <div class="lb-me-card" style="background:var(--c-card);border:1px solid var(--c-border)">
          <div class="sk" style="width:54px;height:54px;border-radius:50%"></div>
          <div class="lbm-info"><div class="sk" style="width:60%;height:14px;margin-bottom:8px"></div><div class="sk" style="width:40%;height:12px"></div></div>
        </div>
        <div class="sk-podium"><div class="sk" style="height:90px"></div><div class="sk" style="height:120px"></div><div class="sk" style="height:70px"></div></div>
        ${[0, 1, 2, 3, 4].map(() => '<div class="sk sk-row"></div>').join('')}
      </div>`;
  };

  const countUp = () => {
    if (reduceMotion()) return;
    view.querySelectorAll('[data-count]').forEach(el => {
      const target = parseInt(el.dataset.count, 10) || 0;
      const pre = el.dataset.prefix || '';
      if (target <= 0) { el.textContent = pre + target; return; }
      const start = performance.now(), dur = 420;
      const stepFn = (t) => {
        const p = Math.min(1, (t - start) / dur);
        el.textContent = pre + Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(stepFn);
      };
      requestAnimationFrame(stepFn);
    });
  };

  const paint = (data) => {
    if (!data || !data.ok) {
      view.innerHTML = back + hero(lbSub()) + filtersHTML() +
        emptyState('Không tải được bảng xếp hạng.', 'Kiểm tra kết nối và thử lại nhé.',
          '<button class="btn btn-primary" id="lb-retry" style="margin-top:12px">Thử lại</button>');
      attach();
      const r = view.querySelector('#lb-retry'); if (r) r.onclick = load;
      return;
    }
    const me = data.me, top = data.top || [], total = data.total || 0;
    const mi = LB_METRIC[LB_FILTER.metric];
    const hidden = !!me.hidden;
    const noScore = !hidden && (!me.rank || me.score === 0);
    const solo = total === 1 && me.rank === 1;
    const champ = me.rank === 1 && total > 1;

    let html = back + hero(lbSub());
    if (champ) html += `<div class="lb-champ-banner"><span class="cb-ic">👑</span><span><b>Quán quân tuần!</b><small>Bé đang dẫn đầu ${LB_FILTER.scope === 'lop' ? 'lớp ' + grade : 'cấp ' + STAGE_LABEL[stage]}. Tuyệt vời!</small></span></div>`;
    html += meCardHTML(me, mi, hidden, noScore);
    html += filtersHTML();

    if (top.length === 0) {
      html += emptyState('Chưa có ai trên bảng.', 'Hãy là người đầu tiên ghi tên lên bảng nhé!',
        '<a href="/" class="btn btn-primary" style="margin-top:12px">Làm bài ngay</a>');
    } else {
      html += `<div class="lb-podium">${podiumSpot(top[1], 2, mi)}${podiumSpot(top[0], 1, mi)}${podiumSpot(top[2], 3, mi)}</div>`;
      if (solo) html += '<p class="lb-note solo">Bé đang dẫn đầu! Rủ bạn cùng học để đua nào 🎉</p>';
      const listRows = top.slice(3);
      if (listRows.length) {
        html += '<div class="lb-list-title">Bảng đầy đủ</div><div class="lb-list">' + listRows.map(r => rowHTML(r, me, mi)).join('') + '</div>';
      }
    }

    html += `<div class="lb-privacy"><div class="lp-info"><b>Hiện tên mình trên bảng xếp hạng</b><small>${hidden ? 'Bạn đang ẩn khỏi bảng. Bật để cùng đua nhé.' : 'Chỉ hiển thị biệt danh & nhân vật, không có thông tin thật của bé.'}</small></div><button class="switch ${hidden ? '' : 'on'}" id="lb-switch" aria-label="Hiện tên trên bảng"></button></div>`;
    html += '<p class="lb-note">Bảng chỉ hiển thị biệt danh &amp; nhân vật. Không có tên thật, trường lớp hay ảnh của bé.</p>';

    const listRows = top.slice(3);
    const meInList = listRows.some(r => r.isMe);
    if (!hidden && !noScore && me.rank && me.rank > 3 && !meInList) {
      html += `<div class="lb-sticky-me lb-row"><span class="lb-rank num">${me.rank}</span><span class="lb-avatar">${escapeHtml(me.avatar)}</span><span class="lb-name">${escapeHtml(me.name)}</span><span class="lb-score"><span class="lb-star">${mi.icon}</span><span class="num">${me.score}</span></span>${lbDeltaChip(me.delta)}</div>`;
    }

    view.innerHTML = html;
    attach();
    countUp();
    if (champ && !reduceMotion()) setTimeout(confetti, 300);
  };

  const attach = () => {
    view.querySelectorAll('.seg-btn').forEach(b => {
      b.onclick = () => { LB_FILTER[b.dataset.seg] = b.dataset.val; load(); };
    });
    const sw = view.querySelector('#lb-switch');
    if (sw) sw.onclick = async () => { sw.style.pointerEvents = 'none'; await Auth.getLeaderboard({ ...LB_FILTER, setHidden: sw.classList.contains('on') }); load(); };
  };

  const load = async () => {
    paintLoading();
    const guard = location.pathname;
    const data = await Auth.getLeaderboard(LB_FILTER);
    if (location.pathname !== guard) return; // người dùng đã rời màn
    paint(data);
  };

  load();
}

async function renderExercise(view, id) {
  let exercise;
  if (id.indexOf('daily-') === 0) {
    exercise = await Daily.getExercise(id);
    if (!exercise) { view.innerHTML = emptyState('Chưa có đề hôm nay cho mục này', 'Hãy chọn môn khác hoặc quay lại sau nhé!', '<a href="/" class="btn btn-primary" style="margin-top:14px">Về trang chủ</a>'); return; }
  } else {
    const meta = CATALOG.exercises.find(e => e.id === id);
    if (!meta) { view.innerHTML = emptyState('Không tìm thấy bài này', 'Có thể đường dẫn đã thay đổi.', '<a href="/" class="btn btn-primary" style="margin-top:14px">Về trang chủ</a>'); return; }
    // Đề ôn tập định kỳ + đề thi thử: bắt buộc đăng nhập mới làm
    if (isLockedExercise(meta) && !Auth.isLoggedIn()) {
      applyStageTheme(stageFromGrade(meta.grade));
      return loginRequiredView(view, 'Đăng nhập để làm đề kiểm tra',
        'Các đề ôn tập giữa kỳ, cuối kỳ và đề thi thử cần đăng nhập để lưu kết quả. Bạn đăng nhập rồi quay lại làm nhé!');
    }
    try {
      exercise = await (await fetch(`/exercises/${meta.path}`)).json();
    } catch (e) {
      view.innerHTML = emptyState('Không tải được bài', 'Kiểm tra kết nối mạng rồi thử lại nhé.', '<a href="/" class="btn btn-primary" style="margin-top:14px">Về trang chủ</a>');
      return;
    }
  }
  const isPreschool = exercise.stage === 'mam-non';
  applyStageTheme(isPreschool ? 'mam-non' : stageFromGrade(exercise.grade));
  const subject = isPreschool ? PRESCHOOL[exercise.subject] : SUBJECTS[exercise.subject];
  const backHref = exercise.daily
    ? '/'
    : isPreschool
      ? `/mam-non/age${exercise.grade}/${exercise.subject}`
      : `/lop${exercise.grade}/${exercise.subject}`;
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
        <span class="m-ic">🎯</span>
        <span class="m-body"><span class="name">Luyện tập</span><span class="desc">Biết đúng/sai ngay sau mỗi câu, có gợi ý</span></span>
      </button>
      <button class="mode-card exam" data-mode="exam">
        <span class="m-ic">📝</span>
        <span class="m-body"><span class="name">Làm bài thi</span><span class="desc">Làm hết rồi mới chấm điểm, giống thi thật</span></span>
      </button>
    </div>
  `;
  view.querySelectorAll('.mode-card').forEach(btn => {
    btn.onclick = () => startQuestions(btn.dataset.mode);
  });

  // Bước 2: làm bài
  function startQuestions(mode) {
    let currentIdx = 0, score = 0;
    // Mỗi lần vào làm: xáo câu + đáp án (chống học thuộc thứ tự). Bản sao, không đụng đề gốc.
    const questions = prepareQuestions(exercise);
    const total = questions.length;
    const answers = [];
    const timed = typeof exercise.timeLimit === 'number' && exercise.timeLimit > 0;
    const deadline = Date.now() + (exercise.timeLimit || 0) * 60000;
    let timerInterval = null, done = false;
    // Đo thời gian làm bài. Hiện đồng hồ đếm xuôi cho THCS/THPT (không phải đề bấm giờ); cấp nhỏ đo ngầm.
    const startTime = Date.now();
    const showCountUp = !timed && (exercise.stage === 'thcs' || exercise.stage === 'thpt');
    let elapsedInterval = null;

    const renderQuestion = () => {
      const q = questions[currentIdx];
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
        const totalMs = exercise.timeLimit * 60000;
        el.classList.toggle('low', remain <= 60000);                // cảnh báo cơ bản (< 1 phút)
        el.classList.toggle('warning', remain <= totalMs * 0.10);   // cảnh báo MẠNH (rung đỏ) khi < 10% tổng
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
      endExerciseFocus(); // bài đã xong → cho điều hướng tự do, hiện lại chrome
      if (timerInterval) clearInterval(timerInterval);
      if (elapsedInterval) clearInterval(elapsedInterval);
      const elapsedMs = Date.now() - startTime;
      const baseline = Progress.getAvgSecPerQ(); // tốc độ TB trước lần này (mốc so sánh là chính bé)
      const percent = Math.round((score / total) * 100);
      // Tường mềm: chỉ lưu/cộng thành tích khi ĐÃ đăng nhập VÀ đề đúng lớp của học sinh.
      // Chưa đăng nhập → luyện tập tự do, không lưu. Đề khác lớp → ôn, không tính.
      const loggedIn = Auth.isLoggedIn();
      const counts = loggedIn && Auth.countsForExercise(exercise);
      let isNewBest = false;
      if (counts) {
        isNewBest = Progress.markCompleted(exercise.id, score, total);
        Progress.addStars(score);
        Progress.recordTime(total, elapsedMs);
        if (exercise.daily) Progress.recordDaily(exercise.subject, score, total, elapsedMs);
      }
      updateHeader();
      const earnNote = counts
        ? `Bạn được +${score} ⭐`
        : (loggedIn
          ? '📖 Đề ôn (khác lớp) — không tính sao &amp; thành tích'
          : '🔐 <a href="/tai-khoan">Đăng nhập</a> để lưu kết quả &amp; nhận sao');

      let emoji, title;
      if (percent === 100) { emoji = '🏆'; title = 'XUẤT SẮC!'; }
      else if (percent >= 80) { emoji = '🌟'; title = 'Rất giỏi!'; }
      else if (percent >= 50) { emoji = '👍'; title = 'Khá tốt!'; }
      else { emoji = '💪'; title = 'Cố gắng thêm nhé!'; }
      const mascotMood = percent >= 80 ? 'celebrate' : percent >= 50 ? 'happy' : 'try';

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
          <div class="result-mascot">${mascotSVG(mascotMood)}</div>
          <div class="result-title">${emoji} ${title}</div>
          <div class="result-score">${score}/${total}</div>
          <div class="result-stars">${'⭐'.repeat(Math.min(score, 10))}</div>
          ${isNewBest ? '<div style="color:#FF8A65;font-weight:700;margin-bottom:10px">🎉 Kỷ lục mới!</div>' : ''}
          <div class="result-time">⏱ ${timeStr} · ~${secPerQ.toFixed(0)} giây/câu</div>
          ${timeNote ? `<div class="time-note">${timeNote}</div>` : ''}
          <div style="color:#6B6B8C;margin:10px 0 16px">${earnNote}</div>
          <div class="recap">${recap}</div>
          <div class="action-bar" style="justify-content:center;margin-top:22px">
            <button class="btn btn-secondary" onclick="navTo('${backHref}')">Bài khác</button>
            <button class="btn btn-primary" id="retry-btn">Làm lại</button>
          </div>
        </div>`;
      view.querySelector('#retry-btn').onclick = () => renderExercise(view, id);
      if (percent >= 80) confetti();
    };

    beginExerciseFocus(); // ẩn chrome điều hướng + chặn thoát nhầm
    renderQuestion();
    if (timed) startTimer();
    if (showCountUp) startElapsedTimer();
  }
}

// ===== Zoom ảnh (Đợt 2) =====
// Mở ảnh phóng to trong overlay; mobile pinch-zoom native (touch-action: pinch-zoom).
// Đóng bằng: bấm nút X, bấm nền, hoặc phím Esc.
window.__openImageZoom = function (src, alt) {
  if (!src) return;
  const old = document.getElementById('img-zoom-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'img-zoom-overlay';
  overlay.className = 'img-zoom-overlay';
  overlay.innerHTML = `
    <button class="img-zoom-close" aria-label="Đóng">×</button>
    <img src="${src}" alt="${alt || ''}" draggable="false">
    <div class="img-zoom-hint">Kẹp 2 ngón để phóng to · Bấm nền hoặc ESC để đóng</div>`;
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  overlay.querySelector('.img-zoom-close').onclick = (e) => { e.stopPropagation(); close(); };
  overlay.querySelector('img').onclick = (e) => e.stopPropagation(); // bấm vào ảnh KHÔNG đóng
  overlay.onclick = close; // bấm nền (ngoài ảnh) thì đóng
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
};

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
