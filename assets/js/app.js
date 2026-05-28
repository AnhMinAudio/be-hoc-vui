// App chính — SPA hash routing
const SUBJECTS = {
  toan: { name: 'Toán', icon: '🔢', cls: 'toan' },
  'tieng-viet': { name: 'Tiếng Việt', icon: '📖', cls: 'tv' },
  'tieng-anh': { name: 'Tiếng Anh', icon: '🌍', cls: 'ta' },
};

let CATALOG = null; // sẽ load từ exercises/index.json

// ===== Routing =====
async function route() {
  const hash = window.location.hash.slice(1) || '/';
  const view = document.getElementById('view');
  view.innerHTML = '<div class="empty"><div class="emoji">⏳</div><div class="msg">Đang tải...</div></div>';
  updateStarsDisplay();

  if (!CATALOG) {
    try {
      const res = await fetch('exercises/index.json');
      CATALOG = await res.json();
    } catch (e) {
      view.innerHTML = `
        <div class="empty">
          <div class="emoji">📭</div>
          <div class="msg">Chưa có đề bài nào. Hãy chạy <code>node tools/build-index.js</code> để tạo danh mục.</div>
        </div>`;
      return;
    }
  }

  const parts = hash.split('/').filter(Boolean);
  // /                 → chọn lớp
  // /lopN             → chọn môn của lớp N
  // /lopN/MON         → danh sách bài lớp N môn MON
  // /bai/ID           → làm bài

  if (parts.length === 0) return renderHome(view);
  if (parts[0].startsWith('lop')) {
    const grade = parseInt(parts[0].replace('lop', ''));
    if (parts.length === 1) return renderSubjects(view, grade);
    return renderTopicList(view, grade, parts[1]);
  }
  if (parts[0] === 'bai' && parts[1]) return renderExercise(view, parts[1]);
  return renderHome(view);
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);

function updateStarsDisplay() {
  document.getElementById('star-count').textContent = Progress.getStars();
}

// ===== Views =====
function renderHome(view) {
  const total = CATALOG.exercises.length;
  const html = `
    <div class="hero">
      <h1>🎈 Chào mừng đến với Bé Học Vui!</h1>
      <p>Chọn lớp của bạn để bắt đầu nào — có ${total} bài tập đang chờ bạn 🚀</p>
    </div>
    <div class="grade-grid">
      ${[1, 2, 3, 4, 5].map(g => `
        <a href="#/lop${g}" class="grade-card">
          <div class="num">${g}</div>
          <div class="label">Lớp ${g}</div>
        </a>
      `).join('')}
    </div>
  `;
  view.innerHTML = html;
}

function renderSubjects(view, grade) {
  const counts = {};
  for (const key of Object.keys(SUBJECTS)) {
    counts[key] = CATALOG.exercises.filter(e => e.subject === key && e.grade === grade).length;
  }
  const html = `
    <a href="#/" class="back-btn">← Quay lại chọn lớp</a>
    <div class="hero" style="padding:20px 10px 30px">
      <h1>Lớp ${grade}</h1>
      <p>Chọn môn học để bắt đầu</p>
    </div>
    <div class="subject-grid">
      ${Object.entries(SUBJECTS).map(([key, s]) => `
        <a href="#/lop${grade}/${key}" class="subject-card ${s.cls}">
          <div class="icon">${s.icon}</div>
          <div class="name">${s.name}</div>
          <div class="count">${counts[key]} bài tập</div>
        </a>
      `).join('')}
    </div>
  `;
  view.innerHTML = html;
}

function renderTopicList(view, grade, subject) {
  const s = SUBJECTS[subject];
  if (!s) { window.location.hash = '#/'; return; }
  const list = CATALOG.exercises.filter(e => e.grade === grade && e.subject === subject);
  view.innerHTML = `
    <a href="#/lop${grade}" class="back-btn">← Quay lại môn lớp ${grade}</a>
    <div class="hero" style="padding:20px 10px 30px">
      <h1>${s.icon} ${s.name} - Lớp ${grade}</h1>
      <p>Chọn bài tập để làm</p>
    </div>
    ${list.length === 0 ? `
      <div class="empty">
        <div class="emoji">📭</div>
        <div class="msg">Chưa có bài nào cho ${s.name} lớp ${grade}. Sắp có rồi nhé!</div>
      </div>
    ` : `
      <div class="topic-list">
        ${list.map(ex => {
          const done = Progress.getCompletion(ex.id);
          return `
            <a href="#/bai/${ex.id}" class="topic-item">
              <div>
                <div class="title">${ex.topic}</div>
                <div class="meta">${ex.questionCount} câu · Độ khó ${'⭐'.repeat(ex.difficulty || 1)}</div>
              </div>
              ${done ? `<span class="badge">★ ${done.bestScore}/${done.total}</span>` : ''}
            </a>
          `;
        }).join('')}
      </div>
    `}
  `;
}

