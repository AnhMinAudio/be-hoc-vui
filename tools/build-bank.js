// Gộp ngân hàng câu hỏi cho tính năng "Đề hôm nay".
// Gom toàn bộ câu hỏi của các đề (tiểu học, lớp 2, theo môn) thành 1 kho mỗi môn, khử trùng.
// Chạy: node tools/build-bank.js
const fs = require('fs');
const path = require('path');
const { loadAll, questionFingerprint } = require('./lib/validate');

const ROOT = path.resolve(__dirname, '..');
const EX_DIR = path.join(ROOT, 'exercises');
const BANK_DIR = path.join(ROOT, 'banks');

// Cấu hình kho cần gộp: [stage, grade, [subjects]]
const TARGETS = [
  { stage: 'tieu-hoc', grade: 1, subjects: ['toan', 'tieng-viet', 'tieng-anh'] },
  { stage: 'tieu-hoc', grade: 2, subjects: ['toan', 'tieng-viet', 'tieng-anh'] },
];

if (!fs.existsSync(BANK_DIR)) fs.mkdirSync(BANK_DIR, { recursive: true });

const { ok } = loadAll(EX_DIR);
let totalWritten = 0;

for (const t of TARGETS) {
  for (const subject of t.subjects) {
    const seen = new Set();
    const questions = [];
    for (const { data } of ok) {
      if ((data.stage || 'tieu-hoc') !== t.stage || data.grade !== t.grade || data.subject !== subject) continue;
      for (const q of data.questions) {
        const fp = questionFingerprint(q);
        if (seen.has(fp)) continue;
        seen.add(fp);
        questions.push(q);
      }
    }
    const out = path.join(BANK_DIR, `${t.stage}-lop${t.grade}-${subject}.json`);
    fs.writeFileSync(out, JSON.stringify({
      stage: t.stage, grade: t.grade, subject, count: questions.length, questions,
    }, null, 2), 'utf8');
    console.log(`✅ ${path.relative(ROOT, out)} — ${questions.length} câu`);
    totalWritten += questions.length;
  }
}
console.log(`Tổng: ${totalWritten} câu trong ngân hàng.`);
