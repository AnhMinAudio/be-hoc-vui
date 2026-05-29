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

// ===== Sinh sitemap.xml (URL thật cho SEO) — luôn đồng bộ với danh sách đề =====
const DOMAIN = 'https://behocvui.id.vn';
const SITEMAP_OUT = path.resolve(__dirname, '..', 'sitemap.xml');
const today = now.slice(0, 10);
const seoPaths = new Set(['/', '/gioi-thieu', '/faq', '/chinh-sach', '/cap/tieu-hoc', '/cap/thcs', '/cap/thpt', '/mam-non']);
for (const e of index.exercises) {
  const stage = e.stage || 'tieu-hoc';
  if (stage === 'mam-non') {
    seoPaths.add(`/mam-non/age${e.grade}`);
    seoPaths.add(`/mam-non/age${e.grade}/${e.subject}`);
  } else {
    seoPaths.add(`/lop${e.grade}`);
    seoPaths.add(`/lop${e.grade}/${e.subject}`);
  }
  seoPaths.add(`/bai/${e.id}`);
}
const urlsXml = [...seoPaths].sort().map(p => {
  const pr = p === '/' ? '1.0' : (p.startsWith('/bai/') ? '0.6' : '0.8');
  return `  <url>\n    <loc>${DOMAIN}${p}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${pr}</priority>\n  </url>`;
}).join('\n');
fs.writeFileSync(SITEMAP_OUT, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlsXml}\n</urlset>\n`, 'utf8');
console.log(`🗺️  Đã sinh sitemap.xml (${seoPaths.size} URL)`);

// ===== Sinh seo-meta.json (tiêu đề + mô tả RIÊNG cho từng trang) =====
// Worker chèn title/description/canonical theo bảng này; client cũng đọc để cập nhật khi chuyển trang.
const SEO_OUT = path.resolve(__dirname, '..', 'seo-meta.json');
const SUBJ = { toan: 'Toán', 'tieng-viet': 'Tiếng Việt', 'tieng-anh': 'Tiếng Anh', 'ngu-van': 'Ngữ văn', 'vat-li': 'Vật lí', 'hoa-hoc': 'Hóa học', 'sinh-hoc': 'Sinh học', 'lich-su': 'Lịch sử', 'dia-li': 'Địa lí', 'gdkt-pl': 'Giáo dục KT & Pháp luật' };
const MN_DOMAIN = { 'mau-sac': 'Màu sắc', 'con-vat': 'Con vật', 'dem-so': 'Đếm số', 'hinh-khoi': 'Hình khối', 'chu-cai': 'Chữ cái', 'cam-xuc': 'Cảm xúc', 'do-vat': 'Đồ vật' };
const STAGE_INFO = {
  'tieu-hoc': { label: 'Tiểu học', range: 'lớp 1–5', subs: 'Toán, Tiếng Việt, Tiếng Anh' },
  'thcs': { label: 'THCS', range: 'lớp 6–9', subs: 'Toán, Ngữ văn, Tiếng Anh' },
  'thpt': { label: 'THPT', range: 'lớp 10–12', subs: 'Toán, Ngữ văn, Tiếng Anh và các môn' },
};
const stageOfGrade = g => (g >= 10 ? 'thpt' : g >= 6 ? 'thcs' : 'tieu-hoc');
const seo = {};
seo['/'] = { t: 'Bé Học Vui — Học & luyện thi miễn phí từ Mầm non đến THPT', d: 'Nền tảng học và luyện tập miễn phí bám chương trình GDPT 2018, từ Mầm non đến THPT. Bài tập theo chủ đề và đề thi thử chấm điểm tức thì.' };
seo['/gioi-thieu'] = { t: 'Giới thiệu | Bé Học Vui', d: 'Bé Học Vui — nền tảng học và luyện tập miễn phí bám chương trình GDPT 2018 cho học sinh từ Mầm non đến THPT.' };
seo['/faq'] = { t: 'Câu hỏi thường gặp | Bé Học Vui', d: 'Giải đáp các thắc mắc thường gặp khi dùng Bé Học Vui: tài khoản, tiến trình, đề thi thử, quyền riêng tư.' };
seo['/chinh-sach'] = { t: 'Chính sách & Điều khoản | Bé Học Vui', d: 'Chính sách quyền riêng tư và điều khoản sử dụng của Bé Học Vui — bảo vệ thông tin trẻ em, miễn phí, nội dung tham khảo.' };
seo['/mam-non'] = { t: 'Mầm non (3–5 tuổi) — Học qua hình ảnh & giọng đọc | Bé Học Vui', d: 'Trò chơi học tập cho bé 3–5 tuổi: màu sắc, con vật, đếm số, hình khối… qua hình ảnh và giọng đọc. Miễn phí, không cần biết chữ.' };
for (const st of ['tieu-hoc', 'thcs', 'thpt']) {
  const s = STAGE_INFO[st];
  seo[`/cap/${st}`] = { t: `${s.label} (${s.range}) — Bài tập & đề ôn tập | Bé Học Vui`, d: `Bài tập và đề ôn tập ${s.subs} ${s.range} bám chương trình GDPT 2018. Đề giữa kỳ, cuối kỳ và thi thử chấm điểm ngay, miễn phí.` };
}
for (const p of seoPaths) {
  if (seo[p]) continue;
  let m = p.match(/^\/lop(\d+)\/([a-z-]+)$/);
  if (m) { const g = +m[1], sn = SUBJ[m[2]] || m[2]; seo[p] = { t: `${sn} lớp ${g} — Bài tập, đề ôn tập & thi thử | Bé Học Vui`, d: `Bài tập và đề ôn tập ${sn} lớp ${g} bám chương trình GDPT 2018 (Kết nối tri thức). Đề giữa kỳ, cuối kỳ và thi thử, chấm điểm tức thì, miễn phí.` }; continue; }
  m = p.match(/^\/lop(\d+)$/);
  if (m) { const g = +m[1]; seo[p] = { t: `Lớp ${g} — Bài tập & đề ôn tập các môn | Bé Học Vui`, d: `Tổng hợp bài tập và đề ôn tập lớp ${g} (${STAGE_INFO[stageOfGrade(g)].subs}) bám chương trình GDPT 2018. Đề giữa kỳ, cuối kỳ, thi thử chấm điểm tức thì.` }; continue; }
  m = p.match(/^\/mam-non\/age(\d+)\/([a-z-]+)$/);
  if (m) { const a = +m[1], dn = MN_DOMAIN[m[2]] || m[2]; seo[p] = { t: `${dn} cho bé ${a} tuổi | Bé Học Vui`, d: `Bé ${a} tuổi học ${dn} qua tranh và giọng đọc — vui, dễ hiểu, miễn phí.` }; continue; }
  m = p.match(/^\/mam-non\/age(\d+)$/);
  if (m) { const a = +m[1]; seo[p] = { t: `Bé ${a} tuổi — Học mà chơi | Bé Học Vui`, d: `Hoạt động học tập cho bé ${a} tuổi qua hình ảnh và giọng đọc: màu sắc, con vật, đếm số, hình khối… miễn phí.` }; continue; }
}
for (const e of index.exercises) {
  const topic = e.topic || 'Bài tập';
  const t = `${topic} | Bé Học Vui`;
  let d;
  if ((e.stage || 'tieu-hoc') === 'mam-non') d = `${topic} cho bé ${e.grade} tuổi — học qua tranh và giọng đọc, miễn phí.`;
  else d = `${topic} — ${e.questionCount} câu môn ${SUBJ[e.subject] || e.subject} lớp ${e.grade}, bám chương trình GDPT 2018, chấm điểm tức thì.`;
  seo[`/bai/${e.id}`] = { t: t.length > 65 ? topic.slice(0, 60) + '… | Bé Học Vui' : t, d: d.slice(0, 165) };
}
fs.writeFileSync(SEO_OUT, JSON.stringify(seo), 'utf8');
console.log(`🔎 Đã sinh seo-meta.json (${Object.keys(seo).length} trang)`);

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
