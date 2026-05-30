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
          showFeedback(wrap, correct, q.hint, `${letters[q.answer]}. ${q.options[q.answer]}`);
          onAnswer(correct);
        }
      };
      opts.appendChild(btn);
    });
    wrap.appendChild(opts);
    return wrap;
  },
};

// Hiển thị phản hồi đúng/sai + khối "Giải thích" (đáp án đúng + lời giải) sau MỖI câu.
// answerText: đáp án đúng dạng chữ (tùy chọn). hint: lời giải/cách làm (tùy chọn).
function showFeedback(wrap, correct, hint, answerText) {
  if (window.Media && Media.feedback) Media.feedback(correct); // ding khi đúng / buzz + rung nhẹ khi sai
  const fb = document.createElement('div');
  fb.className = 'feedback ' + (correct ? 'correct' : 'wrong');
  const emoji = correct
    ? ['🎉', '🌟', '👏', '💖', '🦄'][Math.floor(Math.random() * 5)]
    : '💪';
  const msg = correct
    ? ['Tuyệt vời!', 'Giỏi quá!', 'Đúng rồi!', 'Xuất sắc!', 'Chính xác!'][Math.floor(Math.random() * 5)]
    : 'Chưa đúng rồi!';
  fb.innerHTML = `<span class="emoji">${emoji}</span><span>${msg}</span>`;
  wrap.appendChild(fb);

  if (answerText || hint) {
    const ex = document.createElement('div');
    ex.className = 'explain';
    ex.innerHTML =
      (answerText ? `<div class="ex-ans">✅ Đáp án đúng: <b>${answerText}</b></div>` : '') +
      (hint ? `<div class="ex-why"><b>💡 Giải thích:</b> ${hint}</div>` : '');
    wrap.appendChild(ex);
    if (window.Media && Media.renderMath) Media.renderMath(ex); // render công thức KaTeX (Toán THCS/THPT)
  }
}

// Expose helper (dùng chung cho fill-blank, true-false, matching, true-false-group)
window.__showFeedback = showFeedback;
