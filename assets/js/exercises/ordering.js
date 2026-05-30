// ===== Feature C — Timeline kéo thả (ordering) — Đợt 3 · Bé Học Vui =====
// Renderer cho type "ordering". Sắp xếp 3–6 thẻ theo đúng trình tự.
// 3 cách tương tác: kéo-thả (Pointer Events: chuột + cảm ứng + bút), nút ▲▼, bàn phím.
// KHÔNG dùng thư viện ngoài. Tích hợp Media.feedback + tôn trọng prefers-reduced-motion.
const OrderingQuestion = (() => {
  const REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // FLIP: animate khi thứ tự DOM đổi (bỏ qua nếu reduced-motion)
  function flip(list, mutate) {
    if (REDUCE) { mutate(); return; }
    const kids = [...list.children].filter(c => c.classList.contains('ordering-item'));
    const first = new Map(kids.map(k => [k, k.getBoundingClientRect().top]));
    mutate();
    kids.forEach(k => {
      const dy = first.get(k) - k.getBoundingClientRect().top;
      if (!dy) return;
      k.style.transition = 'none';
      k.style.transform = `translateY(${dy}px)`;
      requestAnimationFrame(() => {
        k.style.transition = 'transform 0.2s var(--bounce)';
        k.style.transform = '';
      });
    });
  }

  function render(q, idx, onAnswer, mode = 'practice') {
    const wrap = document.createElement('div');
    wrap.className = 'question-card ordering-question';

    const text = document.createElement('div');
    text.className = 'question-text';
    text.textContent = `Câu ${idx + 1}. ${q.question}`;
    wrap.appendChild(text);

    if (q.image && window.__renderImage) window.__renderImage(wrap, q);

    const help = document.createElement('div');
    help.className = 'ordering-help';
    help.innerHTML = '<span>↕️</span><span>Kéo thẻ, hoặc dùng nút ▲▼, để sắp đúng thứ tự — rồi bấm “Kiểm tra”.</span>';
    wrap.appendChild(help);

    const hideMeta = Array.isArray(q.hideMeta) ? q.hideMeta : [];
    const metaKeys = ['year']; // field meta hỗ trợ hiện sau khi chấm

    // Xáo trộn — đảm bảo KHÔNG trùng đúng thứ tự ngay từ đầu (nếu >1 item)
    let items = q.items.slice();
    if (items.length > 1) {
      let guard = 0;
      do { shuffle(items); guard++; }
      while (guard < 20 && items.map(it => it.id).join() === q.correctOrder.join());
    }

    const list = document.createElement('ul');
    list.className = 'ordering-list';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Danh sách thẻ cần sắp xếp');

    const sr = document.createElement('div');
    sr.className = 'ordering-sr';
    sr.setAttribute('aria-live', 'polite');

    let answered = false;
    let grabbed = null; // item đang "nhấc" bằng bàn phím

    const positionOf = el => [...list.children].indexOf(el) + 1;
    const announce = msg => { sr.textContent = msg; };

    function makeItem(it) {
      const li = document.createElement('li');
      li.className = 'ordering-item';
      li.dataset.id = it.id;
      li.tabIndex = 0;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-label', it.label);

      const handle = document.createElement('div');
      handle.className = 'oi-handle';
      handle.setAttribute('aria-hidden', 'true');
      handle.textContent = '☰';

      const mark = document.createElement('div');
      mark.className = 'oi-mark';

      const icon = document.createElement('div');
      icon.className = 'oi-icon';
      if (it.icon) icon.textContent = it.icon;

      const body = document.createElement('div');
      body.className = 'oi-body';
      const label = document.createElement('div');
      label.className = 'oi-label';
      label.textContent = it.label;
      body.appendChild(label);
      // meta ẩn (vd year) — chỉ hiện sau khi chấm
      const metaText = metaKeys.filter(k => it[k] != null && hideMeta.includes(k)).map(k => it[k]).join(' · ');
      const metaShown = metaKeys.filter(k => it[k] != null && !hideMeta.includes(k)).map(k => it[k]);
      if (metaShown.length) {
        const m = document.createElement('div');
        m.className = 'oi-meta'; m.style.cssText = 'max-height:2em;opacity:1;margin-top:3px';
        m.textContent = metaShown.join(' · ');
        body.appendChild(m);
      }
      const metaEl = document.createElement('div');
      metaEl.className = 'oi-meta';
      metaEl.dataset.meta = metaText;
      body.appendChild(metaEl);

      const nudge = document.createElement('div');
      nudge.className = 'oi-nudge';
      const up = document.createElement('button');
      up.type = 'button'; up.innerHTML = '▲'; up.setAttribute('aria-label', `Chuyển “${it.label}” lên trên`);
      const down = document.createElement('button');
      down.type = 'button'; down.innerHTML = '▼'; down.setAttribute('aria-label', `Chuyển “${it.label}” xuống dưới`);
      up.onclick = () => move(li, -1);
      down.onclick = () => move(li, 1);
      nudge.append(up, down);

      li.append(handle, mark, icon, body, nudge);
      attachDrag(li, handle);
      attachKeys(li);
      return li;
    }

    function refreshNudge() {
      const kids = [...list.children];
      kids.forEach((li, i) => {
        const [up, down] = li.querySelectorAll('.oi-nudge button');
        if (up) up.disabled = i === 0 || answered;
        if (down) down.disabled = i === kids.length - 1 || answered;
      });
    }

    // ▲▼ + bàn phím: đổi chỗ với hàng xóm
    function move(li, dir) {
      if (answered) return;
      const sib = dir < 0 ? li.previousElementSibling : li.nextElementSibling;
      if (!sib || !sib.classList.contains('ordering-item')) return;
      flip(list, () => {
        if (dir < 0) list.insertBefore(li, sib);
        else list.insertBefore(sib, li);
      });
      refreshNudge();
      announce(`Đã chuyển “${li.querySelector('.oi-label').textContent}” đến vị trí ${positionOf(li)} trên ${list.children.length}.`);
    }

    // ===== Kéo thả bằng Pointer Events (chuột + cảm ứng + bút) =====
    function attachDrag(li, handle) {
      let dragging = false, startY = 0, holdTimer = null, pid = null;

      const onMove = e => {
        if (!dragging) {
          // chưa "nhấc": nếu cảm ứng di chuyển nhiều trước khi giữ đủ lâu → bỏ (để cuộn)
          if (holdTimer && Math.abs(e.clientY - startY) > 10) { clearTimeout(holdTimer); holdTimer = null; cleanup(); }
          return;
        }
        e.preventDefault();
        const dy = e.clientY - startY;
        li.style.transform = `translateY(${dy}px)`;
        showDropTarget(e.clientY, li);
      };
      const onUp = () => {
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        if (dragging) commitDrop(li);
        cleanup();
      };
      function cleanup() {
        dragging = false;
        li.classList.remove('lifted');
        li.style.transform = '';
        li.style.transition = '';
        clearDropLine();
        if (pid != null) { try { li.releasePointerCapture(pid); } catch (_) {} pid = null; }
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      }
      function lift(e) {
        dragging = true;
        li.classList.add('lifted');
        li.style.transition = 'none';
        startY = e.clientY;
        announce(`Đang nhấc “${li.querySelector('.oi-label').textContent}”. Kéo để di chuyển.`);
      }

      handle.addEventListener('pointerdown', e => {
        if (answered) return;
        e.preventDefault();
        pid = e.pointerId;
        try { li.setPointerCapture(pid); } catch (_) {}
        startY = e.clientY;
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        if (e.pointerType === 'mouse') lift(e);
        else holdTimer = setTimeout(() => { holdTimer = null; lift(e); }, 180); // long-press cho cảm ứng
      });
    }

    let dropLine = null;
    function clearDropLine() { if (dropLine) { dropLine.remove(); dropLine = null; } }
    function showDropTarget(y, dragged) {
      const kids = [...list.children].filter(c => c.classList.contains('ordering-item') && c !== dragged);
      let before = null;
      for (const k of kids) {
        const r = k.getBoundingClientRect();
        if (y < r.top + r.height / 2) { before = k; break; }
      }
      if (!dropLine) { dropLine = document.createElement('div'); dropLine.className = 'ordering-drop-line'; }
      if (before) list.insertBefore(dropLine, before);
      else list.appendChild(dropLine);
    }
    function commitDrop(li) {
      if (dropLine && dropLine.parentNode === list) {
        flip(list, () => list.insertBefore(li, dropLine));
      }
      clearDropLine();
      refreshNudge();
      announce(`Đã thả “${li.querySelector('.oi-label').textContent}” ở vị trí ${positionOf(li)} trên ${list.children.length}.`);
    }

    // ===== Bàn phím =====
    function attachKeys(li) {
      li.addEventListener('keydown', e => {
        if (answered) return;
        const k = e.key;
        if (k === ' ' || k === 'Enter') {
          e.preventDefault();
          if (grabbed === li) { grabbed = null; li.classList.remove('grabbed'); announce('Đã thả thẻ.'); }
          else { if (grabbed) grabbed.classList.remove('grabbed'); grabbed = li; li.classList.add('grabbed'); announce(`Đã nhấc “${li.querySelector('.oi-label').textContent}”. Dùng phím mũi tên lên/xuống để di chuyển.`); }
        } else if ((k === 'ArrowUp' || k === 'ArrowDown') && grabbed === li) {
          e.preventDefault();
          move(li, k === 'ArrowUp' ? -1 : 1);
          li.focus();
        } else if (k === 'Escape' && grabbed === li) {
          grabbed = null; li.classList.remove('grabbed'); announce('Đã hủy di chuyển.');
        }
      });
    }

    items.forEach(it => list.appendChild(makeItem(it)));
    wrap.appendChild(list);
    wrap.appendChild(sr);
    refreshNudge();

    // ===== Nút Kiểm tra =====
    const actions = document.createElement('div');
    actions.className = 'ordering-actions';
    const submit = document.createElement('button');
    submit.className = 'btn btn-primary btn-lg';
    submit.innerHTML = '✓ Kiểm tra';
    actions.appendChild(submit);
    wrap.appendChild(actions);

    submit.onclick = () => {
      if (answered) return;
      answered = true;
      if (grabbed) { grabbed.classList.remove('grabbed'); grabbed = null; }
      list.classList.add('locked');
      refreshNudge();

      const order = [...list.children].map(li => li.dataset.id);
      let allCorrect = true;
      order.forEach((id, i) => {
        const li = list.children[i];
        const ok = id === q.correctOrder[i];
        if (!ok) allCorrect = false;
        li.classList.add(ok ? 'correct' : 'wrong', 'revealed');
        li.querySelector('.oi-mark').textContent = ok ? '✓' : '✗';
        // hiện meta đã ẩn (vd year) để học sinh học hỏi
        const metaEl = li.querySelector('.oi-meta[data-meta]');
        if (metaEl && metaEl.dataset.meta) {
          const should = q.correctOrder.indexOf(id);
          const note = (!ok && should > -1) ? `<span class="oi-note">→ nên ở vị trí ${should + 1}</span>` : '';
          metaEl.innerHTML = metaEl.dataset.meta + note;
        }
      });

      submit.disabled = true;
      submit.style.display = 'none';
      window.__showFeedback(wrap, allCorrect, q.hint, null); // âm thanh + rung + khối giải thích
      setTimeout(() => onAnswer(allCorrect), mode === 'exam' ? 600 : 2000);
    };

    return wrap;
  }

  return { render };
})();

if (typeof window !== 'undefined') window.OrderingQuestion = OrderingQuestion;
