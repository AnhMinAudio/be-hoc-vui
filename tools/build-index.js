// Sinh exercises/index.json + exercises/coverage.json từ tất cả file đề.
// Đồng thời cảnh báo câu hỏi trùng lặp.
// Chạy: node tools/build-index.js
const fs = require('fs');
const path = require('path');
const { loadAll, buildArtifacts } = require('./lib/validate');

const EX_DIR = path.resolve(__dirname, '..', 'exercises');
const INDEX_OUT = path.join(EX_DIR, 'index.json');
const COVERAGE_OUT = path.join(EX_DIR, 'coverage.json');

const { ok, fileErrors } = loadAll(EX_DIR);
const { index, coverage, dupIds, dupQuestions } = buildArtifacts(ok);

const now = new Date().toISOString();
fs.writeFileSync(INDEX_OUT, JSON.stringify({ generatedAt: now, ...index }, null, 2), 'utf8');
fs.writeFileSync(COVERAGE_OUT, JSON.stringify({ generatedAt: now, ...coverage }, null, 2), 'utf8');

console.log(`✅ Đã sinh index.json (${index.exercises.length} bài) và coverage.json`);

if (coverage.gaps.length) {
  console.log(`\n📍 Chỗ còn thiếu (${coverage.gaps.length}): ${coverage.gaps.join(' · ')}`);
}

if (fileErrors.length) {
  console.log(`\n❌ ${fileErrors.length} file LỖI (đã bỏ qua, không đưa vào index):`);
  fileErrors.forEach(f => {
    console.log(`   - ${f.file}`);
    f.errors.forEach(e => console.log(`       • ${e}`));
  });
}

if (dupIds.length) {
  console.log(`\n❌ ID trùng:`);
  dupIds.forEach(d => console.log(`   - "${d.id}" ở: ${d.files.join(', ')}`));
}

if (dupQuestions.length) {
  console.log(`\n⚠️  ${dupQuestions.length} câu hỏi bị TRÙNG (cân nhắc giữ lại hay bỏ):`);
  dupQuestions.forEach(d => {
    console.log(`   - "${d.locations[0].preview}..." xuất hiện ${d.count} lần:`);
    d.locations.forEach(l => console.log(`       • ${l.id} (câu ${l.qIndex})`));
  });
}

if (fileErrors.length || dupIds.length) process.exitCode = 1;
