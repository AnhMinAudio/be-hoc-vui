// Render câu hỏi ghép cặp (matching) — click để chọn, không cần kéo thả thật sự (dễ trên mobile)
const Matching = {
  render(q, idx, onAnswer, mode = 'practice') {
    const wrap = document.createElement('div');
    wrap.className = 'question-card';

    const text = document.createElement('div');
    text.className = 'question-text';
    const fmt = window.__formatQ || (s => String(s == null ? '' : s));
    text.innerHTML = `Câu ${idx + 1}. ${fmt(q.question || 'Hãy ghép các cặp tương ứng')}`;
    wrap.appendChild(text);

    const hint = document.createElement('div');
    hint.style.cssText = 'text-align:center;color:#6B6B8C;font-size:0.95rem;margin-bottom:14px;';
    hint.textContent = '👉 Bấm vào 1 ô bên trái, rồi bấm ô tương ứng bên phải';
    wrap.appendChild(hint);

    // Tạo 2 cột — trái là nguồn theo thứ tự gốc; phải là đáp án xáo trộn
    const lefts = q.pairs.map((p, i) => ({ id: i, text: p[0] }));
    const rights = q.pairs.map((p, i) => ({ id: i, text: p[1] }));
    shuffle(rights);

    const area = document.createElement('div');
    area.className = 'matching-area';
    const colL = document.createElement('div');
    colL.className = 'matching-col';
    const colR = document.createElement('div');
    colR.className = 'matching-col';

    const state = { selectedLeft: null, selectedRight: null, matches: {}, answered: false };
    const totalPairs = q.pairs.length;

    const checkAndContinue = () => {
      if (Object.keys(state.matches).length !== totalPairs) return;
      state.answered = true;
      let correctCount = 0;
      Object.entries(state.matches).forEach(([leftId, rightId]) => {
        if (Number(leftId) === Number(rightId)) correctCount++;
      });
      const allCorrect = correctCount === totalPairs;

      if (mode === 'exam') {
        setTimeout(() => onAnswer(allCorrect), 450);
        return;
      }
      // Chế độ luyện: tô màu đúng/sai từng cặp
      Object.entries(state.matches).forEach(([leftId, rightId]) => {
        const lEl = colL.querySelector(`[data-id="${leftId}"]`);
        const rEl = colR.querySelector(`[data-id="${rightId}"]`);
        const cls = Number(leftId) === Number(rightId) ? 'match-correct' : 'match-wrong';
        lEl.classList.add(cls);
        rEl.classList.add(cls);
      });
      const keyAns = (q.pairs || []).map(p => `${p[0]} → ${p[1]}`).join('  ·  ');
      window.__showFeedback(wrap, allCorrect, q.hint, keyAns);
      onAnswer(allCorrect);
    };

    const handleClick = (side, el, item) => {
      if (state.answered || el.classList.contains('matched')) return;
      if (side === 'L') {
        colL.querySelectorAll('.match-item.selected').forEach(c => c.classList.remove('selected'));
        state.selectedLeft = item;
        el.classList.add('selected');
      } else {
        if (!state.selectedLeft) return;
        // Gán cặp
        state.matches[state.selectedLeft.id] = item.id;
        const leftEl = colL.querySelector(`[data-id="${state.selectedLeft.id}"]`);
        leftEl.classList.remove('selected');
        leftEl.classList.add('matched');
        el.classList.add('matched');
        // Hiển thị badge số ghép cặp
        const badge = String.fromCharCode(9312 + Object.keys(state.matches).length - 1); // ① ② ③
        leftEl.dataset.pair = badge;
        el.dataset.pair = badge;
        leftEl.textContent = `${badge} ${state.selectedLeft.text}`;
        el.textContent = `${badge} ${item.text}`;
        state.selectedLeft = null;
        checkAndContinue();
      }
    };

    lefts.forEach(item => {
      const el = document.createElement('div');
      el.className = 'match-item';
      el.dataset.id = item.id;
      el.textContent = item.text;
      el.onclick = () => handleClick('L', el, item);
      colL.appendChild(el);
    });
    rights.forEach(item => {
      const el = document.createElement('div');
      el.className = 'match-item';
      el.dataset.id = item.id;
      el.textContent = item.text;
      el.onclick = () => handleClick('R', el, item);
      colR.appendChild(el);
    });

    area.appendChild(colL);
    area.appendChild(colR);
    wrap.appendChild(area);
    return wrap;
  },
};

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
