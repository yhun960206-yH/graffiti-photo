/* ==========================================================
   flow.js —— 看图的节奏（主页与每一卷共用）

   1. NOTES  每张图的说明：图片还在下方、来到最佳位置时，说明压在图上
             （白字，只有编号与标题）；图片继续往上走，说明落到图下，
             补出日期与参数。屏幕外的图一律是「落在图下」的成品状态，
             所以长截图、打印永远完整。
   3. ZOOM   图片离最佳位置越近越大：从它所在的一侧（偏左的从左下角、偏右的从右下角）长出来，
             里面的照片同时轻轻退远一点。屏幕外、长截图里都是原大。
   4. TALE   图的故事（.tale）随图片滑过一个字一个字出来；往回滑，又一个字一个字收回去。
   6. LIGHT  页面背景是「被照片透过的光照着的纸」：每张图那一段的纸是它投下的颜色，图与图之间慢慢过渡。
             整页是一条预先算好的渐变（尺寸变了才重算），滚动时不用做任何事；顶栏跟着当前位置的颜色。
   5. DEPTH  层次全靠滚动时的速度差：图片与页面同速（基准）；背景插画比它快（在后，decor.js）；
             文字比它慢（在前）——图注稍慢，正文、故事更慢，大标题最慢。
             每个字块在屏幕正中时回到原位，所以静止阅读时版式不变；长截图里一律原位。
   ========================================================== */
