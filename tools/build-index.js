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
const seoPaths = new Set(['/', '/gioi-thieu', '/faq', '/chinh-sach', '/phu-huynh', '/huong-dan-cai-dat', '/cap/tieu-hoc', '/cap/thcs', '/cap/thpt', '/mam-non']);
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
seo['/phu-huynh'] = { t: 'Theo dõi của phụ huynh | Bé Học Vui', d: 'Phụ huynh nhập biệt danh của con và mã PIN 6 chữ số để xem tiến trình học: số sao, chuỗi ngày học, kết quả theo môn. Chỉ xem, không sửa.' };
seo['/huong-dan-cai-dat'] = { t: 'Hướng dẫn cài đặt âm thanh, rung và hiệu ứng | Bé Học Vui', d: 'Cách bật/tắt âm thanh, rung khi sai và giảm hiệu ứng chuyển động (Reduce motion) trên Windows, macOS, iPhone, iPad và Android khi dùng Bé Học Vui.' };
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

// ===== Sinh ngân hàng câu hỏi "Đề hôm nay" cho THCS/THPT =====
// Gom câu từ các đề LUYỆN TẬP (bỏ đề thi thử + đề ôn tập định kỳ) theo lớp + môn cốt lõi.
// Tiểu học (lớp 1–5) dùng bank tự soạn sẵn trong /banks/, KHÔNG đụng tới.
const BANKS_DIR = path.resolve(__dirname, '..', 'banks');
const DAILY_CORE = ['toan', 'ngu-van', 'tieng-anh']; // 3 môn cốt lõi
const DAILY_MIN = 12;                                // tối thiểu số câu để mở "đề hôm nay"
const isExamLike = (d) => {
  if (typeof d.timeLimit === 'number' && d.timeLimit > 0) return true;
  const ch = (d.chapter || '').toLowerCase(), tp = (d.topic || '').toLowerCase();
  return ch.includes('ôn tập') || ch.includes('on tap') || tp.includes('thi thử') || tp.includes('thi thu');
};
// Xóa bank THCS/THPT cũ (sinh tự động) để tránh bank lỗi thời; giữ bank tiểu học tự soạn.
for (const f of fs.readdirSync(BANKS_DIR)) {
  if (/^(thcs|thpt)-lop\d+-.+\.json$/.test(f)) fs.unlinkSync(path.join(BANKS_DIR, f));
}
const pools = {}; // `${stage}-lop${grade}-${subject}` -> {stage,grade,subject,questions,seen}
for (const { data: d } of ok) {
  if (d.stage !== 'thcs' && d.stage !== 'thpt') continue;
  if (!DAILY_CORE.includes(d.subject) || isExamLike(d)) continue;
  const key = `${d.stage}-lop${d.grade}-${d.subject}`;
  if (!pools[key]) pools[key] = { stage: d.stage, grade: d.grade, subject: d.subject, questions: [], seen: new Set() };
  const p = pools[key];
  for (const q of (d.questions || [])) {
    const sig = (q.question || '') + '|' + (q.type || '');
    if (p.seen.has(sig)) continue; // khử trùng câu giữa các đề
    p.seen.add(sig); p.questions.push(q);
  }
}
let bankCount = 0;
for (const key of Object.keys(pools)) {
  const p = pools[key];
  if (p.questions.length < DAILY_MIN) continue;
  fs.writeFileSync(path.join(BANKS_DIR, key + '.json'),
    JSON.stringify({ stage: p.stage, grade: p.grade, subject: p.subject, count: p.questions.length, questions: p.questions }), 'utf8');
  bankCount++;
}
// Manifest: quét mọi bank (kể cả tiểu học tự soạn) → { `${grade}-${subject}`: số câu }
const manifest = {};
for (const f of fs.readdirSync(BANKS_DIR)) {
  const m = f.match(/^(?:tieu-hoc|thcs|thpt)-lop(\d+)-(.+)\.json$/);
  if (!m) continue;
  try {
    const b = JSON.parse(fs.readFileSync(path.join(BANKS_DIR, f), 'utf8'));
    manifest[`${+m[1]}-${m[2]}`] = b.count || (b.questions || []).length;
  } catch { /* bỏ qua file lỗi */ }
}
fs.writeFileSync(path.join(BANKS_DIR, 'manifest.json'), JSON.stringify(manifest), 'utf8');
console.log(`📚 Đã sinh ${bankCount} bank THCS/THPT + manifest.json (${Object.keys(manifest).length} lớp-môn có "đề hôm nay")`);

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
