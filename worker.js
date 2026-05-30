// Worker cho "Bé Học Vui": phục vụ file tĩnh + API tài khoản (đồng bộ tiến trình đa thiết bị).
// Tài khoản lưu trong KV (binding PROGRESS). Mật khẩu băm PBKDF2 + salt.
// Tự xóa sau 15 ngày KHÔNG làm bài: mỗi lần làm bài (sync) gia hạn TTL 15 ngày; đăng nhập không gia hạn.

const TTL_DAYS = 15;
const TTL_SECONDS = TTL_DAYS * 24 * 60 * 60;
const MAX_TOKENS = 5; // số thiết bị đăng nhập đồng thời giữ lại

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        return json({ ok: false, error: 'server_error', detail: String(err) }, 500);
      }
    }
    // Đường dẫn ảo của router (vd /lop3/toan) không có file → Cloudflare tự trả index.html
    // (assets.not_found_handling = "single-page-application"), KHÔNG redirect, giữ nguyên URL.
    const res = await env.ASSETS.fetch(request);
    // Chèn tiêu đề/mô tả RIÊNG cho từng URL (SEO) — chỉ với trang HTML, request GET.
    const ct = res.headers.get('content-type') || '';
    if (request.method === 'GET' && ct.includes('text/html')) {
      return injectSeo(res, env, url);
    }
    return res;
  },
};

// ===== SEO: chèn title/description/canonical riêng cho từng đường dẫn =====
const SEO_DOMAIN = 'https://behocvui.id.vn';
let SEO_MAP = null;
async function loadSeo(env, url) {
  if (SEO_MAP) return SEO_MAP;
  try {
    const r = await env.ASSETS.fetch(new URL('/seo-meta.json', url));
    SEO_MAP = r.ok ? await r.json() : {};
  } catch { SEO_MAP = {}; }
  return SEO_MAP;
}
async function injectSeo(res, env, url) {
  const seo = await loadSeo(env, url);
  const key = url.pathname.replace(/\/+$/, '') || '/';
  const m = seo[key];
  if (!m) return res; // đường dẫn không có mô tả riêng → giữ mặc định
  const canonical = SEO_DOMAIN + (key === '/' ? '/' : key);
  const content = (val) => ({ element(e) { e.setAttribute('content', val); } });
  return new HTMLRewriter()
    .on('title', { element(e) { e.setInnerContent(m.t); } })
    .on('meta[name="description"]', content(m.d))
    .on('meta[property="og:title"]', content(m.t))
    .on('meta[property="og:description"]', content(m.d))
    .on('meta[name="twitter:title"]', content(m.t))
    .on('meta[name="twitter:description"]', content(m.d))
    .on('meta[property="og:url"]', content(canonical))
    .on('link[rel="canonical"]', { element(e) { e.setAttribute('href', canonical); } })
    .transform(res);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

// ===== Tiện ích =====
function normName(s) {
  return String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
}
function accKey(name) { return 'acc:' + normName(name); }

function toHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function fromHex(hex) {
  const a = new Uint8Array(hex.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = parseInt(hex.substr(i * 2, 2), 16);
  return a;
}
function randHex(bytes) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return toHex(a.buffer);
}
async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations: 100000, hash: 'SHA-256' }, km, 256);
  return toHex(bits);
}
function validGrade(g) { return Number.isInteger(g) && g >= 1 && g <= 12; }

async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}
function emptyProgress() {
  return { stars: 0, completed: {}, history: [], avatar: null, dailyLog: {}, starLog: {}, studyDays: {}, settings: {}, stickers: {}, speed: { questions: 0, timeMs: 0 } };
}

async function getAccount(env, name) {
  const raw = await env.PROGRESS.get(accKey(name));
  return raw ? JSON.parse(raw) : null;
}
async function putAccount(env, acc, refreshActivity) {
  const now = Date.now();
  // Chỉ gia hạn tuổi thọ khi CÓ làm bài (sync). Đăng nhập/đọc thì giữ nguyên hạn cũ.
  if (refreshActivity || !acc.activityExpiresAt) {
    acc.activityExpiresAt = now + TTL_SECONDS * 1000;
  }
  let ttl = Math.ceil((acc.activityExpiresAt - now) / 1000);
  if (ttl < 60) ttl = 60;
  await env.PROGRESS.put(accKey(acc.name), JSON.stringify(acc), { expirationTtl: ttl });
}

