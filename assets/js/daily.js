// "Đề hôm nay": mỗi ngày bốc ra một bộ đề (mỗi môn cốt lõi) từ ngân hàng câu hỏi.
// Cố định theo ngày (seed = ngày + lớp + môn) nên tải lại không đổi; hôm sau ra bộ khác.
// Hỗ trợ Tiểu học (bank tự soạn lop1/2) + THCS/THPT (bank do build-index gom từ đề luyện tập).
// Lớp/môn nào có bank được khai trong /banks/manifest.json.
const Daily = (() => {
  const GRADE_KEY = 'be-hoc-vui-daily-grade';
  const TIEU_HOC_GRADES = [1, 2]; // tiểu học hiện có bank tự soạn
  const DEFAULT_GRADE = 2;
  // 3 môn cốt lõi cho "đề hôm nay" theo cấp
  const CORE_TIEU = ['toan', 'tieng-viet', 'tieng-anh'];
  const CORE_THCS_THPT = ['toan', 'ngu-van', 'tieng-anh'];
  const SUBJECT_META = {
    toan: { key: 'toan', name: 'Toán', icon: '🔢' },
    'tieng-viet': { key: 'tieng-viet', name: 'Tiếng Việt', icon: '📖' },
    'ngu-van': { key: 'ngu-van', name: 'Ngữ văn', icon: '📖' },
    'tieng-anh': { key: 'tieng-anh', name: 'Tiếng Anh', icon: '🌍' },
  };
  const QUESTIONS_PER = 15;
  const banks = {};      // khóa theo `${grade}-${subject}`
  let manifest = null;   // { `${grade}-${subject}`: số câu }

  function stageOf(g) { return g >= 10 ? 'thpt' : g >= 6 ? 'thcs' : 'tieu-hoc'; }
  function subjectsForGrade(g) {
    const keys = g >= 6 ? CORE_THCS_THPT : CORE_TIEU;
    return keys.map(k => SUBJECT_META[k]);
  }

  function getGrade() {
    const g = parseInt(localStorage.getItem(GRADE_KEY), 10);
    return TIEU_HOC_GRADES.includes(g) ? g : DEFAULT_GRADE;
  }
  function setGrade(g) {
    g = parseInt(g, 10);
    if (TIEU_HOC_GRADES.includes(g)) localStorage.setItem(GRADE_KEY, String(g));
  }

  // Manifest cho biết lớp-môn nào có "đề hôm nay". Nạp 1 lần, có cache.
  async function loadManifest() {
    if (manifest) return manifest;
    try { manifest = await (await fetch('/banks/manifest.json')).json(); }
    catch { manifest = {}; }
    return manifest;
  }
  // Lớp này có "đề hôm nay" không (cần manifest đã nạp; gọi loadManifest trước khi render).
  function hasGrade(g) {
    if (!manifest) return false;
    return subjectsForGrade(g).some(s => (manifest[`${g}-${s.key}`] || 0) > 0);
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
      const data = await (await fetch(`/banks/${stageOf(grade)}-lop${grade}-${subject}.json`)).json();
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

  // Trả về đối tượng đề cho id dạng 'daily-<lớp>-<môn>' (vd 'daily-7-toan').
  // Vẫn nhận id cũ 'daily-<môn>' (mặc định lớp 2) cho liên kết đã lưu.
  async function getExercise(id) {
    const rest = id.replace(/^daily-/, '');
    const m = rest.match(/^(\d+)-(.+)$/);
    let grade, subject;
    if (m) { grade = parseInt(m[1], 10); subject = m[2]; }
    else { grade = DEFAULT_GRADE; subject = rest; }
    const meta = SUBJECT_META[subject];
    if (!meta) return null;
    const pool = await loadBank(grade, subject);
    if (!pool.length) return null;
    return {
      id, daily: true, stage: stageOf(grade), subject, grade,
      topic: `Đề hôm nay · ${meta.name} · Lớp ${grade}`,
      questions: pickForToday(pool, grade, subject, QUESTIONS_PER),
    };
  }

  return { GRADES: TIEU_HOC_GRADES, getGrade, setGrade, getExercise, loadManifest, hasGrade, subjectsForGrade };
})();
