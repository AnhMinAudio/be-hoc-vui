// Trắc nghiệm Đúng/Sai theo chuẩn đề mới: 1 câu dẫn + nhiều ý, mỗi ý chọn Đúng/Sai.
// Tính là 1 câu; đúng khi TẤT CẢ các ý đều chọn đúng.
const TrueFalseGroup = {
  render(q, idx, onAnswer, mode = 'practice') {
    const wrap = document.createElement('div');
    wrap.className = 'question-card';

    if (q.passage && window.__makePassage) wrap.appendChild(window.__makePassage(q.passage));

    const text = document.createElement('div');
    text.className = 'question-text';
    text.textContent = `Câu ${idx + 1}. ${q.question}`;
    wrap.appendChild(text);

    const note = document.createElement('div');
    note.style.cssText = 'color:#6B6B8C;font-size:0.9rem;margin-bottom:12px;';
    note.textContent = 'Chọn Đúng hoặc Sai cho mỗi ý:';
    wrap.appendChild(note);

    const letters = ['a', 'b', 'c', 'd', 'e'];
    const chosen = new Array(q.statements.length).fill(null);
    const rows = [];

    q.statements.forEach((st, i) => {
      const row = document.createElement('div');
      row.className = 'tfg-row';
      const label = document.createElement('div');
      label.className = 'tfg-statement';
      label.textContent = `${letters[i]}) ${st.text}`;
      const btns = document.createElement('div');
      btns.className = 'tfg-buttons';
      [['Đúng', true], ['Sai', false]].forEach(([txt, val]) => {
        const b = document.createElement('button');
        b.className = 'tfg-btn';
        b.type = 'button';
        b.textContent = txt;
        b.onclick = () => {
          if (chosen[i] !== null && answered) return;
          chosen[i] = val;
          btns.querySelectorAll('.tfg-btn').forEach(x => x.classList.remove('picked'));
          b.classList.add('picked');
          maybeFinish();
        };
        btns.appendChild(b);
      });
      row.appendChild(label);
      row.appendChild(btns);
      rows.push({ row, btns });
      wrap.appendChild(row);
    });

    let answered = false;
    const maybeFinish = () => {
      if (answered || chosen.some(c => c === null)) return;
      answered = true;
      let allCorrect = true;
      q.statements.forEach((st, i) => {
        const ok = chosen[i] === st.answer;
        if (!ok) allCorrect = false;
        rows[i].btns.querySelectorAll('.tfg-btn').forEach(x => x.classList.add('disabled'));
        if (mode !== 'exam') {
          rows[i].row.classList.add(ok ? 'tfg-correct' : 'tfg-wrong');
          if (!ok) {
            const tag = document.createElement('span');
            tag.className = 'tfg-answer';
            tag.textContent = `(đúng: ${st.answer ? 'Đúng' : 'Sai'})`;
            rows[i].btns.appendChild(tag);
          }
        }
      });
      if (mode === 'exam') {
        setTimeout(() => onAnswer(allCorrect), 450);
        return;
      }
      const keyAns = q.statements.map((s, i) => `(${i + 1}) ${s.answer ? 'Đúng' : 'Sai'}`).join('  ·  ');
      window.__showFeedback(wrap, allCorrect, q.hint, keyAns);
      onAnswer(allCorrect);
    };

    return wrap;
  },
};
