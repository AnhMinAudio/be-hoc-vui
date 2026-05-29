// Helper hiển thị tranh minh hoạ (từ emoji → ảnh Twemoji) và đọc đề bằng giọng nói (TTS).
const Media = (() => {
  const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/';

  // Chuyển 1 emoji thành mã codepoint cho Twemoji (bỏ variation selector FE0F)
  function emojiCode(emoji) {
    const codes = [];
    for (const ch of emoji) {
      const cp = ch.codePointAt(0);
      if (cp !== 0xfe0f) codes.push(cp.toString(16));
    }
    return codes.join('-');
  }

  // Một ký tự có phải emoji không (để biết khi nào render thành tranh)
  function isEmoji(str) {
    return /\p{Extended_Pictographic}/u.test(str);
  }

  // Trả về phần tử hiển thị: nếu là emoji → <img> tranh Twemoji (lỗi thì fallback về chữ emoji);
  // nếu là URL ảnh → <img> ảnh đó; còn lại (số/chữ) → text to.
  function visual(value) {
    const v = String(value);
    if (/^(https?:)?\/\//.test(v) || v.startsWith('assets/')) {
      const img = document.createElement('img');
      img.src = v; img.alt = ''; img.className = 'kid-img';
      return img;
    }
    if (isEmoji(v)) {
      const img = document.createElement('img');
      img.src = TWEMOJI_BASE + emojiCode(v) + '.svg';
      img.alt = ''; img.className = 'kid-img';
      img.loading = 'lazy';
      // Nếu CDN lỗi → hiện luôn emoji gốc bằng chữ
      img.onerror = () => {
        const span = document.createElement('span');
        span.className = 'kid-emoji-text';
        span.textContent = v;
        img.replaceWith(span);
      };
      return img;
    }
    const span = document.createElement('span');
    span.className = 'kid-text';
    span.textContent = v;
    return span;
  }

  // Đọc to một đoạn tiếng Việt
  let viVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    viVoice = voices.find(v => /vi(-|_)?VN/i.test(v.lang) || /vietnam/i.test(v.name)) || null;
    return viVoice;
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  function speak(text) {
    if (!('speechSynthesis' in window) || !text) return;
    try {
      const synth = window.speechSynthesis;
      // Chỉ huỷ khi đang/đang chờ đọc. Gọi cancel() lúc hàng đợi rỗng là lỗi
      // đã biết của Chrome: câu kế tiếp bị "nuốt", loa im re.
      if (synth.speaking || synth.pending) synth.cancel();
      // Chrome đôi khi kẹt ở trạng thái paused làm speak() không phát.
      synth.resume();
      if (!viVoice) pickVoice(); // lần đầu getVoices() có thể rỗng → thử lại
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'vi-VN';
      u.rate = 0.9;
      if (viVoice) u.voice = viVoice;
      synth.speak(u);
    } catch (e) { /* bỏ qua nếu thiết bị không hỗ trợ */ }
  }

  function supportsSpeech() {
    return 'speechSynthesis' in window;
  }

  // Render công thức Toán dạng $...$ bằng KaTeX (nếu đã tải)
  function renderMath(el) {
    if (!el || typeof window.renderMathInElement !== 'function') return;
    try {
      window.renderMathInElement(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
        ],
        throwOnError: false,
      });
    } catch (e) { /* bỏ qua */ }
  }

  return { visual, speak, supportsSpeech, isEmoji, renderMath };
})();
