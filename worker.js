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
