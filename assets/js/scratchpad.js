// ===== Feature A — Vẽ nháp (Drawing Pad) — Đợt 3 · Bé Học Vui =====
// Công cụ phụ cho đề Toán/Vật lí (THCS/THPT). Vẽ tay bằng Canvas 2D + Pointer Events.
// KHÔNG thư viện. Không lưu localStorage (giấy nháp thật: rời đề/refresh là mất).
// API: Scratchpad.init() gọi 1 lần lúc khởi động; Scratchpad.mount(exercise) khi vào đề;
//      Scratchpad.unmount() khi rời đề.
const Scratchpad = (() => {
  const COLORS = ['#111827', '#2563EB', '#DC2626', '#16A34A']; // đen · xanh dương · đỏ · xanh lá
  const SIZES  = { thin: 2, med: 2.5, bold: 5 };
  const ELIGIBLE_SUBJECT = ['toan', 'vat-li'];
  const ELIGIBLE_STAGE   = ['thcs', 'thpt'];
  const MAX_STEPS = 50;

  let fab, panel, scrim, board, canvas, ctx, undoBtn, redoBtn, clearBtn, toolsEl;
  let strokes = [], redo = [], cur = null;
  let color = COLORS[0], size = SIZES.med, eraser = false, dpr = 1, built = false, openFlag = false;
  let forceMode = null; // chỉ dùng cho demo/preview; production để null (auto theo bề rộng)

  // ---- dựng DOM 1 lần ----
  function init() {
    if (built) return; built = true;

    fab = el('button', 'scratch-fab', '<span class="ico">✏️</span><span class="lbl">Nháp</span>');
    fab.setAttribute('aria-label', 'Mở bảng vẽ nháp');
    fab.addEventListener('click', open);

    scrim = el('div', 'scratch-scrim');
    scrim.addEventListener('click', close);

    panel = el('div', 'scratch-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Bảng vẽ nháp');
    panel.hidden = true;
    panel.innerHTML = `
      <div class="scratch-grip" aria-hidden="true"></div>
      <div class="scratch-head">
        <span class="ttl">📝 Bảng nháp</span>
        <button class="scratch-close" aria-label="Đóng bảng vẽ">✕</button>
      </div>
      <div class="scratch-board"><canvas class="scratch-canvas"></canvas></div>
      <div class="scratch-tools"></div>`;

    board = panel.querySelector('.scratch-board');
    canvas = panel.querySelector('.scratch-canvas');
    ctx = canvas.getContext('2d');
    panel.querySelector('.scratch-close').addEventListener('click', close);

    buildTools(panel.querySelector('.scratch-tools'));
    bindGrip(panel.querySelector('.scratch-grip'));
    bindDraw();

    document.body.append(fab, scrim, panel);
    window.addEventListener('resize', onResize);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && openFlag) close(); });
  }

  function el(tag, cls, html) { const n = document.createElement(tag); n.className = cls; if (html != null) n.innerHTML = html; return n; }

  function buildTools(t) {
    toolsEl = t;
    const cg = el('div', 'scratch-group');
    COLORS.forEach((c, i) => {
      const s = el('button', 'sp-swatch' + (i === 0 ? ' on' : ''));
      s.style.background = c; s.dataset.color = c;
      s.setAttribute('aria-label', ['Bút đen', 'Bút xanh dương', 'Bút đỏ', 'Bút xanh lá'][i]);
      s.addEventListener('click', () => { color = c; eraser = false; setActive(cg, s); syncTool(); });
      cg.appendChild(s);
    });

    const sg = el('div', 'scratch-group');
    Object.entries(SIZES).forEach(([k, v], i) => {
      const b = el('button', 'sp-btn sp-size' + (k === 'med' ? ' on' : ''), '<span class="dot"></span>');
      b.dataset.size = k;
      b.setAttribute('aria-label', ['Nét mảnh', 'Nét vừa', 'Nét đậm'][i]);
      b.addEventListener('click', () => { size = v; setActive(sg, b); });
      sg.appendChild(b);
    });

    const tg = el('div', 'scratch-group');
    const pen = el('button', 'sp-btn on', '✏️'); pen.setAttribute('aria-label', 'Công cụ bút');
    const er = el('button', 'sp-btn', '🧽'); er.setAttribute('aria-label', 'Công cụ tẩy');
    pen.addEventListener('click', () => { eraser = false; pen.classList.add('on'); er.classList.remove('on'); syncTool(); });
    er.addEventListener('click', () => { eraser = true; er.classList.add('on'); pen.classList.remove('on'); syncTool(); });
    tg.append(pen, er);

    const ug = el('div', 'scratch-group');
    undoBtn = el('button', 'sp-btn', '↩'); undoBtn.setAttribute('aria-label', 'Hoàn tác');
    redoBtn = el('button', 'sp-btn', '↪'); redoBtn.setAttribute('aria-label', 'Làm lại');
    undoBtn.addEventListener('click', undo); redoBtn.addEventListener('click', redoFn);
    ug.append(undoBtn, redoBtn);

    clearBtn = el('button', 'sp-btn sp-clear', '🗑'); clearBtn.setAttribute('aria-label', 'Xóa hết nháp');
    clearBtn.addEventListener('click', askClear);

    t.append(cg, sep(), sg, sep(), tg, sep(), ug, clearBtn);
    refreshUndo();
  }
  function sep() { return el('div', 'scratch-sep'); }
  function setActive(group, node) { group.querySelectorAll('.on').forEach(n => n.classList.remove('on')); node.classList.add('on'); }
  function syncTool() {
    board.classList.toggle('erasing', eraser);
    // đồng bộ swatch khi chuyển về bút sau khi tẩy
    if (!eraser) toolsEl.querySelectorAll('.sp-swatch').forEach(s => s.classList.toggle('on', s.dataset.color === color));
    else toolsEl.querySelectorAll('.sp-swatch').forEach(s => s.classList.remove('on'));
  }

  // ---- canvas sizing (giữ nội dung khi resize/xoay) ----
  function fit() {
    const r = board.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    redraw();
  }
  function onResize() { if (openFlag) fit(); }

  function redraw() {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const st of strokes) drawStroke(st, w, h);
  }
  function drawStroke(st, w, h) {
    ctx.globalCompositeOperation = st.mode === 'erase' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = st.color; ctx.lineWidth = st.size * dpr;
    ctx.beginPath();
    st.pts.forEach((p, i) => { const x = p.x * w, y = p.y * h; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    if (st.pts.length === 1) { const p = st.pts[0]; ctx.lineTo(p.x * w + .01, p.y * h); } // chấm điểm
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- vẽ bằng Pointer Events ----
  function bindDraw() {
    const pos = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; };
    canvas.addEventListener('pointerdown', e => {
      e.preventDefault(); canvas.setPointerCapture(e.pointerId);
      cur = { color, size: eraser ? size * 4 : size, mode: eraser ? 'erase' : 'pen', pts: [pos(e)] };
      drawStroke(cur, canvas.width, canvas.height);
    });
    canvas.addEventListener('pointermove', e => {
      if (!cur) return; e.preventDefault();
      cur.pts.push(pos(e));
      // vẽ đoạn cuối cho mượt (không redraw toàn bộ)
      const w = canvas.width, h = canvas.height, n = cur.pts.length;
      ctx.globalCompositeOperation = cur.mode === 'erase' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = cur.color; ctx.lineWidth = cur.size * dpr; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(cur.pts[n - 2].x * w, cur.pts[n - 2].y * h);
      ctx.lineTo(cur.pts[n - 1].x * w, cur.pts[n - 1].y * h);
      ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
    });
    const end = () => {
      if (!cur) return;
      strokes.push(cur);
      if (strokes.length > MAX_STEPS) strokes.shift();
      redo = []; cur = null; refreshUndo();
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerleave', end);
  }

  function undo() { if (!strokes.length) return; redo.push(strokes.pop()); if (redo.length > MAX_STEPS) redo.shift(); redraw(); refreshUndo(); }
  function redoFn() { if (!redo.length) return; strokes.push(redo.pop()); redraw(); refreshUndo(); }
  function refreshUndo() { if (undoBtn) undoBtn.disabled = !strokes.length; if (redoBtn) redoBtn.disabled = !redo.length; if (clearBtn) clearBtn.disabled = !strokes.length && !cur; }

  // ---- xóa hết (có confirm inline) ----
  function askClear() {
    if (!strokes.length) return;
    const tools = toolsEl; const saved = tools.innerHTML;
    const c = el('div', 'sp-confirm', '<span>Xóa hết nháp?</span>');
    const yes = el('button', 'yes', 'Xóa'); const no = el('button', 'no', 'Giữ lại');
    c.append(no, yes); tools.innerHTML = ''; tools.appendChild(c);
    no.addEventListener('click', () => { tools.innerHTML = ''; buildTools(tools); syncTool(); });
    yes.addEventListener('click', () => { strokes = []; redo = []; redraw(); tools.innerHTML = ''; buildTools(tools); syncTool(); });
  }

  // ---- open / close ----
  function open() {
    openFlag = true;
    panel.hidden = false; layout();
    requestAnimationFrame(() => { panel.classList.add('open'); fit(); });
    if (panel.dataset.mode === 'sheet') scrim.classList.add('show');
    fab.classList.add('hidden');
  }
  function close() {
    openFlag = false;
    panel.classList.remove('open'); scrim.classList.remove('show');
    fab.classList.remove('hidden');
    const done = () => { if (!openFlag) panel.hidden = true; panel.removeEventListener('transitionend', done); };
    panel.addEventListener('transitionend', done);
    setTimeout(done, 280); // fallback nếu prefers-reduced-motion (không có transitionend)
  }
  function layout() { panel.dataset.mode = forceMode || (window.innerWidth < 900 ? 'sheet' : 'side'); }
  function setMode(m) { forceMode = m; if (openFlag) { layout(); fit(); scrim.classList.toggle('show', panel.dataset.mode === 'sheet'); } }

  // kéo grip để đóng (chế độ sheet)
  function bindGrip(grip) {
    let y0 = null;
    grip.addEventListener('pointerdown', e => { if (panel.dataset.mode !== 'sheet') return; y0 = e.clientY; grip.setPointerCapture(e.pointerId); });
    grip.addEventListener('pointermove', e => { if (y0 == null) return; const dy = Math.max(0, e.clientY - y0); panel.style.transform = `translateY(${dy}px)`; });
    grip.addEventListener('pointerup', e => { if (y0 == null) return; const dy = e.clientY - y0; panel.style.transform = ''; y0 = null; if (dy > 90) close(); });
  }

  // ---- lifecycle (gọi từ app.js) ----
  function eligible(ex) { return ex && ELIGIBLE_SUBJECT.includes(ex.subject) && ELIGIBLE_STAGE.includes(ex.stage); }
  function mount(ex) {
    init();
    strokes = []; redo = []; cur = null; if (ctx) redraw(); refreshUndo();
    if (eligible(ex)) fab.classList.add('show'); else fab.classList.remove('show');
  }
  function unmount() {
    if (!built) return;
    if (openFlag) close();
    fab.classList.remove('show');
    strokes = []; redo = []; cur = null; if (ctx) redraw();
  }

  return { init, mount, unmount, open, close, setMode };
})();

if (typeof window !== 'undefined') window.Scratchpad = Scratchpad;