async function renderExercise(view, id) {
  const meta = CATALOG.exercises.find(e => e.id === id);
  if (!meta) { view.innerHTML = '<div class="empty">Không tìm thấy bài này.</div>'; return; }

  let exercise;
  try {
    const res = await fetch(`exercises/${meta.path}`);
    exercise = await res.json();
  } catch (e) {
    view.innerHTML = `<div class="empty">Không tải được bài: ${meta.path}</div>`;
    return;
  }

  const subject = SUBJECTS[exercise.subject];
  let currentIdx = 0;
  let score = 0;
  const total = exercise.questions.length;

  const renderQuestion = () => {
    const q = exercise.questions[currentIdx];
    const headerHtml = `
      <a href="#/lop${exercise.grade}/${exercise.subject}" class="back-btn">← Quay lại danh sách bài</a>
      <div class="exercise-header">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <div>
            <div style="font-weight:800;font-size:1.3rem">${subject.icon} ${exercise.topic}</div>
            <div style="color:#6B6B8C;font-size:0.95rem">Lớp ${exercise.grade} · ${subject.name}</div>
          </div>
          <div style="font-weight:700;color:#6B6B8C">Câu ${currentIdx + 1}/${total}</div>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${(currentIdx / total) * 100}%"></div></div>
      </div>
    `;
    view.innerHTML = headerHtml;

    const onAnswer = (correct) => {
      if (correct) score++;
      setTimeout(() => {
        currentIdx++;
        if (currentIdx >= total) {
          showResult();
        } else {
          renderQuestion();
        }
      }, 1500);
    };

    let card;
    if (q.type === 'multiple-choice') card = MultipleChoice.render(q, currentIdx, onAnswer);
    else if (q.type === 'fill-blank') card = FillBlank.render(q, currentIdx, onAnswer);
    else if (q.type === 'matching') card = Matching.render(q, currentIdx, onAnswer);
    else { view.innerHTML += `<div class="empty">Loại câu hỏi chưa hỗ trợ: ${q.type}</div>`; return; }
    view.appendChild(card);
  };

  const showResult = () => {
    const percent = Math.round((score / total) * 100);
    const isNewBest = Progress.markCompleted(exercise.id, score, total);
    const earnedStars = score; // 1 sao / câu đúng
    Progress.addStars(earnedStars);
    updateStarsDisplay();

    let emoji, title;
    if (percent === 100) { emoji = '🏆'; title = 'XUẤT SẮC!'; }
    else if (percent >= 80) { emoji = '🌟'; title = 'Rất giỏi!'; }
    else if (percent >= 50) { emoji = '👍'; title = 'Khá tốt!'; }
    else { emoji = '💪'; title = 'Cố gắng thêm nhé!'; }

    view.innerHTML = `
      <div class="result-card">
        <div class="result-emoji">${emoji}</div>
        <div class="result-title">${title}</div>
        <div class="result-score">${score}/${total}</div>
        <div class="result-stars">${'⭐'.repeat(Math.min(score, 10))}</div>
        ${isNewBest ? '<div style="color:#FF8A65;font-weight:700;margin-bottom:14px">🎉 Kỷ lục mới!</div>' : ''}
        <div style="color:#6B6B8C;margin-bottom:24px">Bạn được +${earnedStars} ⭐</div>
        <div class="action-bar" style="justify-content:center">
          <button class="btn btn-secondary" onclick="location.hash='#/lop${exercise.grade}/${exercise.subject}'">Bài khác</button>
          <button class="btn btn-primary" onclick="location.reload()">Làm lại</button>
        </div>
      </div>
    `;
    if (percent >= 80) confetti();
  };

  renderQuestion();
}

// ===== Confetti hiệu ứng đơn giản =====
function confetti() {
  const colors = ['#A8E6CF', '#FFD3B6', '#FFAAA5', '#C9A3FF', '#FFC107'];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.left = Math.random() * 100 + 'vw';
    c.style.top = '-20px';
    c.style.animationDelay = Math.random() * 0.5 + 's';
    c.style.animationDuration = (1.5 + Math.random()) + 's';
    if (Math.random() > 0.5) c.style.borderRadius = '50%';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3000);
  }
}
