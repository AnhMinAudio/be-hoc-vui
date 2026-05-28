// Thư viện kiểm tra dùng chung cho build-index / verify-answers / check
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VALID_SUBJECTS = ['toan', 'tieng-viet', 'tieng-anh'];
const VALID_GRADES = [1, 2, 3, 4, 5];
const PRESCHOOL_DOMAINS = ['mau-sac', 'con-vat', 'dem-so', 'hinh-khoi'];
const PRESCHOOL_AGES = [3, 4, 5];

// ===== Chuẩn hóa & fingerprint =====
// Giữ dấu tiếng Việt (vì có nghĩa), chỉ hạ chữ thường, gộp khoảng trắng, bỏ dấu câu cuối.
function normalizeText(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[?.!,;:]+$/g, '')
    .trim();
}

function hash(s) {
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
}

// Vân tay của một câu hỏi — dùng để phát hiện câu trùng (kể cả khác file)
function questionFingerprint(q) {
  if (q.type === 'multiple-choice' || q.type === 'image-choice') {
    const correct = Array.isArray(q.options) ? q.options[q.answer] : '';
    return hash(`${q.type}|${normalizeText(q.question)}|${normalizeText(correct)}`);
  }
  if (q.type === 'fill-blank') {
    return hash(`fb|${normalizeText(q.question)}|${normalizeText(q.answer)}`);
  }
  if (q.type === 'matching') {
    const pairs = (q.pairs || [])
      .map(p => `${normalizeText(p[0])}=>${normalizeText(p[1])}`)
      .sort()
      .join('||');
    return hash(`mt|${pairs}`);
  }
  return hash(JSON.stringify(q));
}

// ===== Validate cấu trúc =====
function validateExercise(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['file không phải object JSON'];
  if (!data.id) errors.push('thiếu "id"');
  const stage = data.stage || 'tieu-hoc';
  if (stage === 'mam-non') {
    if (!PRESCHOOL_DOMAINS.includes(data.subject)) errors.push(`mầm non: lĩnh vực (subject) không hợp lệ: ${data.subject}`);
    if (!PRESCHOOL_AGES.includes(data.grade)) errors.push('mầm non: grade (tuổi) phải là 3, 4 hoặc 5');
  } else if (stage === 'tieu-hoc') {
    if (!VALID_SUBJECTS.includes(data.subject)) errors.push(`subject không hợp lệ: ${data.subject}`);
    if (!VALID_GRADES.includes(data.grade)) errors.push('grade phải là 1-5');
  } else {
    errors.push(`stage không hợp lệ: ${stage}`);
  }
  if (!data.topic) errors.push('thiếu "topic"');
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    errors.push('không có câu hỏi');
  } else {
    data.questions.forEach((q, i) => {
      const n = i + 1;
      if (!q || !q.type) { errors.push(`câu ${n}: thiếu type`); return; }
      if (q.type === 'multiple-choice' || q.type === 'image-choice') {
        if (!Array.isArray(q.options) || q.options.length < 2) errors.push(`câu ${n}: cần >= 2 options`);
        else if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.options.length)
          errors.push(`câu ${n}: answer phải là chỉ số hợp lệ trong options`);
      } else if (q.type === 'fill-blank') {
        if (q.answer === undefined || q.answer === null || String(q.answer).trim() === '')
          errors.push(`câu ${n}: thiếu answer`);
      } else if (q.type === 'matching') {
        if (!Array.isArray(q.pairs) || q.pairs.length < 2) errors.push(`câu ${n}: cần >= 2 pairs`);
        else if (q.pairs.some(p => !Array.isArray(p) || p.length !== 2))
          errors.push(`câu ${n}: mỗi pair phải là [trái, phải]`);
      } else {
        errors.push(`câu ${n}: type không hỗ trợ: ${q.type}`);
      }
    });
  }
  return errors;
}

