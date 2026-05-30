#!/usr/bin/env node
// Auto-tag 2 field mới cho mọi đề (UX 4E):
// - examType: practice | midterm1 | final1 | midterm2 | final2 | mock
// - bookUnit: { chapter: N } (lesson để null — manual sau)
// Heuristic dựa trên `chapter` text + `timeLimit`. In ra danh sách thay đổi để user review.
const fs = require('fs');
const path = require('path');

const EX_DIR = path.join(__dirname, '..', 'exercises');

function classify(ex) {
  const chRaw = (ex.chapter || '').toLowerCase();
  // Đề thi thử (timeLimit) — luôn là mock dù chapter là gì
  // Ưu tiên check ôn tập kỳ TRƯỚC để các đề "thi thử cuối kỳ" được tag final2 nếu phù hợp,
  // còn các đề "thi thử THPT QG / ĐGNL" thì sẽ rơi vào mock.
  const ky2 = /k[ỳìy]\s*2|hk2|hk_2|hoc-?ky-?2/.test(chRaw);
  const ky1 = /k[ỳìy]\s*1|hk1|hk_1|hoc-?ky-?1/.test(chRaw);
  const cuoi = /cu[ốoô]i|final|cuoi-ky/.test(chRaw);
  const giua = /gi[ữu]a|mid|giua-ky/.test(chRaw);
  const isOnTap = /[ôo]n\s*t[ậa]p|on-tap/.test(chRaw);
  const isThiThu = /thi\s*th[ửu]|thi-thu|thpt\s*q|đ[gh]nl|dgnl/.test(chRaw);

  let examType;
  if (isOnTap && cuoi && ky2) examType = 'final2';
  else if (isOnTap && cuoi && ky1) examType = 'final1';
  else if (isOnTap && giua && ky2) examType = 'midterm2';
  else if (isOnTap && giua && ky1) examType = 'midterm1';
  else if (isThiThu || ex.timeLimit) examType = 'mock';
  else examType = 'practice';

  // bookUnit.chapter — extract số sau "chương"
  let bookUnit = null;
  const m = chRaw.match(/ch[ưu]?[ơo]?ng\s*(\d+)/);
  if (m) bookUnit = { chapter: parseInt(m[1], 10) };

  return { examType, bookUnit };
}

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.json') && !['index.json', 'coverage.json'].includes(name)) out.push(full);
  }
  return out;
}

const files = walk(EX_DIR);
let updated = 0, unchanged = 0;
const counts = {};
for (const f of files) {
  const ex = JSON.parse(fs.readFileSync(f, 'utf8'));
  const next = classify(ex);
  let changed = false;
  if (ex.examType !== next.examType) { ex.examType = next.examType; changed = true; }
  const cur = JSON.stringify(ex.bookUnit || null);
  const newBu = JSON.stringify(next.bookUnit || null);
  if (cur !== newBu) { ex.bookUnit = next.bookUnit; changed = true; }
  if (changed) {
    fs.writeFileSync(f, JSON.stringify(ex, null, 2) + '\n');
    updated++;
  } else unchanged++;
  counts[next.examType] = (counts[next.examType] || 0) + 1;
}

console.log(`\n✅ Migration xong: ${updated} đề cập nhật, ${unchanged} không đổi.\n`);
console.log('Phân loại examType:');
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(10)} ${v} đề`);
}
console.log('\nMáy chỉ extract bookUnit.chapter từ text "Chương N". `bookUnit.lesson` cần gắn tay nếu muốn bám đúng SGK.');
