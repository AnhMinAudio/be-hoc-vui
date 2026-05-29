// "Đề hôm nay": mỗi ngày bốc ra 3 đề (mỗi môn) từ ngân hàng câu hỏi.
// Cố định theo ngày (seed = ngày + lớp + môn) nên tải lại không đổi; hôm sau ra bộ khác.
// Hỗ trợ nhiều lớp (lớp 1, lớp 2); người dùng chọn lớp, lưu vào localStorage.
const Daily = (() => {
  const GRADES = [1, 2];
  const DEFAULT_GRADE = 2;
  const GRADE_KEY = 'be-hoc-vui-daily-grade';
  const SUBJECTS = [
    { key: 'toan', name: 'Toán', icon: '🔢' },
    { key: 'tieng-viet', name: 'Tiếng Việt', icon: '📖' },
    { key: 'tieng-anh', name: 'Tiếng Anh', icon: '🌍' },
  ];
  const QUESTIONS_PER = 15;
  const banks = {}; // khóa theo `${grade}-${subject}`

  function getGrade() {
    const g = parseInt(localStorage.getItem(GRADE_KEY), 10);
    return GRADES.includes(g) ? g : DEFAULT_GRADE;
  }
  function setGrade(g) {
    g = parseInt(g, 10);
    if (GRADES.includes(g)) localStorage.setItem(GRADE_KEY, String(g));
  }

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

  async function loadBank(grade, subject) {
    const k = `${grade}-${subject}`;
    if (banks[k]) return banks[k];
    try {
      const data = await (await fetch(`/banks/tieu-hoc-lop${grade}-${subject}.json`)).json();
      banks[k] = data.questions || [];
    } catch { banks[k] = []; }
    return banks[k];
  }

  // Bốc N câu cho hôm nay: xáo trộn theo seed của ngày rồi lấy N câu đầu
  function pickForToday(pool, grade, subject, n) {
    if (pool.length <= n) return pool.slice();
    const rng = mulberry32(hashStr(Progress.todayKey() + '|' + grade + '|' + subject));
    const idx = pool.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx.slice(0, n).map(i => pool[i]);
  }

  // Trả về đối tượng đề cho id dạng 'daily-<lớp>-<môn>' (vd 'daily-1-toan').
  // Vẫn nhận id cũ 'daily-<môn>' (mặc định lớp 2) cho liên kết đã lưu.
  async function getExercise(id) {
    const rest = id.replace(/^daily-/, '');
    const m = rest.match(/^(\d+)-(.+)$/);
    let grade, subject;
    if (m) { grade = parseInt(m[1], 10); subject = m[2]; }
    else { grade = DEFAULT_GRADE; subject = rest; }
    const meta = SUBJECTS.find(s => s.key === subject);
    if (!meta || !GRADES.includes(grade)) return null;
    const pool = await loadBank(grade, subject);
    if (!pool.length) return null;
    return {
      id, daily: true, stage: 'tieu-hoc', subject, grade,
      topic: `Đề hôm nay · ${meta.name} · Lớp ${grade}`,
      questions: pickForToday(pool, grade, subject, QUESTIONS_PER),
    };
  }

  return { SUBJECTS, GRADES, getGrade, setGrade, getExercise };
})();
