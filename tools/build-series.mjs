// 生成作品页：node tools/build-series.mjs
// Reads tools/series-data.mjs and writes
//   · series/<slug>.html          each volume
//   · index.html  @works block    the directory on the homepage cover
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as data from './series-data.mjs';
const { volumes, AUTHOR, BOOK } = data;
const upcoming = data.upcoming || [];
const SITE = 'https://yhun960206-yh.github.io/graffiti-photo/';   // the published address, for share previews

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'series');
mkdirSync(outDir, { recursive: true });

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad = n => String(n).padStart(2, '0');
const CN = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const ratio = ar => { const [a, b] = String(ar).split('/').map(Number); return b ? a / b : a; };
const r4 = x => Math.round(x * 10000) / 10000;
const count = v => Object.keys(v.plates).length;
const item = x => (typeof x === 'object' ? x : { n: x });
volumes.forEach((v, i) => { v.no = i + 1; });

const SEAL = `<span class="seal" aria-hidden="true"><span>涂</span><span>鸦</span></span>`;

/* automatic spreads by ratio, used when a volume has no `spreads` */
function autoSpreads(v) {
  const ns = Object.keys(v.plates).map(Number).filter(n => n !== v.cover);
  const out = []; let i = 0, side = 0;
  while (i < ns.length) {
    const r = ratio(v.plates[ns[i]].ar), r1 = ns[i + 1] && ratio(v.plates[ns[i + 1]].ar), r2 = ns[i + 2] && ratio(v.plates[ns[i + 2]].ar);
    if (r >= 2) { const run = []; while (i < ns.length && ratio(v.plates[ns[i]].ar) >= 2) run.push(ns[i++]); out.push({ layout: run.length > 1 ? 'emaki' : 'cinema', plates: run }); continue; }
    if (r >= 1.7) { out.push({ layout: 'wide', plates: [ns[i++]] }); continue; }
    if (r < .8 && r1 && r1 < .8 && r2 && r2 < .8) { out.push({ layout: 'screen', plates: ns.slice(i, i + 3) }); i += 3; continue; }
    if (r1 && out.length % 3 === 1) { out.push({ layout: 'pair', plates: [ns[i], ns[i + 1]] }); i += 2; continue; }
    out.push(r < .8 && out.length % 4 === 2 ? { layout: 'scroll', plates: [ns[i++]] } : { layout: 'single', align: ['l', 'r', 'c'][side++ % 3], plates: [ns[i++]] });
  }
  return out;
}
const spreadsOf = v => v.spreads || autoSpreads(v);

/* image numbers follow the page: 图 01 is the cover, then in reading order */
function numbers(v) {
  const m = { [v.cover]: 1 }; let k = 2;
  for (const s of spreadsOf(v)) for (const x of s.plates) { const n = item(x).n; if (!(n in m)) m[n] = k++; }
  return m;
}

/* a plate. its story (p.s), if any:
     float — on wide, cinema and emaki pictures it floats on the image
     side  — otherwise it is returned separately, so the spread can set it beside the picture */
const FLOATS = new Set(['wide', 'cinema', 'emaki']);
function plate(v, x, no, { prefix = '../', href, ar: forceAr, layout } = {}) {
  const it = item(x), p = v.plates[it.n];
  const a = forceAr || it.ar || p.ar;
  const src = `${prefix}images/series/${v.slug}/${pad(it.n)}.jpg`;
  const img = `<img src="${src}" alt="${esc(p.t)}" loading="lazy" decoding="async">`;
  const frame = href
    ? `<a class="plate__frame" href="${href}">${img}</a>`
    : `<button class="plate__frame" type="button" data-title="图 ${pad(no)} · ${esc(p.t)}" aria-label="放大：${esc(p.t)}">${img}</button>`;
  const detail = [p.d, p.x].filter(Boolean).map(esc).join('　');
  const float = p.s && FLOATS.has(layout);
  const tale = p.s && !float ? `<p class="tale" data-fx="tale">${esc(p.s)}</p>` : '';
  return { tale, html: `<figure class="plate${p.s ? ' has-tale' : ''}" style="--ar:${a}; --r:${r4(ratio(a))}; --pos:${it.pos || p.pos || '50% 50%'}">
        <div class="plate__body">
          ${frame}${float ? `
          <p class="tale tale--float" data-fx="tale">${esc(p.s)}</p>` : ''}
          <figcaption class="note"><span class="note__t"><span class="note__n">图 ${pad(no)}</span>${esc(p.t)}</span><span class="note__d">${detail}</span></figcaption>
        </div>
      </figure>` };
}

