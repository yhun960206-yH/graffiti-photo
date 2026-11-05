/* ==========================================================
   flow.js —— 看图的节奏（主页与每一卷共用）

   1. NOTES  每张图的说明：图片还在下方、来到最佳位置时，说明压在图上
             （白字，只有编号与标题）；图片继续往上走，说明落到图下，
             补出日期与参数。屏幕外的图一律是「落在图下」的成品状态，
             所以长截图、打印永远完整。
   2. FLOAT  [data-float] 压在图上的标题随滚动略慢于图片，像浮在图上。
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

  /* ── 2. float ─────────────────────────────────────────────────── */
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

  /* ── loop ─────────────────────────────────────────────────────── */
  let ticking = false;
  const frame = () => { ticking = false; notes(); float(); };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
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

  window.__flow = { plates };
})();
