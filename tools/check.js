// CỔNG KIỂM TRA tổng hợp — chạy trước khi commit / trong CI của Pull Request.
// Gộp: validate cấu trúc + trùng ID + trùng câu hỏi + verify đáp án Toán + kiểm index/coverage có mới không.
// Thoát mã != 0 nếu có LỖI CHẶN. Cảnh báo (trùng câu, cần review) không chặn.
// Chạy: node tools/check.js
const fs = require('fs');
const path = require('path');
const { loadAll, buildArtifacts, verifyAll } = require('./lib/validate');

const EX_DIR = path.resolve(__dirname, '..', 'exercises');
const INDEX_OUT = path.join(EX_DIR, 'index.json');
const COVERAGE_OUT = path.join(EX_DIR, 'coverage.json');

const errors = [];   // chặn
const warnings = []; // không chặn, để người duyệt xem

const { ok, fileErrors } = loadAll(EX_DIR);
const { index, coverage, dupIds, dupQuestions } = buildArtifacts(ok);
const { wrong, skipped, okCount } = verifyAll(ok);

// 1) Lỗi cấu trúc file
fileErrors.forEach(f => errors.push(`File lỗi: ${f.file} → ${f.errors.join('; ')}`));

// 2) Trùng ID
dupIds.forEach(d => errors.push(`ID trùng "${d.id}": ${d.files.join(', ')}`));

// 3) Đáp án Toán sai
wrong.forEach(w => errors.push(`Đáp án sai: ${w.id} câu ${w.q} → ${w.detail}`));

// 4) Trùng câu hỏi → cảnh báo
dupQuestions.forEach(d =>
  warnings.push(`Câu trùng (${d.count}×): "${d.locations[0].preview}" — ${d.locations.map(l => `${l.id}#${l.qIndex}`).join(', ')}`)
);

// 4b) Số câu mỗi đề: tiểu học 15-20, mầm non 5-10 → cảnh báo
ok.forEach(({ data }) => {
  const n = data.questions.length;
  const isPreschool = (data.stage || 'tieu-hoc') === 'mam-non';
  const [min, max] = isPreschool ? [5, 10] : [15, 20];
  if (n < min || n > max) {
    warnings.push(`Số câu ngoài khoảng ${min}-${max} (${isPreschool ? 'mầm non' : 'tiểu học'}): ${data.id} có ${n} câu`);
  }
});

// 5) Câu Toán không tự kiểm được → cảnh báo cần liếc qua
skipped.filter(s => s.subject === 'toan').forEach(s =>
  warnings.push(`Cần người liếc: ${s.id} câu ${s.q} (Toán không tự verify được)`)
);

// 6) index.json / coverage.json có còn mới không (so phần nội dung, bỏ timestamp)
function staleCheck(file, expected) {
  let disk;
  try {
    disk = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    errors.push(`Thiếu/lỗi ${path.basename(file)} — chạy: node tools/build-index.js`);
    return;
  }
  const { generatedAt, ...diskRest } = disk;
  if (JSON.stringify(diskRest) !== JSON.stringify(expected)) {
    errors.push(`${path.basename(file)} đã cũ — chạy: node tools/build-index.js rồi commit lại`);
  }
}
staleCheck(INDEX_OUT, index);
staleCheck(COVERAGE_OUT, coverage);

// ===== Báo cáo =====
console.log(`\n===== KẾT QUẢ KIỂM TRA =====`);
console.log(`Số bài hợp lệ: ${ok.length} | Đáp án Toán đúng: ${okCount} | Bỏ qua: ${skipped.length}`);

if (warnings.length) {
  console.log(`\n⚠️  ${warnings.length} CẢNH BÁO (không chặn, người duyệt xem khi review PR):`);
  warnings.forEach(w => console.log(`   • ${w}`));
}

if (errors.length) {
  console.log(`\n❌ ${errors.length} LỖI CHẶN (phải sửa trước khi đăng):`);
  errors.forEach(e => console.log(`   • ${e}`));
  console.log(`\n=> KHÔNG ĐẠT. Hãy sửa các lỗi trên.`);
  process.exit(1);
} else {
  console.log(`\n✅ ĐẠT — không có lỗi chặn. Có thể tạo Pull Request / deploy.`);
}
