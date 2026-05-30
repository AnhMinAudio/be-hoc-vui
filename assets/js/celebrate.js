// ===== 4C.3 — Milestone celebrations — Bé Học Vui =====
// Celebrate.show(scene, opts) — overlay full-screen, tự đóng, tap để bỏ qua.
// scene: 'firework-perfect' | 'streak-milestone' | 'sticker-legendary' | 'pet-evolve'
// KHÔNG phát âm thanh (Media.feedback đã lo). Tôn trọng prefers-reduced-motion (qua CSS).
const Celebrate = (() => {
  const REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TIER_NAME = { 1: 'Trứng', 2: 'Bé con', 3: 'Trẻ con', 4: 'Trưởng thành' };
  let active = null;

  function mount(cls, inner, duration) {
    if (active) close(active);
    const o = document.createElement('div');
    o.className = 'cb-overlay ' + cls;
    o.setAttribute('aria-live', 'polite');
    o.innerHTML = inner + '<div class="cb-skip">Chạm để bỏ qua</div>';
    document.body.appendChild(o);
    requestAnimationFrame(() => o.classList.add('show'));
    const t = setTimeout(() => close(o), REDUCE ? Math.min(duration, 2200) : duration);
    o.addEventListener('click', () => close(o));
    o._t = t; active = o;
    return o;
  }
  function close(o) {
    if (!o || o._closing) return; o._closing = true;
    clearTimeout(o._t);
    o.classList.remove('show');
    setTimeout(() => o.remove(), 300);
    if (active === o) active = null;
  }

  // pet SVG cho streak/evolve (fetch + cache) — cần thư mục /assets/img/pet/
  const petCache = {};
  function petInto(elId, tier, mood) {
    const key = tier + '-' + mood;
    (petCache[key] || (petCache[key] = fetch(`/assets/img/pet/pet-tier${tier}-${mood}.svg`).then(r => r.ok ? r.text() : '')))
      .then(svg => { const el = document.getElementById(elId); if (el && svg) el.innerHTML = svg; });
  }

  function show(scene, opts = {}) {
    if (scene === 'firework-perfect') {
      mount('cb-fire',
        `<div class="cb-fw a"></div><div class="cb-fw b"></div><div class="cb-fw c"></div><div class="cb-fw d"></div>
         <div class="cb-perfect">100% HOÀN HẢO!</div>
         <div class="cb-sub">Bạn làm đúng tất cả 🎉</div>`, 2500);

    } else if (scene === 'streak-milestone') {
      const days = opts.days || 7;
      const petId = 'cb-streak-pet-' + Date.now();
      mount('cb-streak',
        `<div class="cb-flame"></div>
         <div class="cb-pet" id="${petId}">🔥</div>
         <div class="cb-streak-num">${days}</div>
         <div class="cb-streak-txt">Chuỗi ${days} ngày liên tiếp! 🔥</div>`, 3000);
      // nếu có pet (tiểu học) thì thay 🔥 bằng pet celebrate (inline ưu tiên, else fetch)
      if (opts.petSvg) { const el = document.getElementById(petId); if (el) el.innerHTML = opts.petSvg; }
      else if (opts.petTier) petInto(petId, opts.petTier, 'celebrate');

    } else if (scene === 'sticker-legendary') {
      const s = opts.sticker || {};
      const svg = opts.svg || (s.key ? '' : '');
      const o = mount('cb-leg',
        `<div class="cb-burst"></div>
         <div class="cb-stk" id="cb-stk-art">${svg}</div>
         <div class="cb-stk-name">${s.name || 'Sticker huyền thoại'}</div>
         <div class="cb-stk-tier">★ Huyền thoại — ${s.hint || ''}</div>`, 2200);
      if (!svg && s.key) {
        fetch(`/assets/img/stickers/sticker-${s.key}.svg`).then(r => r.ok ? r.text() : '')
          .then(t => { const el = o.querySelector('#cb-stk-art'); if (el && t) el.innerHTML = t; });
      }

    } else if (scene === 'pet-evolve') {
      // dùng lại .evo-* (evolution-scene.css). Cần pet SVG.
      const from = opts.fromTier || 1, to = opts.toTier || (from + 1);
      const oldId = 'cb-evo-old', newId = 'cb-evo-new';
      const o = mount('evo-overlay',
        `<div class="evo-stage"><div class="evo-rays"></div>
           <div class="evo-pet old" id="${oldId}"></div><div class="evo-flash"></div>
           <div class="evo-pet new" id="${newId}"></div></div>
         <div class="evo-caption"><div class="small">Bạn cưng của bé đã lớn lên!</div>
           <div class="big">Giờ là <b>${TIER_NAME[to] || ''}</b> 🎉</div></div>
         <button class="evo-btn">Tuyệt vời! →</button>`, 5000);
      o.classList.remove('cb-overlay'); o.classList.add('play'); // evo dùng .play để chạy timeline
      if (opts.oldSvg || opts.newSvg) { // inline (preview / app tự truyền)
        if (opts.oldSvg) document.getElementById(oldId).innerHTML = opts.oldSvg;
        if (opts.newSvg) document.getElementById(newId).innerHTML = opts.newSvg;
      } else { petInto(oldId, from, 'happy'); petInto(newId, to, 'celebrate'); }
    }
  }

  return { show, close: () => active && close(active) };
})();
if (typeof window !== 'undefined') window.Celebrate = Celebrate;