function spread(v, s, nums) {
  const P = (x, o = {}) => plate(v, x, nums[item(x).n], { layout: s.layout, ...o });
  const ars = s.plates.map(x => item(x).ar || v.plates[item(x).n].ar);
  const inner = ps => ps.map(q => q.html.replace('</figure>', q.tale ? `  ${q.tale}\n      </figure>` : '</figure>')).join('\n      ');
  switch (s.layout) {
    case 'screen': {
      const sum = ars.reduce((a, b) => a + ratio(b), 0);
      return `<div class="row row--${s.plates.length}" style="--sum:${r4(sum)}; --n:${s.plates.length}">
      ${inner(s.plates.map(x => P(x)))}
    </div>`;
    }
    case 'emaki': return s.plates.map(x => P(x, { ar: item(x).ar || '2.35/1' }).html).join('\n    ');
    case 'pair': return `<div class="pair">${inner(s.plates.map(x => P(x)))}</div>`;
    default: {
      const q = s.layout === 'scroll' ? P(s.plates[0], { ar: item(s.plates[0]).ar || '1/2' }) : P(s.plates[0]);
      return q.html + (q.tale ? `\n    ${q.tale.replace('class="tale"', 'class="tale tale--side"')}` : '');
    }
  }
}

/* the cover: a picture with the title set vertically on it, a margin with the seal */
function cover({ img, pos, alt, title, side, prefix = '' }) {
  return `
    <section class="cv">
      <div class="cv__img">
        <img src="${prefix}${img}" alt="${esc(alt)}" style="object-position:${pos || '50% 50%'}" fetchpriority="high">
        <h1 class="cv__t" data-float=".12" data-fx="ink">${esc(title)}</h1>
      </div>
      <div class="cv__side">
        ${SEAL}
        ${side}
      </div>
    </section>`;
}