// ===== Định tuyến API =====
async function handleApi(request, env, url) {
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  const body = await readBody(request);
  switch (url.pathname) {
    case '/api/register': return register(env, body);
    case '/api/login': return login(env, body);
    case '/api/me': return me(env, body);
    case '/api/sync': return sync(env, body);
    case '/api/leaderboard': return leaderboard(env, body);
    case '/api/set-parent-pin': return setParentPin(env, body);
    case '/api/parent-view': return parentView(env, body);
    default: return json({ ok: false, error: 'not_found' }, 404);
  }
}

async function register(env, body) {
  const name = String(body.username || '');
  const password = String(body.password || '');
  const grade = body.grade;
  if (normName(name).length < 2) return json({ ok: false, error: 'name_short' });
  if (password.length < 4) return json({ ok: false, error: 'pass_short' });
  if (!validGrade(grade)) return json({ ok: false, error: 'grade' });
  if (await getAccount(env, name)) return json({ ok: false, error: 'exists' });

  const salt = randHex(16);
  const hash = await hashPassword(password, salt);
  const token = randHex(24);
  const acc = {
    name: normName(name),
    displayName: name.trim().replace(/\s+/g, ' '),
    grade, salt, hash,
    tokens: { [token]: Date.now() },
    progress: emptyProgress(),
    createdAt: Date.now(),
  };
  await putAccount(env, acc, true);
  return json({ ok: true, token, displayName: acc.displayName, grade, progress: acc.progress, hasPin: false });
}

async function login(env, body) {
  const acc = await getAccount(env, body.username);
  if (!acc) return json({ ok: false, error: 'not_found' });
  const hash = await hashPassword(String(body.password || ''), acc.salt);
  if (hash !== acc.hash) return json({ ok: false, error: 'wrong_pass' });

  const token = randHex(24);
  acc.tokens = acc.tokens || {};
  acc.tokens[token] = Date.now();
  acc.tokens = Object.fromEntries(Object.entries(acc.tokens).sort((a, b) => b[1] - a[1]).slice(0, MAX_TOKENS));
  await putAccount(env, acc, false); // đăng nhập không gia hạn tuổi thọ
  return json({ ok: true, token, displayName: acc.displayName, grade: acc.grade, progress: acc.progress, hasPin: !!acc.pinHash });
}

async function me(env, body) {
  const acc = await getAccount(env, body.username);
  if (!acc) return json({ ok: false, error: 'not_found' });
  if (!acc.tokens || !acc.tokens[String(body.token || '')]) return json({ ok: false, error: 'auth' });
  return json({ ok: true, displayName: acc.displayName, grade: acc.grade, progress: acc.progress, hasPin: !!acc.pinHash });
}

async function sync(env, body) {
  const acc = await getAccount(env, body.username);
  if (!acc) return json({ ok: false, error: 'not_found' });
  if (!acc.tokens || !acc.tokens[String(body.token || '')]) return json({ ok: false, error: 'auth' });
  acc.progress = mergeProgress(acc.progress || emptyProgress(), body.progress || {});
  await putAccount(env, acc, true); // làm bài = có hoạt động → gia hạn 15 ngày
  return json({ ok: true, progress: acc.progress });
}

// ===== Theo dõi của phụ huynh (mã PIN xem tiến trình, CHỈ ĐỌC) =====
const PV_MAX_FAIL = 5;                       // số lần nhập sai trước khi khóa
const PV_LOCK_MS = 15 * 60 * 1000;           // khóa thử 15 phút sau khi vượt ngưỡng
function pvFailKey(name) { return 'pv:fail:' + normName(name); }

// Con (đang đăng nhập) đặt/đổi/xóa mã phụ huynh 6 chữ số. pin='' để tắt.
async function setParentPin(env, body) {
  const acc = await getAccount(env, body.username);
  if (!acc) return json({ ok: false, error: 'not_found' });
  if (!acc.tokens || !acc.tokens[String(body.token || '')]) return json({ ok: false, error: 'auth' });
  const pin = String(body.pin || '');
  if (pin === '') {
    delete acc.pinHash; delete acc.pinSalt;
    await putAccount(env, acc, false);
    return json({ ok: true, hasPin: false });
  }
  if (!/^\d{6}$/.test(pin)) return json({ ok: false, error: 'pin_format' });
  acc.pinSalt = randHex(16);
  acc.pinHash = await hashPassword(pin, acc.pinSalt);
  await putAccount(env, acc, false); // đặt PIN không tính là "làm bài"
  return json({ ok: true, hasPin: true });
}

