// Kiểm tra đáp án các câu Toán bằng cách tính lại.
// Chạy: node tools/verify-answers.js
const path = require('path');
const { loadAll, verifyAll } = require('./lib/validate');

const EX_DIR = path.resolve(__dirname, '..', 'exercises');
const { ok, fileErrors } = loadAll(EX_DIR);
const { wrong, skipped, okCount } = verifyAll(ok);

console.log(`🔎 Kiểm tra đáp án: ${okCount} câu ĐÚNG (tự tính lại được), ${skipped.length} câu bỏ qua (không tự kiểm được), ${wrong.length} câu SAI`);

if (wrong.length) {
  console.log(`\n❌ Câu có đáp án SAI (phải sửa trước khi đăng):`);
  wrong.forEach(w => console.log(`   - ${w.id} (câu ${w.q}): ${w.detail}`));
}

// Câu Toán bỏ qua => đáng để người liếc lại (lời văn, so sánh...)
const toanSkipped = skipped.filter(s => s.subject === 'toan');
if (toanSkipped.length) {
  console.log(`\n👀 ${toanSkipped.length} câu Toán không tự kiểm được — nên người duyệt liếc qua:`);
  toanSkipped.forEach(s => console.log(`   - ${s.id} (câu ${s.q})`));
}

if (fileErrors.length) {
  console.log(`\n⚠️  ${fileErrors.length} file lỗi cấu trúc (chạy build-index.js để xem chi tiết).`);
}

if (wrong.length) process.exitCode = 1;