// ===== Đánh giá biểu thức số học an toàn (không dùng eval) =====
// Hỗ trợ + - * / và ngoặc. Trả về số, hoặc null nếu không phải biểu thức số học thuần.
function safeArithmetic(expr) {
  const s = String(expr)
    .replace(/×/g, '*')
    .replace(/[÷:]/g, '/')
    .replace(/\bx\b/gi, '*');
  if (!/^[\d\s+\-*/().]+$/.test(s)) return null;
  const tokens = s.match(/\d+(?:\.\d+)?|[+\-*/()]/g);
  if (!tokens) return null;
  const out = [], ops = [];
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2 };
  for (const t of tokens) {
    if (/^\d/.test(t)) out.push(parseFloat(t));
    else if (t === '(') ops.push(t);
    else if (t === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') out.push(ops.pop());
      if (ops.pop() !== '(') return null;
    } else {
      while (ops.length && prec[ops[ops.length - 1]] >= prec[t]) out.push(ops.pop());
      ops.push(t);
    }
  }
  while (ops.length) { const op = ops.pop(); if (op === '(') return null; out.push(op); }
  const st = [];
  for (const t of out) {
    if (typeof t === 'number') { st.push(t); continue; }
    const b = st.pop(), a = st.pop();
    if (a === undefined || b === undefined) return null;
    if (t === '/' && b === 0) return null;
    st.push(t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : a / b);
  }
  return st.length === 1 ? st[0] : null;
}

// Verify một câu hỏi Toán: thay đáp án vào rồi kiểm tra phương trình có đúng không.
// status: 'ok' | 'wrong' | 'skip'  (skip = không tự kiểm được, cần người xem)
function verifyMathQuestion(q) {
  let filled;
  if (q.type === 'multiple-choice') {
    if (!Array.isArray(q.options)) return { status: 'skip', detail: 'không có options' };
    filled = String(q.question).replace(/\?/g, ` ${q.options[q.answer]} `);
  } else if (q.type === 'fill-blank') {
    filled = String(q.question).replace(/_{2,}|\.{3,}/g, ` ${q.answer} `);
  } else {
    return { status: 'skip', detail: 'matching: không verify số học' };
  }
  if (!filled.includes('=')) return { status: 'skip', detail: 'không có dấu =' };
  const parts = filled.split('=');
  if (parts.length !== 2) return { status: 'skip', detail: 'nhiều hơn 1 dấu =' };
  const a = safeArithmetic(parts[0]);
  const b = safeArithmetic(parts[1]);
  if (a === null || b === null) return { status: 'skip', detail: 'không phải phép tính số học thuần' };
  const ok = Math.abs(a - b) < 1e-9;
  return { status: ok ? 'ok' : 'wrong', detail: `${parts[0].trim()} = ${parts[1].trim()}  (${a} vs ${b})` };
}

// ===== Đọc toàn bộ file đề =====
function walkJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkJsonFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'index.json' && entry.name !== 'coverage.json') {
      results.push(full);
    }
  }
  return results;
}

// Đọc + validate tất cả. Trả { ok: [{rel, data}], fileErrors: [{file, errors}] }
function loadAll(exDir) {
  const files = walkJsonFiles(exDir);
  const ok = [], fileErrors = [];
  for (const abs of files) {
    const rel = path.relative(exDir, abs).split(path.sep).join('/');
    let data;
    try {
      data = JSON.parse(fs.readFileSync(abs, 'utf8'));
    } catch (e) {
      fileErrors.push({ file: rel, errors: ['JSON lỗi cú pháp: ' + e.message] });
      continue;
    }
    const errs = validateExercise(data);
    if (errs.length) fileErrors.push({ file: rel, errors: errs });
    else ok.push({ rel, data });
  }
  return { ok, fileErrors };
}

