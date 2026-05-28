// Render câu hỏi "chạm vào tranh đúng" cho mầm non.
// Đáp án là tranh (emoji → Twemoji) hoặc số/chữ to. Câu hỏi được đọc to bằng TTS.
const ImageChoice = {
  render(q, idx, onAnswer) {
    const wrap = document.createElement('div');
    wrap.className = 'question-card kid-card';

    // Câu hỏi + nút loa đọc lại
    const head = document.createElement('div');
    head.className = 'kid-question';
    const qtext = document.createElement('span');
    qtext.textContent = q.question;
    head.appendChild(qtext);
    if (Media.supportsSpeech()) {
      const sp = document.createElement('button');
      sp.className = 'speak-btn';
      sp.type = 'button';
      sp.textContent = '🔊';
      sp.title = 'Nghe lại';
      sp.onclick = () => Media.speak(q.speak || q.question);
      head.appendChild(sp);
    }
    wrap.appendChild(head);

    // Nếu trong đề bài có tranh minh hoạ kèm (vd đếm số) → hiện ở giữa
    if (q.prompt) {
      const promptBox = document.createElement('div');
      promptBox.className = 'kid-prompt';
      String(q.prompt).split(/\s+/).filter(Boolean).forEach(tok => promptBox.appendChild(Media.visual(tok)));
      wrap.appendChild(promptBox);
    }

    const opts = document.createElement('div');
    opts.className = 'kid-options';
    let answered = false;

    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'kid-option';
      btn.type = 'button';
      btn.appendChild(Media.visual(opt));
      btn.onclick = () => {
        if (answered) return;
        answered = true;
        const correct = i === q.answer;
        Array.from(opts.children).forEach(c => c.classList.add('disabled'));
        btn.classList.add(correct ? 'correct' : 'wrong');
        if (!correct) opts.children[q.answer].classList.add('correct');
        // Phản hồi bằng giọng nói + biểu tượng
        Media.speak(correct ? 'Đúng rồi! Giỏi quá!' : 'Chưa đúng, thử lại nhé!');
        const fb = document.createElement('div');
        fb.className = 'feedback ' + (correct ? 'correct' : 'wrong');
        fb.innerHTML = `<span class="emoji">${correct ? '🎉' : '💪'}</span><span>${correct ? 'Đúng rồi! Giỏi quá!' : 'Chưa đúng. Cố lên nào!'}</span>`;
        wrap.appendChild(fb);
        onAnswer(correct);
      };
      opts.appendChild(btn);
    });
    wrap.appendChild(opts);

    // Tự đọc đề khi hiện câu
    setTimeout(() => Media.speak(q.speak || q.question), 250);
    return wrap;
  },
};
