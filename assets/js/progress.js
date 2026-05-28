// Quản lý tiến độ học sinh — lưu vào localStorage
const Progress = (() => {
  const KEY = 'be-hoc-vui-progress-v1';

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || { stars: 0, completed: {}, history: [] };
    } catch {
      return { stars: 0, completed: {}, history: [] };
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

  function reset() {
    localStorage.removeItem(KEY);
  }

  return { load, save, addStars, markCompleted, getCompletion, getStars, reset };
})();
