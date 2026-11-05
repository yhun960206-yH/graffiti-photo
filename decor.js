/* ==========================================================
   decor.js —— 背景层：从照片里提取的小东西，画成插画，缓缓飘在留白处

   <body data-decor="shard blossom bean"> 列出这一页用哪几种（每卷在 tools/series-data.mjs 的 decor 里写）。
   · 只放在空白的纸上：不压图片、不压文字
   · 位置每次都一样（按页面算出的固定随机数），所以每一页都有自己固定的「版式」
   · 每种东西有自己的动法：花瓣飘落、瓷片翻转、小熊轻轻晃、热气往上飘、叶子摇……
   · 离屏幕远的一律停下；滚动时近大远小，有一点景深
   · 长截图、打印、「减少动态效果」：静止，但都还在，所以截出来也是有插画的画册
   ========================================================== */
(() => {
  const want = (document.body.dataset.decor || '').split(/\s+/).filter(Boolean);
  if (!want.length) return;
  // motion is part of the book: kept even when the system asks for less (add ?still to see it at rest)
  const still = new URLSearchParams(location.search).has('still');

  /* ── the motifs ───────────────────────────────────────────────
     svg: drawn in a 100×100 box · move: how it moves · size: px · w: how often · a: opacity
     soft: a glow — may sit behind text, only its centre has to be on paper */
  const INK = '#2b2a27';
  const M = {
    // 巷子里：贴满墙的青花碎瓷片 · 古着店门口的粉色花 · 黑板上的粉笔咖啡豆
    shard: { move: 'tumble', size: [30, 58], w: 4, a: .9, svg: [
      ['M10 34 L44 6 L86 18 L94 56 L64 92 L22 82 Z', 'M26 46 q11 -13 22 0 t22 0', '<circle cx="38" cy="66" r="5"/><path d="M58 24 l6 8 l8 -6" fill="none" stroke-width="2.5"/>'],
      ['M8 50 L30 12 L70 8 L92 40 L76 84 L34 90 Z', 'M22 58 C 34 40, 50 74, 64 54 S 82 44, 86 50', '<circle cx="40" cy="30" r="9" fill="none" stroke-width="2.5"/><circle cx="40" cy="30" r="3"/>'],
      ['M20 14 L82 22 L90 70 L50 94 L10 62 Z', 'M24 36 l52 6', '<path d="M30 54 q8 -10 16 0 q8 10 16 0 q8 -10 16 0" fill="none" stroke-width="3"/><circle cx="50" cy="76" r="4"/>'],
    ].map(([edge, brush, mark]) => `
      <path d="${edge}" fill="#f7f4ec" stroke="#2e4a7d" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="${edge}" fill="none" stroke="#d6dbe6" stroke-width="7" stroke-linejoin="round" opacity=".7" transform="translate(50 50) scale(.86) translate(-50 -50)"/>
      <path d="${brush}" fill="none" stroke="#2e4a7d" stroke-width="5" stroke-linecap="round" opacity=".9"/>
      <g fill="#2e4a7d" stroke="#2e4a7d">${mark}</g>`) },
    blossom: { move: 'fall', size: [16, 28], w: 3, a: .9, svg: `
      ${[0, 72, 144, 216, 288].map(r => `<ellipse cx="50" cy="27" rx="15" ry="22" transform="rotate(${r} 50 50)" fill="#ecb3bd" stroke="#c9808e" stroke-width="2"/>`).join('')}
      <circle cx="50" cy="50" r="8" fill="#f4dc9a"/>` },
    bean: { move: 'tumble', size: [16, 26], w: 2, a: .85, svg: `
      <g transform="rotate(-25 50 50)"><ellipse cx="50" cy="50" rx="28" ry="38" fill="#6b4a33"/><ellipse cx="44" cy="40" rx="10" ry="16" fill="#8a6447" opacity=".7"/>
        <path d="M50 14 C 38 36, 62 64, 50 86" fill="none" stroke="#f2efe7" stroke-width="4" stroke-linecap="round"/></g>` },

    // 年末的光：从窗外斜进来的一块光 · 光里的灰尘
    beam: { move: 'glide', size: [180, 340], w: 2, a: .9, soft: true, svg: `
      <defs><linearGradient id="g-beam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe9c4" stop-opacity="0"/><stop offset=".5" stop-color="#ffe9c4" stop-opacity=".16"/><stop offset="1" stop-color="#ffe9c4" stop-opacity="0"/></linearGradient></defs>
      <polygon points="8,14 58,0 96,84 44,100" fill="url(#g-beam)"/>
      <line x1="33" y1="7" x2="70" y2="92" stroke="#17171a" stroke-width="3" opacity=".7"/>` },
    mote: { move: 'rise', size: [5, 11], w: 6, a: .85, svg: `
      <defs><radialGradient id="g-mote"><stop offset="0" stop-color="#f3d79c"/><stop offset="1" stop-color="#f3d79c" stop-opacity="0"/></radialGradient></defs>
      <circle cx="50" cy="50" r="50" fill="url(#g-mote)"/>` },

    // 小熊帽：熊耳帽 · 羊羔毛的卷 · 她举起的旧相机
    bear: { move: 'bob', size: [28, 46], w: 3, a: .9, svg: `
      <circle cx="24" cy="30" r="14" fill="#8b5e3c"/><circle cx="76" cy="30" r="14" fill="#8b5e3c"/>
      <circle cx="24" cy="30" r="6.5" fill="#d9ab82"/><circle cx="76" cy="30" r="6.5" fill="#d9ab82"/>
      <circle cx="50" cy="57" r="31" fill="#8b5e3c"/><ellipse cx="50" cy="68" rx="13" ry="10" fill="#d9ab82"/>
      <circle cx="39" cy="53" r="3.2" fill="#2a1d14"/><circle cx="61" cy="53" r="3.2" fill="#2a1d14"/><ellipse cx="50" cy="63" rx="4.5" ry="3.2" fill="#2a1d14"/>` },
    curl: { move: 'tumble', size: [16, 26], w: 3, a: .8, svg: `
      <path d="M50 44 a6 6 0 1 1 -6 6 a12 12 0 1 1 12 12 a18 18 0 1 1 -18 -18 a24 24 0 1 1 24 24" fill="none" stroke="#c4a37a" stroke-width="6" stroke-linecap="round"/>` },
    camera: { move: 'bob', size: [28, 40], w: 1, a: .75, svg: `
      <rect x="26" y="24" width="20" height="14" rx="3" fill="${INK}"/>
      <rect x="12" y="34" width="76" height="46" rx="7" fill="#efe9dd" stroke="${INK}" stroke-width="3.5"/>
      <rect x="12" y="44" width="76" height="8" fill="#8b5e3c"/>
      <circle cx="50" cy="58" r="17" fill="${INK}"/><circle cx="50" cy="58" r="8" fill="#6f8191"/><circle cx="46" cy="54" r="2.5" fill="#fff"/>
      <rect x="70" y="38" width="10" height="4" rx="1" fill="${INK}"/>` },

    // 冬日的列车：花架上的红山茶和叶子 · 很低的太阳
    camellia: { move: 'drift', size: [22, 36], w: 3, a: .9, svg: `
      ${[0, 72, 144, 216, 288].map(r => `<circle cx="50" cy="28" r="21" transform="rotate(${r} 50 50)" fill="#b8382f" stroke="#8e2a22" stroke-width="2"/>`).join('')}
      <circle cx="50" cy="50" r="12" fill="#e8c24f"/><circle cx="50" cy="50" r="5" fill="#c99a2a"/>` },
    leaf: { move: 'fall', size: [16, 26], w: 2, a: .85, svg: `
      <path d="M50 6 C 82 30, 80 70, 50 94 C 20 70, 18 30, 50 6 Z" fill="#3f5f45"/><path d="M50 14 L50 88" stroke="#7f9d78" stroke-width="2.5"/>` },
    sun: { move: 'breathe', size: [160, 260], w: .35, a: .8, soft: true, svg: `
      <defs><radialGradient id="g-sun"><stop offset="0" stop-color="#f2b25c" stop-opacity=".5"/><stop offset=".45" stop-color="#f2b25c" stop-opacity=".18"/><stop offset="1" stop-color="#f2b25c" stop-opacity="0"/></radialGradient></defs>
      <circle cx="50" cy="50" r="50" fill="url(#g-sun)"/>` },

    // 五月的树荫：五片小叶的藤叶（还有一片紫叶）· 叶隙里漏下来的光
    ivy: { move: 'fall', size: [30, 52], w: 4, a: .85, svg: ivy('#5f8a52', '#3f6a3a') },
    'ivy-violet': { move: 'fall', size: [26, 42], w: 1, a: .85, svg: ivy('#7d5277', '#5a3556') },
    spot: { move: 'breathe', size: [60, 140], w: 2, a: .9, soft: true, svg: `
      <defs><radialGradient id="g-spot"><stop offset="0" stop-color="#f5dc8c" stop-opacity=".55"/><stop offset=".6" stop-color="#f5dc8c" stop-opacity=".18"/><stop offset="1" stop-color="#f5dc8c" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="50" cy="50" rx="50" ry="38" fill="url(#g-spot)"/>` },

    // 咖啡凉了：杯子上的热气 · 窗边的龟背竹 · 天黑后的暖灯
    steam: { move: 'rise', size: [36, 64], w: 3, a: .55, svg: `
      <path d="M50 96 C 30 76, 70 60, 50 42 S 68 12, 52 2" fill="none" stroke="#efe2c8" stroke-width="5" stroke-linecap="round"/>` },
    monstera: { move: 'sway', size: [70, 120], w: 1, a: .8, svg: `
      <path d="M50 98 L50 80" stroke="#6f9a7c" stroke-width="4"/>
      <path d="M50 8 C 88 10, 100 52, 72 84 C 62 92, 38 92, 28 84 C 0 52, 12 10, 50 8 Z" fill="#4e7a5c"/>
      <g stroke="#17171a" stroke-width="5" stroke-linecap="round"><path d="M98 40 L70 46"/><path d="M93 64 L64 60"/><path d="M2 40 L30 46"/><path d="M8 64 L36 60"/></g>
      <ellipse cx="38" cy="32" rx="4" ry="7" fill="#17171a"/><ellipse cx="62" cy="32" rx="4" ry="7" fill="#17171a"/>
      <path d="M50 12 L50 86" stroke="#6f9a7c" stroke-width="2.5"/>` },
    lamp: { move: 'breathe', size: [80, 170], w: 2, a: .9, soft: true, svg: `
      <defs><radialGradient id="g-lamp"><stop offset="0" stop-color="#ffb060" stop-opacity=".32"/><stop offset=".55" stop-color="#ffb060" stop-opacity=".12"/><stop offset="1" stop-color="#ffb060" stop-opacity="0"/></radialGradient></defs>
      <circle cx="50" cy="50" r="50" fill="url(#g-lamp)"/>` },
  };
  function ivy(fill, line) {
    return [-76, -38, 0, 38, 76].map(r => `<path d="M50 54 C 41 38, 43 17, 50 6 C 57 17, 59 38, 50 54 Z" transform="rotate(${r} 50 54)" fill="${fill}" stroke="${line}" stroke-width="1.6"/>`).join('')
      + `<path d="M50 54 Q 52 76 46 96" fill="none" stroke="#7a6a48" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  // how each kind moves: keyframes in base.css; [duration range s, direction]
  const MOVE = { fall: [11, 18, 'normal'], drift: [13, 20, 'normal'], rise: [7, 12, 'normal'], tumble: [9, 16, 'alternate'], bob: [4, 7, 'alternate'], sway: [5, 8, 'alternate'], breathe: [6, 11, 'alternate'], glide: [14, 22, 'alternate'] };

  const kinds = want.filter(k => M[k]);
  if (!kinds.length) return;

  // the shapes, once, as <symbol>s
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.setAttribute('aria-hidden', 'true'); defs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  const variants = k => [].concat(M[k].svg);
  defs.innerHTML = kinds.map(k => variants(k).map((v, i) => `<symbol id="dc-${k}-${i}" viewBox="0 0 100 100">${v}</symbol>`).join('')).join('');
  document.body.prepend(defs);

  const layer = document.createElement('div');
  layer.className = 'decor'; layer.setAttribute('aria-hidden', 'true');
  document.body.prepend(layer);

  /* ── placement ───────────────────────────────────────────────── */
  // the same page always gets the same arrangement
  const seedOf = s => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const BLOCK = '.plate__frame, .cv__img, .hx, .bar, img:not(.glow)';
  const WORDS = 'p, h1, h2, .plate, .note, .seal, .vols a, .foot, .dir';
  const TEXT = 'p, h1, h2, .note, .tale, .dir, .vols a';           // what a passing motif must not cover

  // a still turn for each motif: loose things lie any way up, upright things only lean a little
  const turn = p => p.soft || p.m.move === 'glide' ? 0 : ['fall', 'drift', 'tumble'].includes(p.m.move) ? p.rot % 360 : p.sw * .25;
  let items = [], bands = [], built = '', wordRects = [], moving = false;
  function build() {
    const was = layer.style.height;
    layer.style.height = '0px';                      // measure the page without this layer holding it open
    const W = document.documentElement.clientWidth, H = document.documentElement.scrollHeight;
    layer.style.height = was;
    const key = `${W}x${Math.round(H / 40)}`;
    if (key === built) return;
    built = key;
    io.disconnect();
    layer.style.height = H + 'px';
    const Y = scrollY;
    const rect = (el, pad) => { const r = el.getBoundingClientRect(); return r.width ? [r.left - pad, r.top + Y - pad, r.right + pad, r.bottom + Y + pad] : null; };
    const blocks = [...document.querySelectorAll(BLOCK)].map(el => rect(el, 6)).filter(Boolean);
    const words = [...document.querySelectorAll(WORDS)].map(el => rect(el, 14)).filter(Boolean);
    wordRects = [...document.querySelectorAll(TEXT)].map(el => rect(el, 26)).filter(Boolean);
    const hit = (list, x0, y0, x1, y1) => list.some(r => x0 < r[2] && x1 > r[0] && y0 < r[3] && y1 > r[1]);

    // the page is cut into bands; each band has its own fixed random numbers,
    // so when something above changes height only the bands it touches are re-laid
    const BAND = 700, seed = seedOf(location.pathname + W), per = W * BAND / (W < 700 ? 56000 : 96000);
    const placed = [];
    for (let b0 = 0, band = 0; b0 < H; b0 += BAND, band++) {
      const rand = rng(seed + band * 7919);
      const pickW = kinds.reduce((s, k) => s + M[k].w, 0);
      const pick = () => { let t = rand() * pickW; for (const k of kinds) if ((t -= M[k].w) <= 0) return k; return kinds[0]; };
      const want = Math.round(per * Math.min(1, (H - b0) / BAND));
      let got = 0;
      for (let tries = 0; got < want && tries < want * 8; tries++) {
        const k = pick(), m = M[k];
        const z = .55 + rand() * .45;                         // depth: far things are smaller, fainter, slower
        const s = (m.size[0] + rand() * (m.size[1] - m.size[0])) * (m.soft ? 1 : .7 + z * .3) * (W >= 1024 ? 1.45 : 1);
        const x = rand() * (W - s * .6) - s * .2, y = b0 + rand() * BAND - s / 2;
        const v = Math.floor(rand() * variants(k).length), [d0, d1, dir] = MOVE[m.move];
        const d = d0 + rand() * (d1 - d0), ph = rand(), rot = (rand() < .5 ? -1 : 1) * (90 + rand() * 270), sw = (rand() - .5) * 60;
        const cx = x + s / 2, cy = y + s / 2;
        if (y < 0 || y + s > H) continue;
        if (m.soft ? hit(blocks, cx - 4, cy - 4, cx + 4, cy + 4) : hit(blocks, x, y, x + s, y + s) || hit(words, x, y, x + s, y + s)) continue;
        const gap = m.soft ? 0 : Math.max(60, s * 1.6);
        if (gap && placed.some(p => !p.soft && Math.hypot(p.cx - cx, p.cy - cy) < gap)) continue;
        placed.push({ k, v, m, z, s, x, y, cx, cy, soft: m.soft, d, dir, ph, rot, sw });
        got++;
      }
    }
    // depth bands: things of about the same depth share one band, and only the band moves while scrolling
    // (4 moves per frame instead of one per motif). A motif's place inside its band already includes its
    // share of the offset, so   band shift = −(screen middle) × k   puts it where it belongs.
    moving = !still && !capture.matches;
    const BANDS = 4, kOf = b => .2 + (1 - (.55 + (b + .5) / BANDS * .45)) * .66;   // far bands move fastest
    bands = Array.from({ length: BANDS }, (_, b) => ({ k: kOf(b), el: document.createElement('div'), y: NaN }));
    const html = bands.map(() => []);
    items = [];
    for (const p of placed) {
      const b = Math.min(BANDS - 1, Math.floor((p.z - .55) / .45 * BANDS)), k = bands[b].k;
      const top = p.y + (moving ? p.cy * k : 0);
      html[b].push(`<i class="dc${p.soft ? ' dc--soft' : ''}" style="left:${p.x.toFixed(0)}px;top:${top.toFixed(0)}px;width:${p.s.toFixed(0)}px;height:${p.s.toFixed(0)}px;--a:${(p.m.a * (.55 + p.z * .45)).toFixed(2)};--r:${turn(p).toFixed(0)}deg"><i class="dc__m dc--${p.m.move}${p.sw < 0 && p.m.move === 'drift' ? ' dc--alt' : ''}" style="--d:${p.d.toFixed(1)}s;--dl:-${(p.ph * p.d).toFixed(1)}s;--dir:${p.dir}"><svg><use href="#dc-${p.k}-${p.v}"/></svg></i></i>`);
      items.push({ b, k, x0: p.x, y0: p.y, cy: p.cy, s: p.s, soft: p.soft, hush: false });
    }
    layer.textContent = '';
    bands.forEach((band, b) => {
      band.el.className = 'decor__band'; band.el.innerHTML = html[b].join('');
      layer.appendChild(band.el);
      [...band.el.children].forEach((el, i) => { const it = items.filter(t => t.b === b)[i]; it.el = el; });
    });
    if (!still) items.forEach(it => io.observe(it.el));
    parallax();
  }

  /* ── life ────────────────────────────────────────────────────── */
  // only what is near the screen is animated
  const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('on', e.isIntersecting)), { rootMargin: '30% 0px' });

  // depth: the paper is the back layer, so it moves fastest — and the farther, the faster
  //   speed 1.2 … 1.5 × the page;  a motif sits  (its centre − screen middle) × k  from its place
  const capture = matchMedia('(max-aspect-ratio: 1/3), print');
  function parallax() {
    if (!moving) { bands.forEach(b => b.el.style.transform = ''); return; }
    const mid = scrollY + innerHeight / 2, vh = innerHeight;
    for (const b of bands) {
      const y = -mid * b.k;
      if (Math.abs(y - b.y) < .3) continue;
      b.y = y; b.el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    }
    // passing behind words, a motif steps aside: almost gone until it is clear again (arithmetic only)
    for (const it of items) {
      if (it.soft) continue;
      const d = it.cy - mid;
      if (d > vh * 1.4 || d < -vh * 1.4) continue;
      const y0 = it.y0 + d * it.k, y1 = y0 + it.s, x0 = it.x0, x1 = x0 + it.s;
      const hush = wordRects.some(r => x0 < r[2] && x1 > r[0] && y0 < r[3] && y1 > r[1]);
      if (hush !== it.hush) { it.hush = hush; it.el.classList.toggle('hush', hush); }
    }
  }
  let tick = false;
  addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(() => { tick = false; parallax(); }); } }, { passive: true });

  // rebuild when the page changes size (fonts, rotation, a long-screenshot window)
  let rt = 0;
  new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(build, 200); }).observe(document.body);
  capture.addEventListener('change', () => { built = ''; build(); });
  build();
  addEventListener('load', build);
})();