(() => {
  const root = document.documentElement;
  // motion is part of the book: kept even when the system asks for less (add ?still to see it at rest)
  const reduce = new URLSearchParams(location.search).has('still');
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

  /* ── performance ────────────────────────────────────────────────
     every position is measured once (and again only when the page changes size); while scrolling
     the loop does arithmetic on those numbers and writes styles — it never asks the browser for a
     layout, and it only touches what is near the screen. */
  let Y = scrollY, VH = innerHeight;
  const near = (top, h, before = 1.5, after = .6) => top < VH * before && top + h > -VH * after;

  /* ── 1. notes ─────────────────────────────────────────────────── */
  const plates = $$('.plate').map(el => ({
    el, body: el.querySelector('.plate__body'), note: el.querySelector('.note'), t: el.querySelector('.note__t'),
    frame: el.querySelector('.plate__frame'), img: el.querySelector('.plate__frame img'),
    flat: !!el.closest('.row, .sp--emaki'),                        // panels that touch: only the picture inside breathes
    top: 0, h: 0, cp: -1, zs: -1, live: false, ink: [35, 35, 38],
  }));
  function notes() {
    for (const p of plates) {
      const top = p.top - Y;
      let cp = 1;
      if (!still() && top + p.h > 0 && top < VH + 48) {
        const readTop = p.h < VH * .9 ? (VH - p.h) / 2 : VH * .06;
        cp = smooth(clamp((readTop - top) / (VH * .3)));            // on the photo until it has been seen, then it settles below
      }
      cp = Math.round(cp * 40) / 40;
      if (cp === p.cp) continue;
      p.cp = cp;
      p.body.style.setProperty('--cp', cp.toFixed(3));
      const c = p.ink.map(v => Math.round(255 + (v - 255) * cp));
      p.t.style.color = `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }

  /* ── 3. zoom ──────────────────────────────────────────────────── */
  function zoom() {
    for (const p of plates) {
      const top = p.top - Y;
      const live = !still() && near(top, p.h, 1.5, .5);
      let zs = 1, zi = 1;
      if (live) {
        const d = (top + p.h / 2 - VH / 2) / VH;                    // 0 = centred on screen
        const e = smooth(clamp(1 - Math.abs(d) / .85));
        zs = .9 + .1 * e; zi = 1.14 - .14 * e;
      }
      if (live !== p.live) { p.live = live; p.el.classList.toggle('is-live', live); }   // a GPU layer only while it moves
      if (Math.abs(zs - p.zs) < .0008) continue;
      p.zs = zs;
      if (p.frame && !p.flat) p.frame.style.transform = zs === 1 ? '' : `scale(${zs.toFixed(4)})`;
      if (p.img) p.img.style.transform = zi === 1 ? '' : `scale(${zi.toFixed(4)})`;
    }
  }

  /* ── 4. tales ─────────────────────────────────────────────────── */
  const tales = $$('.tale').map(el => {
    const host = el.closest('.plate') || el.previousElementSibling;
    return { el, p: plates.find(p => p.el === host), float: el.classList.contains('tale--float'), sp: -1 };
  }).filter(t => t.p);
  function tell() {
    for (const t of tales) {
      const top = t.p.top - Y, h = t.p.h;
      let sp = 1;
      if (!still() && top < VH * 1.05 && top + h > 0) {
        const readTop = h < VH * .9 ? (VH - h) / 2 : VH * .06;
        sp = t.float ? smooth(clamp((readTop - top + VH * .32) / (VH * .45)))     // on the picture: as it arrives
                     : smooth(clamp((readTop - top + VH * .12) / (VH * .42)));    // beside / below: once it has been seen
      }
      sp = Math.round(sp * 24) / 24;                                   // a few steps; CSS transitions fill between them
      if (sp === t.sp) continue;
      t.sp = sp;
      t.el.style.setProperty('--sp', sp.toFixed(3));
    }
  }

  /* ── 5. depth: the words are the front layer, so they move slowest ───────────────
     speed f < 1: an element whose centre is at page position c sits  (c − mid) × (f − 1)  from its place,
     mid being the page position at the middle of the screen — zero when it is centred. */
  const LAYERS = [
    ['.note', .9, 30],                                                  // a caption keeps close to its picture
    ['.tale', .84, 64],
    ['.vi__text p, .vi__meta, .vend > *, .about > *, .close > *, .cv__lede, .cv__meta, .cv__no', .86, 70],
    ['.hx__top, .hx__t, .hx__dir', .88, 48],
    ['.cv__t', .78, 90],                                                // the title, frontmost
  ];
  const words = [];
  for (const [sel, f, max] of LAYERS) for (const el of $$(sel)) {
    if (words.some(w => w.el === el || w.el.contains(el))) continue;
    el.removeAttribute('data-float');
    words.push({ el, f, max, off: 0, top: 0, h: 0 });
  }
  function depth() {
    const calm = still();
    for (const w of words) {
      const top = w.top - Y;
      let off = 0;
      if (!calm && near(top, w.h, 1.6, .6)) off = Math.max(-w.max, Math.min(w.max, (top + w.h / 2 - VH / 2) * (w.f - 1)));
      off = Math.round(off * 2) / 2;
      if (off === w.off) continue;
      w.off = off;
      w.el.style.translate = off ? `0 ${off.toFixed(1)}px` : '';
    }
  }

  /* ── 6. light: the paper, lit by whatever picture is above it ──── */
  const bar = document.querySelector('.bar'), meta = document.querySelector('meta[name="theme-color"]');
  let stops = [];                                                       // [pagePos, [r,g,b]]
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  function paint() {
    const lit = plates.filter(p => p.el.dataset.light);
    if (!lit.length) return;
    stops = [];
    let last = -1e9;
    for (const p of lit) {                                              // side by side → the first one speaks for the row
      if (p.top - last < 60) continue;
      last = p.top;
      const c = rgb(p.el.dataset.light), hold = p.h * .25;
      stops.push([p.top + hold, c], [p.top + p.h - hold, c]);           // held while the picture is there, blending between
    }
    const H = document.documentElement.scrollHeight;
    stops.unshift([0, stops[0][1]]); stops.push([H, stops[stops.length - 1][1]]);
    const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;
    document.body.style.backgroundImage = `linear-gradient(to bottom, ${stops.map(([y, c]) => `${css(c)} ${Math.round(y)}px`).join(', ')})`;
    document.body.style.backgroundSize = `100% ${H}px`;
    document.body.style.backgroundRepeat = 'no-repeat';
    barTint = '';
  }
  let barTint = '';
  function tint() {
    if (!stops.length || !bar) return;
    const y = Y + 30;
    let i = 1; while (i < stops.length - 1 && stops[i][0] < y) i++;
    const [y0, a] = stops[i - 1], [y1, b] = stops[i];
    const t = y1 > y0 ? clamp((y - y0) / (y1 - y0)) : 0;
    const c = a.map((v, k) => Math.round(v + (b[k] - v) * t));
    const key = c.join(',');
    if (key === barTint) return;
    barTint = key;
    bar.style.backgroundColor = `rgba(${key},.97)`;
    if (meta) meta.content = '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  }

  /* ── measuring (only when the page changes size) ──────────────── */
  function measure() {
    VH = innerHeight; Y = scrollY;
    for (const w of words) if (w.off) w.el.style.translate = '';       // measure the words where they really sit
    for (const p of plates) { const r = p.body.getBoundingClientRect(); p.top = r.top + Y; p.h = r.height; p.cp = p.zs = -1; }
    // the corner follows the picture: about 1.8% of its shorter side (a small panel ~2px, a big print ~10px)
    for (const p of plates) if (p.frame) {
      const s = Math.min(p.frame.offsetWidth, p.frame.offsetHeight);
      if (s) p.frame.style.setProperty('--rs', Math.round(Math.min(10, Math.max(2, s * .018))) + 'px');
    }
    for (const w of words) { const r = w.el.getBoundingClientRect(); w.top = r.top + Y; w.h = r.height; w.off = 0; }
    tales.forEach(t => t.sp = -1);
    plates.forEach(p => p.ink = parseColor(getComputedStyle(p.el).getPropertyValue('--ink')));
    paint();
    window.__flow.measured = Date.now();
  }

  /* ── 6. pictures: full size only while the page is at rest ────────
     scrolling comes first. While the reader scrolls nothing new is fetched or decoded; once the page
     has been still for a moment, the pictures near the screen are fetched in full, decoded off to the
     side, and swapped in one by one — and the swapping stops again the moment scrolling resumes. */
  let lastScroll = 0, upgrading = false;
  const scrolling = () => performance.now() - lastScroll < 220;
  function upgrade() {
    if (upgrading) return;
    const next = plates.find(p => p.img && p.img.dataset.full && !p.full && near(p.top - scrollY, p.h, 1.8, .8));
    if (!next) return;
    upgrading = true;
    const big = new Image(); big.src = next.img.dataset.full;
    const swap = () => {
      if (scrolling()) { setTimeout(swap, 240); return; }
      next.img.src = big.src; next.full = true; upgrading = false;
      setTimeout(() => { if (!scrolling()) upgrade(); }, 60);
    };
    (big.decode ? big.decode() : Promise.resolve()).then(swap, () => { next.full = true; upgrading = false; });
  }
  let restT = 0;
  addEventListener('scroll', () => { lastScroll = performance.now(); clearTimeout(restT); restT = setTimeout(upgrade, 260); }, { passive: true });
  addEventListener('load', () => setTimeout(upgrade, 300), { once: true });

  /* ── loop ─────────────────────────────────────────────────────── */
  let ticking = false, dirty = true;
  const frame = () => {
    ticking = false;
    if (dirty) { dirty = false; measure(); }
    Y = scrollY;
    notes(); zoom(); tell(); depth(); tint();
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  const remeasure = () => { dirty = true; request(); };
  window.__flow = { plates, remeasure, measured: 0 };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', remeasure);
  addEventListener('load', remeasure);
  document.fonts && document.fonts.ready.then(remeasure);
  new ResizeObserver(remeasure).observe(document.body);
  captureMQ.addEventListener('change', remeasure);
  frame();

  /* a long screenshot or a print needs every picture: fetch the rest then (only then — on a phone
     fetching all 78 big pictures in the background would make scrolling stutter) */
  const fetchAll = () => {
    const lazy = $$('img[loading="lazy"]');
    const next = () => {
      const img = lazy.shift(); if (!img) return;
      if (img.dataset.full) { img.src = img.dataset.full; delete img.dataset.full; }
      img.loading = 'eager';
      if (img.complete) next(); else { img.addEventListener('load', next, { once: true }); img.addEventListener('error', next, { once: true }); }
    };
    next();
  };
  const printMQ = matchMedia('print');
  if (captureMQ.matches) addEventListener('load', fetchAll, { once: true });
  captureMQ.addEventListener('change', e => e.matches && fetchAll());
  printMQ.addEventListener('change', e => e.matches && fetchAll());
  addEventListener('beforeprint', fetchAll);
})();
