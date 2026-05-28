// Quản lý tiến độ học sinh — lưu vào localStorage
const Progress = (() => {
  const KEY = 'be-hoc-vui-progress-v1';

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      return Object.assign({ stars: 0, completed: {}, history: [], avatar: null }, d || {});
    } catch {
      return { stars: 0, completed: {}, history: [], avatar: null };
    }
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

  return { load, save, addStars, markCompleted, getCompletion, getStars, getAvatar, setAvatar, getStats, reset };
})();
