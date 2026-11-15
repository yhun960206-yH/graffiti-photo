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

  /* ── performance ────────────────────────────────────────────────
     every position is measured once (and again only when the page changes size); while scrolling
     the loop does arithmetic on those numbers and writes styles — it never asks the browser for a
     layout, and it only touches what is near the screen.
     VH is locked to the stable viewport height (updated only when viewport width changes),
     so mobile address-bar collapse/expand while scrolling never causes layout or scale jumps. */
  let Y = scrollY, VH = innerHeight, VW = innerWidth;
  const near = (top, h, before = 1.5, after = .6) => top < VH * before && top + h > -VH * after;
  // where a picture's top sits when it is best seen: the picture and the caption under it centred together
  // (a picture too tall for that sits just under the top bar). Everything about it is finished by then.
  const CAP = 52;
  const readAt = h => h + CAP < VH * .9 ? Math.max(VH * .1, (VH - h - CAP) * (VW < 768 ? .42 : .48)) : VH * .07;

  /* ── 1. notes ─────────────────────────────────────────────────── */
  const TILT_ANGLES = [-2.6, 2.2, -1.8, 2.8, -2.3, 1.9, -2.5, 2.1];
  const plates = $$('.plate').map((el, idx) => ({
    el, idx, sp: el.closest('.sp'),
    body: el.querySelector('.plate__body'), note: el.querySelector('.note'), t: el.querySelector('.note__t'),
    frame: el.querySelector('.plate__frame'), img: el.querySelector('.plate__frame img'),
    tiltMax: TILT_ANGLES[idx % TILT_ANGLES.length],
    top: 0, h: 0, stickY: 88, cp: -1, zs: -1, tilt: 0, tx: 0, ty: 0, dim: 0, noteA: 1, cardA: 1, buried: false, live: false,
  }));
  // give every plate an incrementing z-index so every subsequent photo cleanly stacks above the previous one
  plates.forEach((p, i) => { p.el.style.zIndex = String(i + 2); });
  function notes() {
    for (const p of plates) {
      const top = p.top - Y;
      let cp = 1;
      if (!still() && top + p.h > 0 && top < VH + 48) {
        // on the photo while it comes up the screen; settled below, with date and settings, by the time it reaches its stack spot
        cp = smooth(clamp((p.stickY + VH * .34 - top) / (VH * .32)));
      }
      cp = Math.round(cp * 40) / 40;
      if (cp === p.cp) continue;
      p.cp = cp;
      p.body.style.setProperty('--cp', cp.toFixed(3));
    }
  }

  /* ── 3. zoom & unified sticky card stacking (landscape + portrait in one pile with paper tilt) ─── */
  function zoom() {
    for (let i = 0; i < plates.length; i++) {
      const p = plates[i];
      const top = p.top - Y;
      const nxt = plates[i + 1] || null;
      const nxt2 = plates[i + 2] || null;
      const nxt3 = plates[i + 3] || null;
      // release GPU layers for cards already buried 3+ layers deep so 25-photo pages never bloat memory or poke out behind landscape/portrait swaps
      let fadeOut = 0;
      if (!still() && nxt3) {
        const n3Top = nxt3.top - Y;
        const start3 = Math.max(nxt2.stickY + nxt2.h * .75, VH * .72);
        fadeOut = smooth(clamp((start3 - n3Top) / Math.max(120, start3 - nxt3.stickY)));
      }
      const buried = !still() && fadeOut >= .99;
      if (buried !== p.buried) {
        p.buried = buried;
        p.el.style.visibility = buried ? 'hidden' : '';
        p.el.style.pointerEvents = buried ? 'none' : '';
      }
      if (buried) continue;

      let overlap = 0;
      if (!still() && nxt) {
        const nTop = nxt.top - Y;
        const startAt = Math.max(p.stickY + p.h * .85, VH * .78);
        const endAt = nxt.stickY;
        overlap = clamp((startAt - nTop) / Math.max(140, startAt - endAt));
      }
      const live = !still() && (near(top, p.h, 1.5, .8) || overlap > 0);
      let zs = 1, zi = 1, tilt = 0, tx = 0, ty = 0, dim = 0, noteA = 1;
      if (live) {
        const d = (top - p.stickY) / VH;                            // >0 while rising toward its sticky spot, <=0 once docked
        const e = smooth(clamp(1 - Math.max(0, d) / .75));
        zs = .93 + .07 * e; zi = 1.08 - .08 * e;
        if (d > 0) {
          const enter = smooth(clamp(d / .7));
          tilt = -p.tiltMax * .45 * enter + p.tiltMax * .28 * (1 - enter);
        } else {
          tilt = p.tiltMax * .28;
        }
      }
      if (overlap > 0) {
        const se = smooth(overlap);
        // depth of the pile: also step back slightly more as i+2 arrives on top
        let extra = 0;
        if (nxt2) {
          const o2 = clamp(((nxt.stickY + nxt.h * .75) - (nxt2.top - Y)) / Math.max(140, nxt.h));
          extra = smooth(o2);
        }
        zs *= (1 - .065 * se - .04 * extra);
        tilt = p.tiltMax * (.28 + .85 * se + .35 * extra);
        tx = (p.tiltMax > 0 ? 1 : -1) * (4 * se + 2.5 * extra);
        ty = -10 * se - 6 * extra;
        dim = Math.round(clamp(se * .34 + extra * .18, 0, .58) * 40) / 40;
        noteA = Math.round(clamp(1 - overlap * 2.2, 0, 1) * 20) / 20;
      }
      const cardA = Math.round((1 - fadeOut) * 20) / 20;
      if (cardA !== p.cardA) {
        p.cardA = cardA;
        p.el.style.opacity = cardA < 1 ? cardA.toFixed(2) : '';
      }
      tilt = Math.round(tilt * 20) / 20;
      tx = Math.round(tx * 2) / 2;
      ty = Math.round(ty * 2) / 2;
      if (live !== p.live) { p.live = live; p.el.classList.toggle('is-live', live); }
      if (dim !== p.dim && p.frame) {
        p.dim = dim;
        p.frame.style.setProperty('--dim', dim ? dim.toFixed(3) : '0');
        p.body.style.setProperty('--glow-a', Math.max(0, 1 - dim * 1.8).toFixed(2));
      }
      if (noteA !== p.noteA) {
        p.noteA = noteA;
        p.body.style.setProperty('--note-a', String(noteA));
      }
      if (Math.abs(zs - p.zs) < .001 && Math.abs(tilt - p.tilt) < .04 && Math.abs(tx - p.tx) < .4 && Math.abs(ty - p.ty) < .4) continue;
      p.zs = zs; p.tilt = tilt; p.tx = tx; p.ty = ty;
      if (p.frame) {
        p.frame.style.transform = (zs === 1 && tilt === 0 && tx === 0 && ty === 0)
          ? ''
          : `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale3d(${zs.toFixed(4)}, ${zs.toFixed(4)}, 1) rotate3d(0, 0, 1, ${tilt.toFixed(2)}deg)`;
      }
      if (p.img) p.img.style.transform = zi === 1 ? '' : `scale3d(${zi.toFixed(4)}, ${zi.toFixed(4)}, 1)`;
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
      if (!still() && top < VH * 1.2 && top + h > 0) {
        const at = readAt(h);
        sp = t.float ? smooth(clamp((at + VH * .5 - top) / (VH * .42)))           // on the picture: as it arrives
                     : smooth(clamp((at + VH * .34 - top) / (VH * .32)));         // beside / below: right after the caption, done at the centre
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
    ['.vi__text p, .vi__date, .vi__meta, .vend > *, .about > *, .close > *, .cv__lede, .cv__meta, .cv__no', .86, 70],
    ['.hx__top, .hx__t, .hx__dir', .88, 48],
    ['.cv__t', .78, 90],                                                // the title, frontmost
  ];
  const words = [];
  for (const [sel, f, max] of LAYERS) for (const el of $$(sel)) {
    if (words.some(w => w.el === el || w.el.contains(el))) continue;
    el.removeAttribute('data-float');
    words.push({ el, f, max, off: 0, top: 0, h: 0 });
  }
  // a caption or story drifts only while it is still arriving: once settled it sits exactly in place
  for (const w of words) {
    const p = plates.find(p => p.note === w.el), t = tales.find(t => t.el === w.el);
    if (p) w.k = () => 1 - Math.max(0, p.cp);
    else if (t) w.k = () => 1 - Math.max(0, t.sp);
  }
  function depth() {
    const calm = still();
    for (const w of words) {
      const top = w.top - Y;
      let off = 0;
      if (!calm && near(top, w.h, 1.6, .6)) off = Math.max(-w.max, Math.min(w.max, (top + w.h / 2 - VH / 2) * (w.f - 1))) * (w.k ? w.k() : 1);
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
      const c = rgb(p.el.dataset.light), hold = p.h * .4;              // held only round its middle: long, soft blends
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
  let barTint = '', metaHex = '';
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
    if (meta && !scrolling()) {
      const hex = '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
      if (hex !== metaHex) { metaHex = hex; meta.content = hex; }
    }
  }

  /* ── measuring (only when the page changes size) ──────────────── */
  let lastH = 0;
  function measure() {
    if (innerWidth !== VW || !VH) { VW = innerWidth; VH = innerHeight; }
    Y = scrollY;
    root.classList.add('is-measuring');
    lastH = document.documentElement.scrollHeight;
    for (const w of words) if (w.off) w.el.style.translate = '';       // measure the words where they really sit
    for (const p of plates) {
      const r = p.body.getBoundingClientRect();
      p.top = r.top + Y; p.h = r.height; p.cp = p.zs = -1; p.tilt = 99;
      // centre each photo (whether horizontal or vertical) on the same optical pile axis so all cards overlap in one stack
      const targetCenter = VW < 768 ? VH * .45 : VH * .49;
      p.stickY = Math.round(clamp(targetCenter - p.h / 2, 58, VH * .32));
      p.el.style.setProperty('--stack-top', p.stickY + 'px');
    }
    // the corner follows the picture: about 1.8% of its shorter side (a small panel ~2px, a big print ~10px)
    for (const p of plates) if (p.frame) {
      const s = Math.min(p.frame.offsetWidth, p.frame.offsetHeight);
      if (s) p.frame.style.setProperty('--rs', Math.round(Math.min(10, Math.max(2, s * .018))) + 'px');
    }
    for (const w of words) { const r = w.el.getBoundingClientRect(); w.top = r.top + Y; w.h = r.height; w.off = 0; }
    tales.forEach(t => t.sp = -1);
    root.classList.remove('is-measuring');
    paint();
    window.__flow.measured = Date.now();
  }

  /* ── 6. pictures: full size only while the page is at rest ────────
     scrolling comes first. While the reader scrolls nothing new is fetched or decoded; once the page
     has been still for a moment, the pictures near the screen are fetched in full, decoded off to the
     side, and swapped in one by one — and the swapping stops again the moment scrolling resumes. */
  let lastScroll = performance.now(), upgrading = false;
  const scrolling = () => performance.now() - lastScroll < 380;
  function upgrade() {
    if (upgrading || VW < 768) return;
    const next = plates.find(p => p.img && p.img.dataset.full && !p.full && near(p.top - scrollY, p.h, 1.4, .5));
    if (!next) return;
    upgrading = true;
    const big = new Image(); big.decoding = 'async'; big.src = next.img.dataset.full;
    const swap = () => {
      if (scrolling()) { setTimeout(swap, 400); return; }
      next.img.src = big.src; next.full = true; upgrading = false;
      setTimeout(() => { if (!scrolling()) upgrade(); }, 180);
    };
    (big.decode ? big.decode() : Promise.resolve()).then(swap, () => { next.full = true; upgrading = false; });
  }
  function warmDecode() {
    let n = 0;
    for (const p of plates) {
      if (p.img && p.img.decode && near(p.top - scrollY, p.h, 2.2, .4)) {
        p.img.loading = 'eager';
        p.img.decode().catch(() => {});
        if (++n >= 4) break;
      }
    }
  }
  let restT = 0;
  addEventListener('scroll', () => { lastScroll = performance.now(); clearTimeout(restT); restT = setTimeout(() => { tint(); upgrade(); }, 420); }, { passive: true });
  addEventListener('load', () => { setTimeout(warmDecode, 40); setTimeout(upgrade, 1200); }, { once: true });

  /* ── loop ─────────────────────────────────────────────────────── */
  let ticking = false, dirty = true;
  const frame = () => {
    ticking = false;
    if (dirty) { dirty = false; measure(); }
    Y = scrollY;
    notes(); zoom(); tell(); depth(); tint();
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  const remeasure = () => {
    if (innerWidth === VW && Math.abs(document.documentElement.scrollHeight - lastH) < 4) return;
    dirty = true; request();
  };
  window.__flow = { plates, remeasure, measured: 0, get vh() { return VH; } };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', () => { if (innerWidth !== VW) { dirty = true; request(); } });
  addEventListener('load', remeasure);
  document.fonts && document.fonts.ready.then(remeasure);
  let roT = 0;
  new ResizeObserver(() => { clearTimeout(roT); roT = setTimeout(remeasure, 150); }).observe(document.body);
  captureMQ.addEventListener('change', () => { dirty = true; request(); });
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
