/* ==========================================================
   flow.js —— 看图的节奏（主页与每一卷共用）

   1. NOTES  每张图的说明：图片还在下方、来到最佳位置时，说明压在图上
             （白字，只有编号与标题）；图片继续往上走，说明落到图下，
             补出日期与参数。屏幕外的图一律是「落在图下」的成品状态，
             所以长截图、打印永远完整。
   2. PAUSE  [data-rest] 是每一段的最佳观看位置。滚轮或触控板经过时，
             页面会在这里「卡」一下：滑到位、停约三分之一秒，再继续。
             手指滑动时由浏览器吸附（仅在手指操作期间开启）。
             停下后若离某个位置很近，也会轻轻对齐。
             只响应你自己的操作 —— 截图工具的程序滚动不受影响。
   3. FLOAT  [data-float] 压在图上的标题随滚动略慢于图片，像浮在图上。
   ========================================================== */
(() => {
  const root = document.documentElement;
  const forced = new URLSearchParams(location.search).has('motion');
  const reduce = !forced && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const captureMQ = matchMedia('(max-aspect-ratio: 1/3)');
  const still = () => reduce || captureMQ.matches;
  root.classList.add('js');

  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = t => t * t * (3 - 2 * t);
  const parseColor = s => {
    s = (s || '').trim();
    if (s.startsWith('#')) { const h = s.length === 4 ? s.slice(1).split('').map(c => c + c).join('') : s.slice(1); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
    return (s.match(/[\d.]+/g) || [35, 35, 38]).slice(0, 3).map(Number);
  };

  /* ── 1. notes ─────────────────────────────────────────────────── */
  const plates = $$('.plate').map(el => ({ el, body: el.querySelector('.plate__body'), t: el.querySelector('.note__t'), cp: -1, ink: parseColor(getComputedStyle(el).getPropertyValue('--ink')) }));
  function notes() {
    const vh = innerHeight;
    for (const p of plates) {
      const r = p.body.getBoundingClientRect();
      let cp = 1;
      if (!still() && r.bottom > 0 && r.top < vh + 48) {
        const readTop = r.height < vh * 0.9 ? (vh - r.height) / 2 : vh * 0.06;
        cp = smooth(clamp((readTop - r.top) / (vh * 0.3)));      // on the photo until it has been seen, then it settles below
      }
      if (Math.abs(cp - p.cp) < 0.002) continue;
      p.cp = cp;
      p.el.style.setProperty('--cp', cp.toFixed(3));
      const c = p.ink.map(v => Math.round(255 + (v - 255) * cp));
      p.t.style.color = `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }

  /* ── 3. float ─────────────────────────────────────────────────── */
  // the text lags a little behind its image as the image scrolls past — never more than `max` px
  const floats = $$('[data-float]').map(el => ({ el, k: parseFloat(el.dataset.float) || .2, max: parseFloat(el.dataset.floatMax) || 36, host: el.closest('section, header, figure, a') || el.parentElement }));
  function float() {
    for (const f of floats) {
      const r = f.host.getBoundingClientRect();
      const vh = innerHeight;
      const readTop = Math.min((vh - r.height) / 2, 0) ;
      const off = still() || r.bottom < 0 || r.top > vh ? 0 : Math.min(f.max, Math.max(0, readTop - r.top) * f.k);
      f.el.style.transform = off ? `translate3d(0, ${off.toFixed(1)}px, 0)` : '';
    }
  }

  /* ── 2. pause ─────────────────────────────────────────────────── */
  const rests = $$('[data-rest]');
  const barH = () => parseFloat(getComputedStyle(root).getPropertyValue('--bar')) || 52;
  const maxY = () => root.scrollHeight - innerHeight;
  function stopOf(el) {
    const r = el.getBoundingClientRect(), vh = innerHeight;
    const t = el.dataset.rest === 'top' || r.height > vh * 0.9
      ? scrollY + r.top - (el.dataset.rest === 'top' ? 0 : barH() * .5)
      : scrollY + r.top + r.height / 2 - vh / 2;
    return Math.round(clamp(t, 0, maxY()));
  }

  let anim = 0, holdUntil = 0, lastStop = null, lastInput = 0;
  function glide(to, dur, done) {
    cancelAnimationFrame(anim);
    const from = scrollY, t0 = performance.now();
    const step = now => {
      const k = clamp((now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      scrollTo(0, from + (to - from) * e);
      if (k < 1) anim = requestAnimationFrame(step); else { anim = 0; done && done(); }
    };
    anim = requestAnimationFrame(step);
  }

  // wheel & trackpad: if this step would carry the page past a viewing position, stop there for a beat
  addEventListener('wheel', e => {
    lastInput = performance.now();
    if (still() || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (anim || performance.now() < holdUntil) { e.preventDefault(); return; }   // gliding into, or resting at, a stop
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    const y = scrollY;
    if (lastStop !== null && Math.abs(y - lastStop) > innerHeight * 0.25) lastStop = null;
    let best = null;
    for (const el of rests) {
      const t = stopOf(el), d = t - y;
      if (t === lastStop || Math.abs(d) < 2 || Math.sign(d) !== Math.sign(dy)) continue;
      if (Math.abs(d) <= Math.abs(dy) + 4 && (best === null || Math.abs(d) < Math.abs(best - y))) best = t;
    }
    if (best === null) return;
    e.preventDefault();
    lastStop = best;
    glide(best, 240, () => { holdUntil = performance.now() + 360; });
  }, { passive: false });

  // touch: let the browser snap, only while a finger is moving the page
  let snapOff = 0;
  addEventListener('touchstart', () => { lastInput = performance.now(); if (!still()) { clearTimeout(snapOff); root.classList.add('snap'); } }, { passive: true });
  addEventListener('touchend', () => { lastInput = performance.now(); clearTimeout(snapOff); snapOff = setTimeout(() => root.classList.remove('snap'), 1600); }, { passive: true });
  ['keydown', 'pointerdown'].forEach(t => addEventListener(t, () => { lastInput = performance.now(); if (anim) { cancelAnimationFrame(anim); anim = 0; } }, { passive: true }));

  // after the reader stops close to a viewing position, ease the last few centimetres
  let settleT = 0;
  function settle() {
    if (still() || anim || performance.now() - lastInput > 1200 || root.classList.contains('snap')) return;
    const y = scrollY, vh = innerHeight;
    let best = null;
    for (const el of rests) { const t = stopOf(el); if (best === null || Math.abs(t - y) < Math.abs(best - y)) best = t; }
    if (best === null) return;
    const d = Math.abs(best - y);
    if (d > 3 && d < vh * 0.12) { lastStop = best; glide(best, 380 + d); }
  }

  /* ── loop ─────────────────────────────────────────────────────── */
  let ticking = false;
  const frame = () => { ticking = false; notes(); float(); };
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    clearTimeout(settleT); if (!anim) settleT = setTimeout(settle, 180);
  }, { passive: true });
  addEventListener('resize', () => { plates.forEach(p => { p.ink = parseColor(getComputedStyle(p.el).getPropertyValue('--ink')); p.cp = -1; }); frame(); });
  captureMQ.addEventListener('change', frame);
  frame();

  /* fetch every remaining image once the first screen is in, so a long screenshot has them all */
  addEventListener('load', () => {
    const lazy = $$('img[loading="lazy"]');
    const next = () => {
      const img = lazy.shift(); if (!img) return;
      img.loading = 'eager';
      if (img.complete) next(); else { img.addEventListener('load', next, { once: true }); img.addEventListener('error', next, { once: true }); }
    };
    (window.requestIdleCallback || (f => setTimeout(f, 300)))(next);
  });

  window.__flow = { plates, rests, stopOf };
})();