// ===== Tạo artifacts: index, coverage, phát hiện trùng =====
function buildArtifacts(okList) {
  const exercises = [];
  const idMap = new Map();          // id -> [rel...]
  const fingerprints = new Map();   // fp -> [{id, qIndex, preview}]
  const dupIds = [];

  for (const { rel, data } of okList) {
    if (idMap.has(data.id)) {
      idMap.get(data.id).push(rel);
      dupIds.push({ id: data.id, files: idMap.get(data.id).slice() });
    } else {
      idMap.set(data.id, [rel]);
    }

    data.questions.forEach((q, qIndex) => {
      const fp = questionFingerprint(q);
      const preview = (q.question || (q.pairs ? q.pairs.map(p => p.join('-')).join(', ') : '')).slice(0, 60);
      if (!fingerprints.has(fp)) fingerprints.set(fp, []);
      fingerprints.get(fp).push({ id: data.id, qIndex: qIndex + 1, preview });
    });

    exercises.push({
      id: data.id,
      stage: data.stage || 'tieu-hoc',
      subject: data.subject,
      grade: data.grade,
      topic: data.topic,
      difficulty: data.difficulty || 1,
      questionCount: data.questions.length,
      path: rel,
    });
  }

  exercises.sort((a, b) => {
    if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
    if (a.grade !== b.grade) return a.grade - b.grade;
    return a.topic.localeCompare(b.topic, 'vi');
  });

  // Nhóm câu trùng (cùng fingerprint xuất hiện > 1 lần)
  const dupQuestions = [];
  for (const [fp, locs] of fingerprints) {
    if (locs.length > 1) dupQuestions.push({ fingerprint: fp, count: locs.length, locations: locs });
  }

  // Coverage map — Tiểu học
  const coverage = {};
  const gaps = [];
  for (const subject of VALID_SUBJECTS) {
    coverage[subject] = {};
    for (const grade of VALID_GRADES) {
      const list = exercises.filter(e => (e.stage || 'tieu-hoc') === 'tieu-hoc' && e.subject === subject && e.grade === grade);
      coverage[subject][grade] = {
        exerciseCount: list.length,
        totalQuestions: list.reduce((s, e) => s + e.questionCount, 0),
        topics: list.map(e => ({ id: e.id, topic: e.topic, questionCount: e.questionCount, difficulty: e.difficulty })),
      };
      if (list.length === 0) gaps.push(`${subject} lớp ${grade}`);
    }
  }

  // Coverage map — Mầm non
  const preschool = {};
  for (const domain of PRESCHOOL_DOMAINS) {
    preschool[domain] = {};
    for (const age of PRESCHOOL_AGES) {
      const list = exercises.filter(e => e.stage === 'mam-non' && e.subject === domain && e.grade === age);
      preschool[domain][age] = {
        exerciseCount: list.length,
        totalQuestions: list.reduce((s, e) => s + e.questionCount, 0),
        topics: list.map(e => ({ id: e.id, topic: e.topic, questionCount: e.questionCount })),
      };
      if (list.length === 0) gaps.push(`mầm non ${domain} ${age} tuổi`);
    }
  }

  return {
    index: { exercises },
    coverage: { coverage, preschool, gaps },
    dupIds,
    dupQuestions,
  };
}

// ===== Verify đáp án toàn bộ =====
function verifyAll(okList) {
  const wrong = [], skipped = [];
  let okCount = 0;
  for (const { data } of okList) {
    data.questions.forEach((q, i) => {
      const r = verifyMathQuestion(q);
      if (r.status === 'ok') okCount++;
      else if (r.status === 'wrong') wrong.push({ id: data.id, q: i + 1, detail: r.detail, subject: data.subject });
      else skipped.push({ id: data.id, q: i + 1, subject: data.subject });
    });
  }
  return { wrong, skipped, okCount };
}

module.exports = {
  VALID_SUBJECTS, VALID_GRADES, PRESCHOOL_DOMAINS, PRESCHOOL_AGES,
  normalizeText, questionFingerprint, validateExercise,
  safeArithmetic, verifyMathQuestion,
  walkJsonFiles, loadAll, buildArtifacts, verifyAll,
};