// Phụ huynh (không cần đăng nhập) nhập biệt danh con + PIN → trả dữ liệu CHỈ ĐỌC.
async function parentView(env, body) {
  const name = normName(body.username);
  const fkey = pvFailKey(name);
  const now = Date.now();
  let fail = null;
  try { const r = await env.PROGRESS.get(fkey); fail = r ? JSON.parse(r) : null; } catch { /* bỏ qua */ }
  if (fail && fail.until && fail.until > now) {
    return json({ ok: false, error: 'locked', retryInSec: Math.ceil((fail.until - now) / 1000) });
  }

  const acc = await getAccount(env, body.username);
  const pin = String(body.pin || '');
  if (acc && !acc.pinHash) return json({ ok: false, error: 'no_pin' }); // chưa bật tính năng
  const ok = acc && acc.pinHash && /^\d{6}$/.test(pin)
    && (await hashPassword(pin, acc.pinSalt)) === acc.pinHash;
  if (!ok) {
    const n = ((fail && fail.n) || 0) + 1;
    const locked = n >= PV_MAX_FAIL;
    await env.PROGRESS.put(fkey, JSON.stringify({ n, until: locked ? now + PV_LOCK_MS : 0 }),
      { expirationTtl: Math.ceil(PV_LOCK_MS / 1000) });
    return json({ ok: false, error: locked ? 'locked' : 'invalid', left: Math.max(0, PV_MAX_FAIL - n) });
  }

  await env.PROGRESS.delete(fkey).catch(() => {}); // đúng PIN → xóa bộ đếm sai
  return json({ ok: true, displayName: acc.displayName, grade: acc.grade, progress: acc.progress || emptyProgress() });
}

// ===== Bảng xếp hạng =====
const LB_INDEX_KEY = 'lb:index';
const LB_INDEX_TTL_MS = 60 * 1000;   // làm mới chỉ mục tổng hợp tối đa mỗi 60s
const LB_TOP = 50;                   // số hàng trả về

function pad2(n) { return String(n).padStart(2, '0'); }
function stageOf(g) { return g >= 10 ? 'thpt' : g >= 6 ? 'thcs' : 'tieu-hoc'; }
// Ngày theo giờ VN (+07) dạng YYYY-MM-DD (so sánh chuỗi được vì khóa dailyLog cùng dạng)
function vnDate(ms) {
  const d = new Date(ms + 7 * 3600 * 1000);
  return { key: `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`, d };
}
function vnMondayKey(ms) {
  const d = new Date(ms + 7 * 3600 * 1000);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = thứ Hai
  d.setUTCDate(d.getUTCDate() - dow);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}
