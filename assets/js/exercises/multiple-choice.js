// Render câu hỏi trắc nghiệm 1 đáp án
// mode: 'practice' (hiện đúng/sai ngay) | 'exam' (không hiện, chỉ ghi nhận)
const MultipleChoice = {
  render(q, idx, onAnswer, mode = 'practice') {
    const wrap = document.createElement('div');
    wrap.className = 'question-card';

    if (q.passage && window.__makePassage) wrap.appendChild(window.__makePassage(q.passage));

    const text = document.createElement('div');
    text.className = 'question-text';
    text.textContent = `Câu ${idx + 1}. ${q.question}`;
    wrap.appendChild(text);

    if (q.image) {
      const img = document.createElement('img');
      img.src = q.image;
      img.alt = '';
      img.style.cssText = 'max-width:100%;border-radius:14px;margin-bottom:20px;';
      wrap.appendChild(img);
    }

    const opts = document.createElement('div');
    opts.className = 'options';
    const letters = ['A', 'B', 'C', 'D', 'E'];
    let answered = false;

    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option';
      btn.innerHTML = `<span class="letter">${letters[i]}</span><span>${opt}</span>`;
      btn.onclick = () => {
        if (answered) return;
        answered = true;
        const correct = i === q.answer;
        Array.from(opts.children).forEach(c => c.classList.add('disabled'));
        if (mode === 'exam') {
          btn.classList.add('selected');
          setTimeout(() => onAnswer(correct), 450);
        } else {
          btn.classList.add(correct ? 'correct' : 'wrong');
          if (!correct) opts.children[q.answer].classList.add('correct');
          showFeedback(wrap, correct, q.hint);
          onAnswer(correct);
        }
      };
      opts.appendChild(btn);
    });
    wrap.appendChild(opts);
    return wrap;
  },
};

function showFeedback(wrap, correct, hint) {
  const fb = document.createElement('div');
  fb.className = 'feedback ' + (correct ? 'correct' : 'wrong');
  const emoji = correct
    ? ['🎉', '🌟', '👏', '💖', '🦄'][Math.floor(Math.random() * 5)]
    : '💪';
  const msg = correct
    ? ['Tuyệt vời!', 'Giỏi quá!', 'Đúng rồi!', 'Xuất sắc!', 'Chính xác!'][Math.floor(Math.random() * 5)]
    : (hint ? `Chưa đúng. Gợi ý: ${hint}` : 'Chưa đúng. Cố gắng lần sau nhé!');
  fb.innerHTML = `<span class="emoji">${emoji}</span><span>${msg}</span>`;
  wrap.appendChild(fb);
}

// Expose helper (dùng chung cho fill-blank)
window.__showFeedback = showFeedback;
