// Render câu Đúng/Sai. answer là boolean (true = Đúng).
const TrueFalse = {
  render(q, idx, onAnswer, mode = 'practice') {
    const wrap = document.createElement('div');
    wrap.className = 'question-card';

    if (q.passage) wrap.appendChild(makePassage(q.passage));

    const text = document.createElement('div');
    text.className = 'question-text';
    text.textContent = `Câu ${idx + 1}. ${q.question}`;
    wrap.appendChild(text);

    const opts = document.createElement('div');
    opts.className = 'options tf-options';
    let answered = false;
    const choices = [
      { label: '✓ Đúng', val: true },
      { label: '✗ Sai', val: false },
    ];
    choices.forEach(ch => {
      const btn = document.createElement('button');
      btn.className = 'option tf-option';
      btn.textContent = ch.label;
      btn.onclick = () => {
        if (answered) return;
        answered = true;
        const correct = ch.val === q.answer;
        Array.from(opts.children).forEach(c => c.classList.add('disabled'));
        if (mode === 'exam') {
          btn.classList.add('selected');
          setTimeout(() => onAnswer(correct), 450);
          return;
        }
        btn.classList.add(correct ? 'correct' : 'wrong');
        if (!correct) {
          // tô đáp án đúng
          const right = q.answer ? opts.children[0] : opts.children[1];
          right.classList.add('correct');
        }
        window.__showFeedback(wrap, correct, q.hint);
        onAnswer(correct);
      };
      opts.appendChild(btn);
    });
    wrap.appendChild(opts);
    return wrap;
  },
};

// Hộp đoạn văn đọc hiểu (dùng chung)
function makePassage(text) {
  const box = document.createElement('div');
  box.className = 'passage-box';
  const label = document.createElement('div');
  label.className = 'passage-label';
  label.textContent = '📖 Đọc đoạn sau:';
  const body = document.createElement('div');
  body.className = 'passage-body';
  body.textContent = text;
  box.appendChild(label);
  box.appendChild(body);
  return box;
}
window.__makePassage = makePassage;
