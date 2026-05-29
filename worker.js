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
    return env.ASSETS.fetch(request);
  },
};

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
  return { stars: 0, completed: {}, history: [], avatar: null, dailyLog: {}, speed: { questions: 0, timeMs: 0 } };
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
  return json({ ok: true, token, displayName: acc.displayName, grade, progress: acc.progress });
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
  return json({ ok: true, token, displayName: acc.displayName, grade: acc.grade, progress: acc.progress });
}

async function me(env, body) {
  const acc = await getAccount(env, body.username);
  if (!acc) return json({ ok: false, error: 'not_found' });
  if (!acc.tokens || !acc.tokens[String(body.token || '')]) return json({ ok: false, error: 'auth' });
  return json({ ok: true, displayName: acc.displayName, grade: acc.grade, progress: acc.progress });
}

async function sync(env, body) {
  const acc = await getAccount(env, body.username);
  if (!acc) return json({ ok: false, error: 'not_found' });
  if (!acc.tokens || !acc.tokens[String(body.token || '')]) return json({ ok: false, error: 'auth' });
  acc.progress = mergeProgress(acc.progress || emptyProgress(), body.progress || {});
  await putAccount(env, acc, true); // làm bài = có hoạt động → gia hạn 15 ngày
  return json({ ok: true, progress: acc.progress });
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
// Tổng "sao" trong tuần (gần đúng: tổng điểm đề hôm nay theo ngày, từ thứ Hai)
function weekStars(dailyLog, ms) {
  const monday = vnMondayKey(ms);
  let sum = 0;
  for (const [k, day] of Object.entries(dailyLog || {})) {
    if (k >= monday) for (const r of Object.values((day && day.subjects) || {})) sum += (r.score || 0);
  }
  return sum;
}
// Chuỗi ngày liên tiếp có làm bài (theo giờ VN), giống Progress.getStreak phía client
function computeStreak(dailyLog, ms) {
  const has = key => dailyLog[key] && dailyLog[key].subjects && Object.keys(dailyLog[key].subjects).length > 0;
  const probe = new Date(ms + 7 * 3600 * 1000); probe.setUTCHours(0, 0, 0, 0);
  const keyOf = dt => `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
  if (!has(keyOf(probe))) probe.setUTCDate(probe.getUTCDate() - 1);
  let streak = 0;
  while (has(keyOf(probe))) { streak++; probe.setUTCDate(probe.getUTCDate() - 1); }
  return streak;
}
function summarize(acc, ms) {
  const p = acc.progress || {};
  return {
    name: acc.name,
    displayName: acc.displayName || acc.name,
    grade: acc.grade,
    avatar: p.avatar || '🐣',
    starsAll: p.stars || 0,
    starsWeek: weekStars(p.dailyLog, ms),
    streak: computeStreak(p.dailyLog || {}, ms),
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
function scoreOf(s, metric, period) {
  if (metric === 'streak') return s.streak || 0;
  return period === 'all' ? (s.starsAll || 0) : (s.starsWeek || 0);
}
// Sắp xếp ổn định: điểm giảm dần → phá hòa bằng tổng sao → tên
function lbSort(metric, period) {
  return (a, b) => (scoreOf(b, metric, period) - scoreOf(a, metric, period))
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
  list.sort(lbSort(metric, period));

  const meIdx = meFresh.optOut ? -1 : list.findIndex(s => s.name === acc.name);
  const top = list.slice(0, LB_TOP).map((s, i) => ({
    rank: i + 1,
    name: s.displayName,
    avatar: s.avatar,
    score: scoreOf(s, metric, period),
    isMe: s.name === acc.name,
  }));

  return json({
    ok: true,
    scope, period, metric, grade,
    resetAt: nextMondayISO(now),
    total: list.length,
    me: {
      rank: meIdx >= 0 ? meIdx + 1 : null,
      score: scoreOf(meFresh, metric, period),
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

  return out;
}