/* ═════════ volume page ═════════ */
function volumePage(v, i) {
  const nums = numbers(v);
  const prev = volumes[(i - 1 + volumes.length) % volumes.length], next = volumes[(i + 1) % volumes.length];
  const body = spreadsOf(v).map(s => `
    <section class="sp sp--${s.layout}${s.align ? ' sp--' + s.align : ''}">
    ${spread(v, s, nums)}
    </section>`).join('');
  const side = `<p class="cv__lede" data-fx="rise" data-fx-delay="700">${esc(v.lede)}</p>
        <p class="cv__meta t-note">第${CN[v.no]}卷<br>${esc(v.date)}<br>${count(v)} 张</p>`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <!-- 由 tools/build-series.mjs 生成：请改 tools/series-data.mjs 后重新运行，不要直接改这个文件 -->
  <title>${esc(v.title)} · ${BOOK}</title>
  <meta name="description" content="${esc(v.lede)}　${AUTHOR}的摄影作品。">
  <meta name="theme-color" content="${v.theme === 'night' ? '#17171a' : '#f2efe7'}">
  <meta property="og:title" content="${esc(v.title)} · ${BOOK}">
  <meta property="og:description" content="${esc(v.lede)}">
  <meta property="og:image" content="${SITE}images/series/${v.slug}/${pad(v.cover)}.jpg">
  <meta property="og:url" content="${SITE}series/${v.slug}.html">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@200;300;400&family=Noto+Sans+SC:wght@300;400&display=swap" rel="stylesheet">
  <link rel="preload" as="image" href="../images/series/${v.slug}/${pad(v.cover)}.jpg">
  <link rel="stylesheet" href="../base.css">
  <link rel="stylesheet" href="../book.css">
</head>
<body class="book${v.theme === 'night' ? ' theme-night' : ''}" data-decor="${(v.decor || []).join(' ')}">
  <a class="skip" href="#plates">跳到作品</a>
  <header class="bar" data-bar>
    <a class="bar__home" href="../index.html#works">${BOOK}</a>
    <span class="bar__n" data-count>图 01 / ${pad(count(v))}</span>
  </header>

  <main>${cover({ img: `images/series/${v.slug}/${pad(v.cover)}.jpg`, prefix: '../', pos: v.coverPos, alt: v.plates[v.cover].t, title: v.title, side })}

    <section class="vi">
      <div class="vi__text">${v.essay.map((p, k) => `<p${k ? '' : ' data-fx="rise"'}>${esc(p)}</p>`).join('')}</div>
      <p class="vi__meta t-note">${[v.date, v.gear, `${count(v)} 张`].filter(Boolean).map(esc).join('<br>')}</p>
    </section>

    <div class="plates" id="plates">${body}
    </div>

    <section class="vend">
      ${SEAL}
      <p class="vend__t" data-fx="rise">${esc(v.title)}</p>
      <p class="t-note">${[`第${CN[v.no]}卷`, v.date, `${count(v)} 张`, `摄影 ${AUTHOR}`].map(esc).join(' · ')}</p>
      <p class="t-note">© ${new Date().getFullYear()} ${AUTHOR}　图片未经许可请勿转载</p>
    </section>
    <nav class="vols" aria-label="其他作品">
      <a href="${prev.slug}.html"><span class="t-note">上一卷</span><span class="vols__t">${esc(prev.title)}</span></a>
      <a href="${next.slug}.html"><span class="t-note">下一卷</span><span class="vols__t">${esc(next.title)}</span></a>
    </nav>
  </main>

  <footer class="foot"><a href="../index.html">← ${BOOK}</a><a href="../index.html#works">全部作品</a></footer>

  <dialog class="lb" aria-label="大图">
    <figure class="lb__fig"><img alt=""><figcaption><span class="lb__count"></span><span class="lb__t"></span></figcaption></figure>
    <div class="lb__bar">
      <button class="lb__btn lb__prev" type="button" aria-label="上一张">←</button>
      <button class="lb__close" type="button">关闭</button>
      <button class="lb__btn lb__next" type="button" aria-label="下一张">→</button>
    </div>
  </dialog>

  <script src="../flow.js" defer></script>
  <script src="../text.js" defer></script>
  <script src="../home.js" defer></script>
  <script src="../book.js" defer></script>
  <script src="../decor.js" defer></script>
</body>
</html>
`;
}

volumes.forEach((v, i) => {
  writeFileSync(join(outDir, `${v.slug}.html`), volumePage(v, i));
  console.log(`series/${v.slug}.html  ·  第${CN[v.no]}卷 ${v.title}  ·  ${count(v)} 张  ·  ${spreadsOf(v).map(s => s.layout + (s.align || '')).join(' ')}`);
});

/* ═════════ homepage: the directory on the cover ═════════
   each volume is one line; opening it shows its words, a strip of pictures, and the way in.
   the cover picture behind turns into that volume's picture. */
const THUMBS = 6;
function entry(v, i) {
  const f = v.feature, fp = v.plates[f.plate], href = `series/${v.slug}.html`;
  const nums = numbers(v);
  const order = Object.keys(nums).map(Number).sort((a, b) => nums[a] - nums[b]).slice(0, THUMBS);
  const strip = order.map(n => `<a href="${href}" tabindex="-1"><img data-src="images/series/${v.slug}/sm-${pad(n)}.jpg" alt="${esc(v.plates[n].t)}" style="aspect-ratio:${v.plates[n].ar}" decoding="async"></a>`).join('');
  return `
        <li class="dir__i" style="--k:${i}">
          <button class="dir__h" type="button" aria-expanded="false" aria-controls="dir-${v.slug}" data-bg="images/series/${v.slug}/${pad(f.plate)}.jpg" data-pos="${f.pos || fp.pos || '50% 50%'}">
            <span class="dir__no">${CN[v.no]}</span><span class="dir__t">${esc(v.title)}</span><span class="dir__m">${esc(v.date.slice(0, 7))}</span>
          </button>
          <div class="dir__p" id="dir-${v.slug}" role="region" aria-label="${esc(v.title)}">
            <div class="dir__in">
              <p class="dir__lede">${esc(v.lede)}</p>
              <p class="dir__meta">${esc(v.kind)} · ${count(v)} 张</p>
              <div class="dir__strip">${strip}</div>
              <a class="dir__go" href="${href}">翻开这一卷</a>
            </div>
          </div>
        </li>`;
}
const works = `<!-- @works:start -->
      <ol class="dir">${volumes.map(entry).join('')}
${upcoming.map((u, k) => `        <li class="dir__i is-later" style="--k:${volumes.length + k}"><span class="dir__h"><span class="dir__no">${CN[volumes.length + k + 1]}</span><span class="dir__t">${esc(u.title)}</span><span class="dir__m">${esc(u.note)}</span></span></li>`).join('\n')}
      </ol>
<!-- @works:end -->`;

const indexPath = join(root, 'index.html');
let html = readFileSync(indexPath, 'utf8');
const re = /<!-- @works:start -->[\s\S]*?<!-- @works:end -->/;
if (!re.test(html)) throw new Error('index.html: @works markers not found');
html = html.replace(re, () => works);
const total = volumes.reduce((s, v) => s + count(v), 0);
html = html.replace(/<!-- @total -->[^<]*<!-- \/@total -->/g, `<!-- @total -->${CN[volumes.length]}卷 · ${total} 张<!-- /@total -->`);
writeFileSync(indexPath, html);
console.log(`index.html  ·  ${volumes.length} volumes · ${total} photos`);

/* ═════════ cache busting ═════════
   GitHub Pages lets browsers keep css/js for ~10 minutes; after an update a page could pair new HTML with old styles.
   every local css/js link gets ?v=<content hash>, so a changed file is always fetched fresh. */
import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
const ASSETS = readdirSync(root).filter(f => /\.(css|js)$/.test(f));
const hash = f => createHash('sha1').update(readFileSync(join(root, f))).digest('hex').slice(0, 8);
const ver = Object.fromEntries(ASSETS.map(f => [f, hash(f)]));
const stamp = file => {
  const h = readFileSync(file, 'utf8').replace(/((?:href|src)=")((?:\.\.\/)?)([\w-]+\.(?:css|js))(?:\?v=\w+)?"/g,
    (m, a, pre, f) => ver[f] ? `${a}${pre}${f}?v=${ver[f]}"` : m);
  writeFileSync(file, h);
};
[indexPath, join(root, '404.html'), ...volumes.map(v => join(outDir, `${v.slug}.html`))].forEach(stamp);
console.log(`cache  ·  ${ASSETS.map(f => `${f}?v=${ver[f]}`).join(' ')}`);
