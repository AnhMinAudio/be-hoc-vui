// Quản lý tiến độ học sinh — lưu vào localStorage
const Progress = (() => {
  const BASE_KEY = 'be-hoc-vui-progress-v1';
  // Khi đăng nhập, tiến trình lưu vào kho riêng theo tài khoản (BASE_KEY::<user>);
  // khi chưa đăng nhập dùng kho ẩn danh (BASE_KEY).
  let activeKey = BASE_KEY;
  let afterSave = null;
  function setActiveKey(suffix) { activeKey = suffix ? `${BASE_KEY}::${suffix}` : BASE_KEY; }
  function onSave(cb) { afterSave = cb; }

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(activeKey));
      return Object.assign({ stars: 0, completed: {}, history: [], avatar: null, dailyLog: {}, starLog: {}, studyDays: {}, speed: { questions: 0, timeMs: 0 } }, d || {});
    } catch {
      return { stars: 0, completed: {}, history: [], avatar: null, dailyLog: {}, starLog: {}, studyDays: {}, speed: { questions: 0, timeMs: 0 } };
    }
  }

  // ===== Nhật ký làm đề hàng ngày =====
  // Cửa sổ PHÂN TÍCH số liệu = 28 ngày gần nhất.
  // Bộ NHỚ giữ đủ phủ CẢ tháng hiện tại lẫn 28 ngày (để lịch tháng đánh dấu đủ kể cả cuối tháng).
  const ANALYSIS_DAYS = 28;
  function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function todayKey() { return dateKey(new Date()); }
  function analysisStartKey() {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (ANALYSIS_DAYS - 1));
    return dateKey(d);
  }
  function pruneDaily(log) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const win = new Date(today); win.setDate(win.getDate() - (ANALYSIS_DAYS - 1));
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const cutoff = win < monthStart ? win : monthStart; // mốc sớm hơn trong 2 mốc
    const cutoffKey = dateKey(cutoff);
    const out = {};
    for (const k of Object.keys(log || {})) if (k >= cutoffKey) out[k] = log[k];
    return out;
  }
  // Nhật ký giới hạn trong 28 ngày gần nhất — dùng cho mọi thống kê phân tích.
  function recentLog() {
    const log = getDailyLog();
    const startKey = analysisStartKey();
    const out = {};
    for (const k of Object.keys(log)) if (k >= startKey) out[k] = log[k];
    return out;
  }
  function recordDaily(subject, score, total, timeMs) {
    const data = load();
    data.dailyLog = pruneDaily(data.dailyLog);
    const k = todayKey();
    if (!data.dailyLog[k]) data.dailyLog[k] = { subjects: {} };
    data.dailyLog[k].subjects[subject] = { score, total, timeMs: timeMs || 0, at: Date.now() };
    save(data);
  }

  // ===== Thời gian làm bài (đo tốc độ; mốc so sánh là chính học sinh) =====
  function recordTime(questions, timeMs) {
    if (!questions || !timeMs) return;
    const data = load();
    data.speed = data.speed || { questions: 0, timeMs: 0 };
    data.speed.questions += questions;
    data.speed.timeMs += timeMs;
    save(data);
  }
  function getAvgSecPerQ() {
    const s = load().speed || { questions: 0, timeMs: 0 };
    return s.questions ? (s.timeMs / 1000 / s.questions) : null;
  }
  function getDailyLog() {
    const data = load();
    const pruned = pruneDaily(data.dailyLog);
    if (Object.keys(pruned).length !== Object.keys(data.dailyLog || {}).length) {
      data.dailyLog = pruned; save(data);
    }
    return pruned;
  }
  function getTodayDaily() { return getDailyLog()[todayKey()] || { subjects: {} }; }
  // Ghi nhận MỘT NGÀY có học (mọi đề, không chỉ đề hôm nay) — phục vụ tính streak
  function markStudyDay() {
    const data = load();
    const k = todayKey();
    const before = !!data.studyDays[k];
    data.studyDays[k] = true;
    // Prune: giữ tối đa 90 ngày để streak vẫn chính xác kể cả không làm vài tuần
    const cutoff = new Date(); cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffKey = dateKey(cutoff);
    for (const day of Object.keys(data.studyDays)) {
      if (day < cutoffKey) delete data.studyDays[day];
    }
    save(data);
    return !before; // true = ngày học MỚI hôm nay
  }
  function getStreak() {
    const data = load();
    const study = data.studyDays || {};
    const log = getDailyLog();
    // Fallback: nếu chưa có studyDays (legacy data) dùng dailyLog như cũ
    const has = k => study[k] || (log[k] && Object.keys(log[k].subjects || {}).length > 0);
    const d = new Date(); d.setHours(0, 0, 0, 0);
    if (!has(todayKey())) d.setDate(d.getDate() - 1); // hôm nay chưa làm → đếm từ hôm qua
    let streak = 0;
    while (has(dateKey(d))) { streak++; d.setDate(d.getDate() - 1); }
    return streak;
  }
  function getSubjectStats() {
    const log = recentLog(); const acc = {};
    for (const day of Object.values(log)) {
      for (const [s, r] of Object.entries(day.subjects || {})) {
        if (!acc[s]) acc[s] = { score: 0, total: 0, days: 0, timeMs: 0 };
        acc[s].score += r.score; acc[s].total += r.total; acc[s].days++; acc[s].timeMs += (r.timeMs || 0);
      }
    }
    return acc;
  }
  function last28Days() {
    const arr = [];
    const d = new Date(); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (ANALYSIS_DAYS - 1));
    for (let i = 0; i < ANALYSIS_DAYS; i++) {
      arr.push(dateKey(d));
      d.setDate(d.getDate() + 1);
    }
    return arr;
  }
  // Số ngày có học trong 28 ngày gần nhất
  function getActiveDays() {
    return Object.values(recentLog()).filter(d => Object.keys(d.subjects || {}).length).length;
  }
  // Lịch tháng hiện tại (lưới Thứ 2 → Chủ nhật)
  function getMonthInfo() {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const year = now.getFullYear(), month = now.getMonth();
    const tKey = dateKey(now);
    const first = new Date(year, month, 1);
    const leading = (first.getDay() + 6) % 7; // số ô trống trước ngày 1 (tuần bắt đầu Thứ 2)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(new Date(year, month, d));
      days.push({ key, dom: d, isToday: key === tKey, isFuture: key > tKey });
    }
    return { label: `Tháng ${month + 1}/${year}`, leading, days };
  }

  function save(data) {
    localStorage.setItem(activeKey, JSON.stringify(data));
    if (afterSave) { try { afterSave(data); } catch {} }
  }

  // Sổ ghi sao theo ngày: số sao kiếm được mỗi ngày (mọi bài tính điểm).
  // Dùng cho bảng xếp hạng "sao tuần này" chính xác. Giữ ~35 ngày gần nhất.
  const STARLOG_DAYS = 35;
  function pruneStarLog(log) {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (STARLOG_DAYS - 1));
    const cutoff = dateKey(d);
    const out = {};
    for (const k of Object.keys(log || {})) if (k >= cutoff) out[k] = log[k];
    return out;
  }

  function addStars(n) {
    const data = load();
    data.stars += n;
    data.starLog = pruneStarLog(data.starLog || {});
    if (n) { const k = todayKey(); data.starLog[k] = (data.starLog[k] || 0) + n; }
    save(data);
    return data.stars;
  }

  function markCompleted(exerciseId, score, total) {
    const data = load();
    const prev = data.completed[exerciseId];
    const wasFirst = !prev;
    const isNewBest = wasFirst || score > prev.score;
    const isPerfect = total > 0 && score === total;
    const prevPerfect = prev && prev.bestScore === prev.total;
    const isFirstPerfect = isPerfect && !prevPerfect; // 100% lần đầu của đề này
    data.completed[exerciseId] = {
      score,
      total,
      lastDoneAt: Date.now(),
      bestScore: isNewBest ? score : prev.bestScore,
    };
    data.history.unshift({ exerciseId, score, total, at: Date.now() });
    data.history = data.history.slice(0, 50);
    if (!data.studyDays) data.studyDays = {};
    data.studyDays[todayKey()] = true;
    save(data);
    return { isNewBest, wasFirst, isFirstPerfect };
  }

  function getCompletion(exerciseId) {
    return load().completed[exerciseId];
  }

  function getStars() {
    return load().stars;
  }

  function getAvatar() {
    return load().avatar;
  }

  function setAvatar(emoji) {
    const data = load();
    data.avatar = emoji;
    save(data);
  }

  // Thống kê dùng để tính huy hiệu
  function getStats() {
    const data = load();
    const completedList = Object.values(data.completed);
    return {
      stars: data.stars,
      completedCount: completedList.length,
      perfectCount: completedList.filter(c => c.bestScore === c.total).length,
      totalAttempts: data.history.length,
    };
  }

  // ===== Cài đặt cá nhân (lưu trong cùng kho progress) =====
  function getSetting(key) {
    const data = load();
    return (data.settings || {})[key];
  }
  function setSetting(key, value) {
    const data = load();
    if (!data.settings) data.settings = {};
    if (value == null || value === '') delete data.settings[key];
    else data.settings[key] = value;
    save(data);
  }
  // Ngày thi (YYYY-MM-DD). Trả null nếu chưa đặt hoặc đã qua.
  function getExamDate() {
    const v = getSetting('examDate');
    if (!v) return null;
    return v;
  }
  function setExamDate(dateStr) { setSetting('examDate', dateStr || ''); }
  function daysUntilExam() {
    const v = getExamDate(); if (!v) return null;
    const exam = new Date(v + 'T00:00:00'); if (isNaN(exam)) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((exam - today) / 86400000);
    return diff; // có thể âm nếu đã qua
  }

  // ===== Hàng đợi câu sai (UX 4B.1) =====
  // wrongQueue: { "exId|qIdx" → { exId, qIdx, addedAt, lastWrong, wrongCount } }
  // - recordWrong: cộng dồn lần sai + cập nhật lastWrong
  // - clearWrong: gỡ khi câu đã làm đúng
  // - getWrongQueue: trả mảng phẳng, đã prune câu cũ quá 60 ngày
  function recordWrong(exId, qIdx) {
    if (!exId || typeof qIdx !== 'number') return;
    const data = load();
    if (!data.wrongQueue) data.wrongQueue = {};
    const k = exId + '|' + qIdx;
    const cur = data.wrongQueue[k];
    const today = todayKey();
    data.wrongQueue[k] = {
      exId, qIdx,
      addedAt: cur ? cur.addedAt : today,
      lastWrong: today,
      wrongCount: (cur ? cur.wrongCount : 0) + 1,
    };
    save(data);
  }
  function clearWrong(exId, qIdx) {
    if (!exId || typeof qIdx !== 'number') return;
    const data = load();
    if (!data.wrongQueue) return;
    const k = exId + '|' + qIdx;
    if (data.wrongQueue[k]) { delete data.wrongQueue[k]; save(data); }
  }
  function getWrongQueue() {
    const data = load();
    const q = data.wrongQueue || {};
    const cutoff = new Date(); cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 60);
    const cutoffKey = dateKey(cutoff);
    return Object.values(q).filter(it => (it.lastWrong || it.addedAt) >= cutoffKey);
  }

  // ===== Sticker collection (UX 4A.5) =====
  // Catalog cố định — earn ngẫu nhiên từ tier phù hợp. Lưu dạng map key→ngày YYYY-MM-DD.
  const STICKERS = [
    // Common (thưởng lần đầu hoàn thành đề)
    { key: 'star',      emoji: '🌟', name: 'Ngôi sao',    tier: 'common', hint: 'Hoàn thành đề mới lần đầu' },
    { key: 'balloon',   emoji: '🎈', name: 'Bóng bay',     tier: 'common', hint: 'Hoàn thành đề mới lần đầu' },
    { key: 'cake',      emoji: '🍰', name: 'Bánh ngọt',    tier: 'common', hint: 'Hoàn thành đề mới lần đầu' },
    { key: 'butterfly', emoji: '🦋', name: 'Cánh bướm',    tier: 'common', hint: 'Hoàn thành đề mới lần đầu' },
    { key: 'rainbow',   emoji: '🌈', name: 'Cầu vồng',     tier: 'common', hint: 'Hoàn thành đề mới lần đầu' },
    // Rare (thưởng 100% lần đầu của đề)
    { key: 'rocket',    emoji: '🚀', name: 'Tên lửa',      tier: 'rare',   hint: 'Đạt 100% một đề lần đầu' },
    { key: 'diamond',   emoji: '💎', name: 'Kim cương',    tier: 'rare',   hint: 'Đạt 100% một đề lần đầu' },
    { key: 'crown',     emoji: '👑', name: 'Vương miện',   tier: 'rare',   hint: 'Đạt 100% một đề lần đầu' },
    { key: 'trophy',    emoji: '🏆', name: 'Cúp vàng',     tier: 'rare',   hint: 'Đạt 100% một đề lần đầu' },
    { key: 'unicorn',   emoji: '🦄', name: 'Kỳ lân',       tier: 'rare',   hint: 'Đạt 100% một đề lần đầu' },
    // Legendary (cột mốc streak — gắn cụ thể với mốc)
    { key: 'fire7',     emoji: '🔥', name: 'Lửa nhỏ',      tier: 'legendary', milestone: 7,   hint: 'Streak 7 ngày liên tiếp' },
    { key: 'dragon14',  emoji: '🐉', name: 'Rồng',         tier: 'legendary', milestone: 14,  hint: 'Streak 14 ngày liên tiếp' },
    { key: 'galaxy30',  emoji: '🌌', name: 'Dải ngân hà',  tier: 'legendary', milestone: 30,  hint: 'Streak 30 ngày liên tiếp' },
    { key: 'eagle100',  emoji: '🦅', name: 'Đại bàng',     tier: 'legendary', milestone: 100, hint: 'Streak 100 ngày liên tiếp' },
  ];
  function getStickerCatalog() { return STICKERS.slice(); }
  function getStickers() { return (load().stickers) || {}; }
  function _saveSticker(key) {
    const data = load();
    if (!data.stickers) data.stickers = {};
    if (data.stickers[key]) return false; // đã có rồi
    data.stickers[key] = todayKey();
    save(data);
    return true;
  }
  // Pick ngẫu nhiên 1 sticker chưa có trong tier; null nếu hết.
  function _earnRandomInTier(tier) {
    const owned = getStickers();
    const pool = STICKERS.filter(s => s.tier === tier && !owned[s.key]);
    if (!pool.length) return null;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return _saveSticker(pick.key) ? pick : null;
  }
  function _earnSpecificMilestone(milestone) {
    const sticker = STICKERS.find(s => s.tier === 'legendary' && s.milestone === milestone);
    if (!sticker) return null;
    return _saveSticker(sticker.key) ? sticker : null;
  }
  // Gọi sau khi hoàn thành đề. Trả mảng sticker mới (có thể rỗng).
  function maybeEarnStickers({ wasFirst, isFirstPerfect, streakMilestone } = {}) {
    const earned = [];
    if (wasFirst) { const s = _earnRandomInTier('common'); if (s) earned.push(s); }
    if (isFirstPerfect) { const s = _earnRandomInTier('rare'); if (s) earned.push(s); }
    if (streakMilestone) { const s = _earnSpecificMilestone(streakMilestone); if (s) earned.push(s); }
    return earned;
  }

  function reset() {
    localStorage.removeItem(activeKey);
  }
  // Ghi đè toàn bộ tiến trình (dùng khi tải từ server về sau đăng nhập/đồng bộ)
  function replaceAll(data) {
    localStorage.setItem(activeKey, JSON.stringify(data || {}));
  }

  return {
    load, save, addStars, markCompleted, getCompletion, getStars, getAvatar, setAvatar, getStats, reset,
    recordDaily, getDailyLog, getTodayDaily, getStreak, markStudyDay, getSubjectStats, last28Days, todayKey,
    getSetting, setSetting, getExamDate, setExamDate, daysUntilExam,
    getStickerCatalog, getStickers, maybeEarnStickers,
    recordWrong, clearWrong, getWrongQueue,
    getActiveDays, getMonthInfo,
    recordTime, getAvgSecPerQ,
    setActiveKey, onSave, replaceAll,
  };
})();
