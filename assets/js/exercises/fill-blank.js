// Render câu hỏi điền đáp án
const FillBlank = {
  render(q, idx, onAnswer, mode = 'practice') {
    const wrap = document.createElement('div');
    wrap.className = 'question-card';

    if (q.passage && window.__makePassage) wrap.appendChild(window.__makePassage(q.passage));

    const text = document.createElement('div');
    text.className = 'question-text';
    text.textContent = `Câu ${idx + 1}.`;
    wrap.appendChild(text);

    // Tách "___" trong câu hỏi để chèn input vào giữa
    const fq = document.createElement('div');
    fq.className = 'fill-question';
    const parts = q.question.split(/_{2,}|\.\.\./);
    const input = document.createElement('input');
    input.className = 'fill-input';
    input.type = 'text';
    input.autocomplete = 'off';
    input.placeholder = '?';

    if (parts.length > 1) {
      parts.forEach((p, i) => {
        if (p) {
          const span = document.createElement('span');
          span.textContent = p;
          fq.appendChild(span);
        }
        if (i < parts.length - 1) fq.appendChild(input);
      });
    } else {
      const span = document.createElement('span');
      span.textContent = q.question;
      fq.appendChild(span);
      fq.appendChild(input);
    }
    wrap.appendChild(fq);

    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = 'Kiểm tra';
    btn.style.display = 'block';
    btn.style.margin = '0 auto';

    let answered = false;
    const check = () => {
      if (answered) return;
      const userAns = input.value.trim().toLowerCase();
      if (userAns === '') { input.focus(); return; }
      const expected = String(q.answer).trim().toLowerCase();
      const accepted = (q.alternatives || []).map(a => String(a).trim().toLowerCase());
      const correct = userAns === expected || accepted.includes(userAns);
      answered = true;
      input.disabled = true;
      btn.disabled = true;
      if (mode === 'exam') {
        input.classList.add('selected');
        setTimeout(() => onAnswer(correct), 450);
        return;
      }
      input.classList.add(correct ? 'correct' : 'wrong');
      window.__showFeedback(wrap, correct, q.hint, q.answer);
      onAnswer(correct);
    };

    btn.onclick = check;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    wrap.appendChild(btn);
    setTimeout(() => input.focus(), 50);
    return wrap;
  },
};
