// Quản lý tài khoản học sinh: đăng ký/đăng nhập/đăng xuất + đồng bộ tiến trình lên server (Worker + KV).
// Đăng nhập bằng biệt danh (không phân biệt hoa/thường) + mật khẩu. Tiến trình theo tài khoản, đồng bộ đa thiết bị.
const Auth = (() => {
  const SESSION_KEY = 'be-hoc-vui-auth';
  const SYNC_DEBOUNCE = 1500;
  let session = null;        // { username (chuẩn hóa), token, displayName, grade }
  let syncTimer = null;
  let deletedNotice = false; // tài khoản bị xóa do 15 ngày không hoạt động → báo người dùng

  function norm(s) { return String(s || '').trim().replace(/\s+/g, ' ').toLowerCase(); }

  function loadSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch { return null; }
  }
  function persist() {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }

  function isLoggedIn() { return !!session; }
  function getUser() { return session; }
  function consumeDeletedNotice() { const v = deletedNotice; deletedNotice = false; return v; }
  // Đề thuộc lớp của học sinh thì mới tính thành tích/phân tích; chưa đăng nhập thì tính như cũ.
  function countsForExercise(ex) {
    if (!session) return true;
    return Number(ex && ex.grade) === Number(session.grade);
  }

  async function api(path, payload) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  function activate(progress) {
    Progress.setActiveKey(session.username);   // chuyển sang kho riêng của tài khoản
    if (progress) Progress.replaceAll(progress); // nạp tiến trình từ server
    Progress.onSave(scheduleSync);              // mỗi lần lưu → đồng bộ lên server
  }

  async function register({ username, password, grade }) {
    const r = await api('/api/register', { username, password, grade });
    if (!r.ok) return r;
    session = { username: norm(username), token: r.token, displayName: r.displayName, grade: r.grade };
    persist(); activate(r.progress);
    return r;
  }

  async function login({ username, password }) {
    const r = await api('/api/login', { username, password });
    if (!r.ok) return r;
    session = { username: norm(username), token: r.token, displayName: r.displayName, grade: r.grade };
    persist(); activate(r.progress);
    return r;
  }

  function logout() {
    session = null; persist();
    Progress.onSave(null);
    Progress.setActiveKey(null); // về kho ẩn danh
    if (window.route) window.route();
  }

  function scheduleSync() {
    if (!session) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncUp, SYNC_DEBOUNCE);
  }
  async function syncUp() {
    if (!session) return;
    const r = await api('/api/sync', { username: session.username, token: session.token, progress: Progress.load() }).catch(() => null);
    if (r && r.ok && r.progress) Progress.replaceAll(r.progress);
    else if (r && (r.error === 'not_found' || r.error === 'auth')) handleExpired();
  }

  function handleExpired() {
    deletedNotice = true;
    session = null; persist();
    Progress.onSave(null); Progress.setActiveKey(null);
    if (window.route) window.route();
  }

  async function refreshFromServer() {
    if (!session) return;
    const r = await api('/api/me', { username: session.username, token: session.token }).catch(() => null);
    if (r && r.ok) {
      session.displayName = r.displayName; session.grade = r.grade; persist();
      Progress.replaceAll(r.progress);
      if (window.route) window.route();
    } else if (r && (r.error === 'not_found' || r.error === 'auth')) {
      handleExpired();
    }
  }

  // Khởi tạo phiên khi tải trang (chạy trước app.js trong thứ tự <script>)
  session = loadSession();
  if (session) {
    Progress.setActiveKey(session.username);
    Progress.onSave(scheduleSync);
    refreshFromServer(); // bất đồng bộ; re-render khi có dữ liệu mới nhất
  }

  // Lấy bảng xếp hạng (kèm xác thực). params: { scope, period, metric, setHidden? }
  async function getLeaderboard(params) {
    if (!session) return { ok: false, error: 'auth' };
    return api('/api/leaderboard', { username: session.username, token: session.token, ...params })
      .catch(() => ({ ok: false, error: 'network' }));
  }

  return { isLoggedIn, getUser, register, login, logout, syncUp, consumeDeletedNotice, countsForExercise, getLeaderboard };
})();
