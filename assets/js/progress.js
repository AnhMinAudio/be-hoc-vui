// Quản lý tiến độ học sinh — lưu vào localStorage
const Progress = (() => {
  const KEY = 'be-hoc-vui-progress-v1';

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      return Object.assign({ stars: 0, completed: {}, history: [], avatar: null, dailyLog: {}, speed: { questions: 0, timeMs: 0 } }, d || {});
    } catch {
      return { stars: 0, completed: {}, history: [], avatar: null, dailyLog: {}, speed: { questions: 0, timeMs: 0 } };
    }
  }

  // ===== Nhật ký làm đề hàng ngày (giữ 28 ngày gần nhất) =====
  const RETENTION_DAYS = 28;
  function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function todayKey() { return dateKey(new Date()); }
  function pruneDaily(log) {
    const cutoff = new Date(); cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (RETENTION_DAYS - 1));
    const cutoffKey = dateKey(cutoff);
    const out = {};
    for (const k of Object.keys(log || {})) if (k >= cutoffKey) out[k] = log[k];
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
  function getStreak() {
    const log = getDailyLog();
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const has = k => log[k] && Object.keys(log[k].subjects || {}).length > 0;
    if (!has(todayKey())) d.setDate(d.getDate() - 1); // hôm nay chưa làm → đếm từ hôm qua
    let streak = 0;
    while (has(dateKey(d))) { streak++; d.setDate(d.getDate() - 1); }
    return streak;
  }
  function getSubjectStats() {
    const log = getDailyLog(); const acc = {};
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
    d.setDate(d.getDate() - (RETENTION_DAYS - 1));
    for (let i = 0; i < RETENTION_DAYS; i++) {
      arr.push(dateKey(d));
      d.setDate(d.getDate() + 1);
    }
    return arr;
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function addStars(n) {
    const data = load();
    data.stars += n;
    save(data);
    return data.stars;
  }

  function markCompleted(exerciseId, score, total) {
    const data = load();
    const prev = data.completed[exerciseId];
    const isNewBest = !prev || score > prev.score;
    data.completed[exerciseId] = {
      score,
      total,
      lastDoneAt: Date.now(),
      bestScore: isNewBest ? score : prev.bestScore,
    };
    data.history.unshift({ exerciseId, score, total, at: Date.now() });
    data.history = data.history.slice(0, 50);
    save(data);
    return isNewBest;
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

  function reset() {
    localStorage.removeItem(KEY);
  }

  return {
    load, save, addStars, markCompleted, getCompletion, getStars, getAvatar, setAvatar, getStats, reset,
    recordDaily, getDailyLog, getTodayDaily, getStreak, getSubjectStats, last28Days, todayKey,
    recordTime, getAvgSecPerQ,
  };
})();
