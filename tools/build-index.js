// Sinh file exercises/index.json từ tất cả file JSON trong exercises/
// Chạy: node tools/build-index.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EX_DIR = path.join(ROOT, 'exercises');
const OUT = path.join(EX_DIR, 'index.json');

const VALID_SUBJECTS = ['toan', 'tieng-viet', 'tieng-anh'];

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'index.json') {
      results.push(full);
    }
  }
  return results;
}

const files = walk(EX_DIR);
const exercises = [];
const errors = [];
const seenIds = new Set();

for (const file of files) {
  const rel = path.relative(EX_DIR, file).split(path.sep).join('/');
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    // Validate cơ bản
    if (!data.id) throw new Error('thiếu field "id"');
    if (!VALID_SUBJECTS.includes(data.subject)) throw new Error('subject không hợp lệ: ' + data.subject);
    if (![1,2,3,4,5].includes(data.grade)) throw new Error('grade phải 1-5');
    if (!data.topic) throw new Error('thiếu field "topic"');
    if (!Array.isArray(data.questions) || data.questions.length === 0) throw new Error('không có câu hỏi');
    if (seenIds.has(data.id)) throw new Error('id trùng: ' + data.id);
    seenIds.add(data.id);

    // Validate từng câu hỏi
    data.questions.forEach((q, i) => {
      if (!q.type) throw new Error(`câu ${i+1} thiếu type`);
      if (q.type === 'multiple-choice') {
        if (!Array.isArray(q.options)) throw new Error(`câu ${i+1} thiếu options`);
        if (typeof q.answer !== 'number') throw new Error(`câu ${i+1} answer phải là số`);
        if (q.answer < 0 || q.answer >= q.options.length) throw new Error(`câu ${i+1} answer ngoài phạm vi`);
      } else if (q.type === 'fill-blank') {
        if (q.answer === undefined || q.answer === null) throw new Error(`câu ${i+1} thiếu answer`);
      } else if (q.type === 'matching') {
        if (!Array.isArray(q.pairs) || q.pairs.length < 2) throw new Error(`câu ${i+1} cần ít nhất 2 pairs`);
      } else {
        throw new Error(`câu ${i+1} type không hỗ trợ: ${q.type}`);
      }
    });

    exercises.push({
      id: data.id,
      subject: data.subject,
      grade: data.grade,
      topic: data.topic,
      difficulty: data.difficulty || 1,
      questionCount: data.questions.length,
      path: rel,
    });
  } catch (e) {
    errors.push({ file: rel, error: e.message });
  }
}

// Sắp xếp: theo môn, lớp, topic
exercises.sort((a, b) => {
  if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
  if (a.grade !== b.grade) return a.grade - b.grade;
  return a.topic.localeCompare(b.topic, 'vi');
});

const output = {
  generatedAt: new Date().toISOString(),
  exercises,
};
fs.writeFileSync(OUT, JSON.stringify(output, null, 2), 'utf8');

console.log(`✅ Đã sinh ${OUT}`);
console.log(`   Tổng số bài: ${exercises.length}`);
if (errors.length) {
  console.log(`\n⚠️  ${errors.length} file bị lỗi (đã bỏ qua):`);
  errors.forEach(e => console.log(`   - ${e.file}: ${e.error}`));
  process.exitCode = 1;
}
