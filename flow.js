/* ==========================================================
   flow.js —— 看图的节奏（主页与每一卷共用）

   1. NOTES  每张图的说明：图片还在下方、来到最佳位置时，说明压在图上
             （白字，只有编号与标题）；图片继续往上走，说明落到图下，
             补出日期与参数。屏幕外的图一律是「落在图下」的成品状态，
             所以长截图、打印永远完整。
   2. FLOAT  [data-float] 压在图上的标题随滚动略慢于图片，像浮在图上。
   3. ZOOM   图片离最佳位置越近越大：从它所在的一侧（偏左的从左下角、偏右的从右下角）长出来，
             里面的照片同时轻轻退远一点。屏幕外、长截图里都是原大。
   4. TALE   图的故事（.tale）随图片滑过一个字一个字出来；往回滑，又一个字一个字收回去。
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

  /* ── 3. zoom ──────────────────────────────────────────────────── */
  function zoom() {
    const vh = innerHeight;
    for (const p of plates) {
      const r = p.body.getBoundingClientRect();
      let zs = 1, zi = 1;
      if (!still() && r.bottom > -vh * .5 && r.top < vh * 1.5) {
        const d = (r.top + r.height / 2 - vh / 2) / vh;          // 0 = centred on screen
        const e = smooth(clamp(1 - Math.abs(d) / .85));
        zs = .9 + .1 * e; zi = 1.14 - .14 * e;
      }
      if (Math.abs(zs - (p.zs ?? -1)) < .0008) continue;
      p.zs = zs;
      p.el.style.setProperty('--zs', zs.toFixed(4));
      p.el.style.setProperty('--zi', zi.toFixed(4));
    }
  }

  /* ── 4. tales ─────────────────────────────────────────────────── */
  const tales = $$('.tale').map(el => {
    const host = el.closest('.plate') || el.previousElementSibling;
    return { el, body: host && host.querySelector('.plate__body'), float: el.classList.contains('tale--float'), sp: -1 };
  }).filter(t => t.body);
  function tell() {
    const vh = innerHeight;
    for (const t of tales) {
      const r = t.body.getBoundingClientRect();
      let sp = 1;
      if (!still() && r.top < vh * 1.05 && r.bottom > 0) {
        const readTop = r.height < vh * .9 ? (vh - r.height) / 2 : vh * .06;
        sp = t.float ? smooth(clamp((readTop - r.top + vh * .32) / (vh * .45)))     // on the picture: as it arrives
                     : smooth(clamp((readTop - r.top + vh * .12) / (vh * .42)));    // beside / below: once it has been seen
      }
      if (Math.abs(sp - t.sp) < .002) continue;
      t.sp = sp;
      t.el.style.setProperty('--sp', sp.toFixed(3));
    }
  }

  /* ── loop ─────────────────────────────────────────────────────── */
  let ticking = false;
  const frame = () => { ticking = false; notes(); float(); zoom(); tell(); };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener('resize', () => { plates.forEach(p => { p.ink = parseColor(getComputedStyle(p.el).getPropertyValue('--ink')); p.cp = -1; p.zs = -1; }); tales.forEach(t => t.sp = -1); frame(); });
  captureMQ.addEventListener('change', () => { plates.forEach(p => p.zs = -1); tales.forEach(t => t.sp = -1); frame(); });
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
