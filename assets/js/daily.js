// "Đề hôm nay": mỗi ngày bốc ra 3 đề (mỗi môn) từ ngân hàng câu hỏi.
// Cố định theo ngày (seed = ngày) nên tải lại không đổi; hôm sau ra bộ khác.
const Daily = (() => {
  const BANK_BASE = 'banks/tieu-hoc-lop2-';
  const SUBJECTS = [
    { key: 'toan', name: 'Toán', icon: '🔢' },
    { key: 'tieng-viet', name: 'Tiếng Việt', icon: '📖' },
    { key: 'tieng-anh', name: 'Tiếng Anh', icon: '🌍' },
  ];
  const QUESTIONS_PER = 15;
  const banks = {};

  // RNG có hạt giống (mulberry32) + hash chuỗi (FNV-1a)
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  async function loadBank(subject) {
    if (banks[subject]) return banks[subject];
    try {
      const data = await (await fetch(`${BANK_BASE}${subject}.json`)).json();
      banks[subject] = data.questions || [];
    } catch { banks[subject] = []; }
    return banks[subject];
  }

  // Bốc N câu cho hôm nay: xáo trộn theo seed của ngày rồi lấy N câu đầu
  function pickForToday(pool, subject, n) {
    if (pool.length <= n) return pool.slice();
    const rng = mulberry32(hashStr(Progress.todayKey() + '|' + subject));
    const idx = pool.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx.slice(0, n).map(i => pool[i]);
  }

  // Trả về đối tượng đề (giống đề thường) cho id dạng 'daily-<subject>'
  async function getExercise(id) {
    const subject = id.replace(/^daily-/, '');
    const meta = SUBJECTS.find(s => s.key === subject);
    if (!meta) return null;
    const pool = await loadBank(subject);
    if (!pool.length) return null;
    return {
      id, daily: true, stage: 'tieu-hoc', subject, grade: 2,
      topic: `Đề hôm nay · ${meta.name}`,
      questions: pickForToday(pool, subject, QUESTIONS_PER),
    };
  }

  return { SUBJECTS, getExercise };
})();