function nextMondayISO(ms) {
  const d = new Date(ms + 7 * 3600 * 1000);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() + (7 - dow));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T00:00:00+07:00`;
}
// Tổng sao trong khoảng [fromKey, toKey) theo SỔ SAO ngày (toKey=null → tới nay)
function starsBetween(starLog, fromKey, toKey) {
  let sum = 0;
  for (const [k, v] of Object.entries(starLog || {})) {
    if (k >= fromKey && (toKey === null || k < toKey)) sum += (v || 0);
  }
  return sum;
}
// Cắt bớt sổ sao trên máy chủ (giữ ~6.5 tuần) để khỏi phình
function pruneStarLogSrv(log, ms) {
  const cutoff = vnMondayKey(ms - 45 * 86400 * 1000);
  const out = {};
  for (const k of Object.keys(log || {})) if (k >= cutoff) out[k] = log[k];
  return out;
}
function prevDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d)); dt.setUTCDate(dt.getUTCDate() - 1);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}
// Chuỗi ngày liên tiếp có làm bài, tính tới ngày mốc endKey (YYYY-MM-DD)
function streakEndingAt(dailyLog, endKey) {
  const has = k => dailyLog[k] && dailyLog[k].subjects && Object.keys(dailyLog[k].subjects).length > 0;
  let k = endKey;
  if (!has(k)) k = prevDateKey(k); // ngày mốc chưa làm → tính từ hôm trước
  let s = 0;
  while (has(k)) { s++; k = prevDateKey(k); }
  return s;
}
// Tóm tắt 1 tài khoản kèm số liệu "tuần trước" để tính delta tăng/giảm bậc
function summarize(acc, ms) {
  const p = acc.progress || {};
  const starLog = p.starLog || {};
  const dayLog = p.dailyLog || {};   // streak vẫn dựa trên ngày có làm bài
  const thisMon = vnMondayKey(ms);
  const lastMon = vnMondayKey(ms - 7 * 86400 * 1000);
  return {
    name: acc.name,
    displayName: acc.displayName || acc.name,
    grade: acc.grade,
    avatar: p.avatar || '🐣',
    starsAll: p.stars || 0,
    starsWeek: starsBetween(starLog, thisMon, null),
    starsPrevWeek: starsBetween(starLog, lastMon, thisMon),
    streak: streakEndingAt(dayLog, vnDate(ms).key),
    streakPrev: streakEndingAt(dayLog, prevDateKey(thisMon)), // tính tới hết tuần trước
    optOut: !!acc.lbOptOut,
  };
}
// Quét toàn bộ tài khoản → chỉ mục tóm tắt, có cache ngắn trong KV để khỏi quét mỗi request
async function getIndex(env) {
  const now = Date.now();
  const cachedRaw = await env.PROGRESS.get(LB_INDEX_KEY);
  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw);
      if (cached && (now - cached.at) < LB_INDEX_TTL_MS && Array.isArray(cached.accounts)) return cached.accounts;
    } catch { /* rebuild */ }
  }
  const accounts = [];
  let cursor;
  do {
    const res = await env.PROGRESS.list({ prefix: 'acc:', cursor });
    for (const k of res.keys) {
      const raw = await env.PROGRESS.get(k.name);
      if (!raw) continue;
      let acc; try { acc = JSON.parse(raw); } catch { continue; }
      if (!validGrade(acc.grade)) continue;
      accounts.push(summarize(acc, now));
    }
    cursor = res.list_complete ? null : res.cursor;
  } while (cursor);
  await env.PROGRESS.put(LB_INDEX_KEY, JSON.stringify({ at: now, accounts }), { expirationTtl: 300 });
  return accounts;
}
// Giá trị xếp hạng: when='now' (hiện tại) | 'prev' (tính tới hết tuần trước, để ra delta)
function lbValue(s, metric, period, when) {
  if (metric === 'streak') return when === 'prev' ? (s.streakPrev || 0) : (s.streak || 0);
  if (period === 'all') return when === 'prev' ? Math.max(0, (s.starsAll || 0) - (s.starsWeek || 0)) : (s.starsAll || 0);
  return when === 'prev' ? (s.starsPrevWeek || 0) : (s.starsWeek || 0);
}
// Sắp xếp ổn định: điểm giảm dần → phá hòa bằng tổng sao → tên
function lbSort(metric, period, when) {
  return (a, b) => (lbValue(b, metric, period, when) - lbValue(a, metric, period, when))
    || ((b.starsAll || 0) - (a.starsAll || 0))
    || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}

async function leaderboard(env, body) {
  const acc = await getAccount(env, body.username);
  if (!acc) return json({ ok: false, error: 'not_found' });
  if (!acc.tokens || !acc.tokens[String(body.token || '')]) return json({ ok: false, error: 'auth' });

  // Bật/tắt hiển thị tên trên bảng (quyền riêng tư)
  if (typeof body.setHidden === 'boolean') {
    acc.lbOptOut = body.setHidden;
    await putAccount(env, acc, false); // đổi tùy chọn không tính là hoạt động
  }

  const scope = body.scope === 'cap' ? 'cap' : 'lop';
  const period = body.period === 'all' ? 'all' : 'week';
  const metric = body.metric === 'streak' ? 'streak' : 'stars';
  const now = Date.now();
  const grade = acc.grade;
  const stage = stageOf(grade);

  const index = await getIndex(env);
  const meFresh = summarize(acc, now); // dữ liệu của chính bé luôn lấy mới (không qua cache)

  // Lọc theo phạm vi; loại người đã ẩn; thay bản của bé bằng dữ liệu mới
  const inScope = s => scope === 'lop' ? s.grade === grade : stageOf(s.grade) === stage;
  const list = index.filter(s => inScope(s) && !s.optOut && s.name !== acc.name);
  if (!meFresh.optOut) list.push(meFresh);
  list.sort(lbSort(metric, period, 'now'));

  // Hạng "tuần trước" trên cùng nhóm để ra delta (hạng trước − hạng nay; dương = tăng)
  const prevRank = new Map();
  [...list].sort(lbSort(metric, period, 'prev')).forEach((s, i) => prevRank.set(s.name, i + 1));
  const curRank = new Map();
  list.forEach((s, i) => curRank.set(s.name, i + 1));
  const deltaOf = name => {
    const pr = prevRank.get(name), cr = curRank.get(name);
    return (pr == null || cr == null) ? null : (pr - cr);
  };

  const meIdx = meFresh.optOut ? -1 : list.findIndex(s => s.name === acc.name);
  const top = list.slice(0, LB_TOP).map((s, i) => ({
    rank: i + 1,
    name: s.displayName,
    avatar: s.avatar,
    score: lbValue(s, metric, period, 'now'),
    delta: deltaOf(s.name),
    isMe: s.name === acc.name,
  }));

  return json({
    ok: true,
    scope, period, metric, grade,
    resetAt: nextMondayISO(now),
    total: list.length,
    me: {
      rank: meIdx >= 0 ? meIdx + 1 : null,
      score: lbValue(meFresh, metric, period, 'now'),
      delta: meFresh.optOut ? null : deltaOf(meFresh.name),
      name: meFresh.displayName,
      avatar: meFresh.avatar,
      hidden: !!meFresh.optOut,
    },
    top,
  });
}

// ===== Gộp tiến trình từ nhiều thiết bị =====
function mergeProgress(a, b) {
  a = a || {}; b = b || {};
  const out = emptyProgress();
  out.stars = Math.max(a.stars || 0, b.stars || 0);
  out.avatar = b.avatar || a.avatar || null;

  // completed: union theo id, giữ điểm cao nhất + lần làm gần nhất
  out.completed = {};
  for (const src of [a.completed || {}, b.completed || {}]) {
    for (const [id, rec] of Object.entries(src)) {
      const cur = out.completed[id];
      if (!cur) { out.completed[id] = { ...rec }; continue; }
      const latest = (rec.lastDoneAt || 0) >= (cur.lastDoneAt || 0) ? rec : cur;
      out.completed[id] = {
        score: latest.score, total: latest.total,
        lastDoneAt: Math.max(cur.lastDoneAt || 0, rec.lastDoneAt || 0),
        bestScore: Math.max(cur.bestScore || 0, rec.bestScore || 0),
      };
    }
  }

  // history: gộp, sắp theo thời gian giảm dần, khử trùng, giữ 50
  const seen = new Set();
  out.history = [...(a.history || []), ...(b.history || [])]
    .sort((x, y) => (y.at || 0) - (x.at || 0))
    .filter(h => { const k = h.exerciseId + '|' + h.at; if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 50);

  // dailyLog: union ngày → union môn → giữ điểm cao hơn (hòa thì mới hơn)
  out.dailyLog = {};
  const days = new Set([...Object.keys(a.dailyLog || {}), ...Object.keys(b.dailyLog || {})]);
  for (const day of days) {
    const subjects = {};
    for (const src of [(a.dailyLog || {})[day], (b.dailyLog || {})[day]]) {
      if (!src || !src.subjects) continue;
      for (const [s, r] of Object.entries(src.subjects)) {
        const cur = subjects[s];
        if (!cur) { subjects[s] = r; continue; }
        if ((r.score || 0) > (cur.score || 0)) subjects[s] = r;
        else if ((r.score || 0) === (cur.score || 0) && (r.at || 0) >= (cur.at || 0)) subjects[s] = r;
      }
    }
    out.dailyLog[day] = { subjects };
  }

  // speed (tổng tích lũy): lấy bên có nhiều câu hơn để tránh cộng dồn sai
  const sa = a.speed || { questions: 0, timeMs: 0 }, sb = b.speed || { questions: 0, timeMs: 0 };
  out.speed = (sb.questions || 0) >= (sa.questions || 0)
    ? { questions: sb.questions || 0, timeMs: sb.timeMs || 0 }
    : { questions: sa.questions || 0, timeMs: sa.timeMs || 0 };

  // starLog: union ngày, giữ giá trị lớn hơn mỗi ngày (nhất quán với stars = max)
  const sl = {};
  for (const day of new Set([...Object.keys(a.starLog || {}), ...Object.keys(b.starLog || {})])) {
    sl[day] = Math.max((a.starLog || {})[day] || 0, (b.starLog || {})[day] || 0);
  }
  out.starLog = pruneStarLogSrv(sl, Date.now());

  // studyDays: union ngày học liên tiếp — true thắng vắng mặt
  out.studyDays = { ...(a.studyDays || {}), ...(b.studyDays || {}) };

  // settings: union, client (b) thắng khi xung đột (vì client vừa edit & sync lên)
  out.settings = { ...(a.settings || {}), ...(b.settings || {}) };

  // stickers: union, GIỮ NGÀY SỚM hơn (sticker là vĩnh viễn, "ngày nhận đầu tiên")
  const stickerKeys = new Set([...Object.keys(a.stickers || {}), ...Object.keys(b.stickers || {})]);
  out.stickers = {};
  for (const k of stickerKeys) {
    const da = (a.stickers || {})[k], db = (b.stickers || {})[k];
    if (da && db) out.stickers[k] = da < db ? da : db;
    else out.stickers[k] = da || db;
  }

  return out;
}
