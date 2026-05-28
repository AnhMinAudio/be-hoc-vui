// Render câu hỏi điền đáp án
const FillBlank = {
  render(q, idx, onAnswer, mode = 'practice') {
    const wrap = document.createElement('div');
    wrap.className = 'question-card';

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
      if (!correct) {
        const showAns = document.createElement('div');
        showAns.style.cssText = 'text-align:center;margin-top:14px;color:#6B6B8C;';
        showAns.innerHTML = `Đáp án đúng: <strong style="color:#4DB6AC">${q.answer}</strong>`;
        wrap.appendChild(showAns);
      }
      window.__showFeedback(wrap, correct, q.hint);
      onAnswer(correct);
    };

    btn.onclick = check;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    wrap.appendChild(btn);
    setTimeout(() => input.focus(), 50);
    return wrap;
  },
};
