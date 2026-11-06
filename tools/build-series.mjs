// 生成作品页：node tools/build-series.mjs
// Reads tools/series-data.mjs and writes
//   · series/<slug>.html          each volume
//   · index.html  @works block    the directory on the homepage cover
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as data from './series-data.mjs';

// the colour each picture casts on the paper, and its glow (made by tools/light.py)
const LIGHT = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'light.json'), 'utf8'));
const lightOf = (slug, n) => (LIGHT[slug] && LIGHT[slug].plates[n]) || '';
// dark paper: whatever light.py decided from the pictures, or the volume's own theme
const darkOf = v => (LIGHT[v.slug] && LIGHT[v.slug].night) || v.theme === 'night';
const { volumes, AUTHOR, BOOK } = data;
const upcoming = data.upcoming || [];
const SITE = 'https://yhun960206-yh.github.io/graffiti-photo/';   // the published address, for share previews

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'series');
mkdirSync(outDir, { recursive: true });

// the words — titles, ledes, essays, each picture's title and story — come from copy/<slug>.md
import { applyCopy, lint } from './copy.mjs';
const COPY = applyCopy(volumes, join(root, 'copy'));
// words typed into series-data.mjs the old way would be silently replaced by copy/*.md: say so
{
  const src = readFileSync(join(root, 'tools', 'series-data.mjs'), 'utf8').split('export const volumes')[1] || '';
  const old = [[/\{\s*t:\s*'/, '图片标题 t'], [/,\s*s:\s*'/, '图片故事 s'], [/\blede:/, '简介 lede'], [/\bessay:/, '正文 essay'], [/slug:\s*'[\w-]+',\s*title:/, '卷名 title']]
    .filter(([re]) => re.test(src)).map(([, k]) => k);
  if (old.length && COPY[0]) COPY[0].warn.unshift(`tools/series-data.mjs 里有 ${old.join('、')}：这些不再使用，文字请写在 copy/<卷>.md`);
}

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
  const src = `${prefix}images/series/${v.slug}/${pad(it.n)}.jpg`, sm = `${prefix}images/series/${v.slug}/sm-${pad(it.n)}.jpg`;
  // the small picture comes first; flow.js swaps in the full one only while the page is at rest,
  // so scrolling never waits for a big picture to load or decode
  const img = `<img src="${sm}" data-full="${src}" alt="${esc(p.t)}" loading="lazy" decoding="async">`;
  const lit = lightOf(v.slug, it.n);
  // the light through the picture, spilling onto the paper around it
  const glow = lit ? `<img class="glow" src="${prefix}images/series/${v.slug}/glow-${pad(it.n)}.webp" alt="" aria-hidden="true" loading="lazy" decoding="async">
          ` : '';
  const frame = href
    ? `<a class="plate__frame" href="${href}">${img}</a>`
    : `<button class="plate__frame" type="button" data-title="图 ${pad(no)} · ${esc(p.t)}" aria-label="放大：${esc(p.t)}">${img}</button>`;
  const detail = [p.d, p.x].filter(Boolean).map(esc).join('　');
  const float = p.s && FLOATS.has(layout);
  const tale = p.s && !float ? `<p class="tale" data-fx="tale">${esc(p.s)}</p>` : '';
  return { tale, html: `<figure class="plate${p.s ? ' has-tale' : ''}"${lit ? ` data-light="${lit}"` : ''} style="--ar:${a}; --r:${r4(ratio(a))}; --pos:${it.pos || p.pos || '50% 50%'}">
        <div class="plate__body">
          ${glow}${frame}${float ? `
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
  <meta name="theme-color" content="${lightOf(v.slug, v.cover) || (darkOf(v) ? '#17171a' : '#f2efe7')}">
  <meta property="og:title" content="${esc(v.title)} · ${BOOK}">
  <meta property="og:description" content="${esc(v.lede)}">
  <meta property="og:image" content="${SITE}images/series/${v.slug}/${pad(v.cover)}.jpg">
  <meta property="og:url" content="${SITE}series/${v.slug}.html">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="preload" as="font" type="font/woff2" href="../fonts/serif.woff2" crossorigin>
  <link rel="preload" as="font" type="font/woff2" href="../fonts/sans.woff2" crossorigin>
  <link rel="preload" as="image" href="../images/series/${v.slug}/${pad(v.cover)}.jpg">
  <link rel="stylesheet" href="../base.css">
  <link rel="stylesheet" href="../book.css">
</head>
<body class="book${darkOf(v) ? ' theme-night' : ''}" style="background-color:${lightOf(v.slug, v.cover) || 'var(--paper)'}" data-decor="${(v.decor || []).join(' ')}">
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
          <button class="dir__h" type="button" aria-expanded="false" aria-controls="dir-${v.slug}" data-light="${lightOf(v.slug, f.plate)}" data-bg="images/series/${v.slug}/${pad(f.plate)}.jpg" data-pos="${f.pos || fp.pos || '50% 50%'}">
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
import { readdirSync, existsSync } from 'node:fs';
// the fonts first (base.css names them, so base.css's own hash must come after): a font with new characters
// in it is fetched fresh too
const FONTS = existsSync(join(root, 'fonts')) ? readdirSync(join(root, 'fonts')).filter(f => f.endsWith('.woff2')) : [];
const fontVer = Object.fromEntries(FONTS.map(f => [f, createHash('sha1').update(readFileSync(join(root, 'fonts', f))).digest('hex').slice(0, 8)]));
const stampFonts = file => {
  const s = readFileSync(file, 'utf8'), h = s.replace(/(fonts\/)([\w-]+\.woff2)(?:\?v=\w+)?/g, (m, a, f) => fontVer[f] ? `${a}${f}?v=${fontVer[f]}` : m);
  if (h !== s) writeFileSync(file, h);
};
[join(root, 'base.css'), indexPath, join(root, '404.html'), ...volumes.map(v => join(outDir, `${v.slug}.html`))].forEach(stampFonts);
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

/* ═════════ proofing: proof.html (only on this computer — not published) ═════════
   every picture with its title and story, what is still a draft, what may not fit, and any character the
   site's own fonts do not have yet (run tools/fonts.py for those). */
const fontChars = existsSync(join(root, 'fonts', 'chars.txt')) ? new Set(readFileSync(join(root, 'fonts', 'chars.txt'), 'utf8')) : null;
const shown = s => [...String(s || '')].filter(c => c.charCodeAt(0) > 0x7e && !/\s/.test(c));
const missing = new Set();
if (fontChars) for (const v of volumes) {
  const all = [v.title, v.lede, ...(v.essay || []), ...Object.values(v.plates).flatMap(p => [p.t, p.s])];
  for (const s of all) for (const c of shown(s)) if (!fontChars.has(c)) missing.add(c);
}
const LAYOUT = { single: '单张', scroll: '挂轴', screen: '一排小图', pair: '一对', wide: '宽幅', cinema: '宽银幕', emaki: '绘卷' };
let drafts = 0, notes = 0;
const proofVol = (v, rep) => {
  const nums = numbers(v), where = {};
  for (const s of spreadsOf(v)) for (const x of s.plates) where[item(x).n] = s.layout;
  const L = lint(v, n => where[n]);
  const tag = k => rep.drafts.has(k) ? '<b class="dr">待审</b>' : '<b class="ok">已定</b>';
  const warn = k => (L[k] || []).map(w => w.startsWith('i:') ? `<p class="i">${esc(w.slice(2))}</p>` : (notes++, `<p class="w">${esc(w)}</p>`)).join('');
  drafts += rep.drafts.size;
  const order = Object.keys(v.plates).map(Number).sort((a, b) => (nums[a] ?? 999) - (nums[b] ?? 999) || a - b);
  return `
  <section>
    <h2>${esc(v.title)} <small>copy/${v.slug}.md · 待审 ${rep.drafts.size} 处</small></h2>
    ${warn('title')}${rep.warn.map(w => (notes++, `<p class="w">${esc(w)}</p>`)).join('')}
    <div class="head">
      <p><span class="k">简介</span>${tag('lede')}<span class="n">${shown(v.lede).length} 字</span></p><p class="txt">${esc(v.lede)}</p>${warn('lede')}
      <p><span class="k">正文</span>${tag('essay')}</p>${(v.essay || []).map(p => `<p class="txt">${esc(p)}</p>`).join('')}
    </div>
    <ol class="grid">${order.map(n => {
      const p = v.plates[n];
      return `
      <li class="${rep.drafts.has(n) ? 'is-dr' : ''}">
        <img src="images/series/${v.slug}/sm-${pad(n)}.jpg" alt="" loading="lazy">
        <p class="meta"><span>## ${pad(n)}</span><span>${nums[n] ? `网页上 图 ${pad(nums[n])}` : '不在网页上'}${where[n] ? ` · ${LAYOUT[where[n]]}` : ''}</span>${tag(n)}</p>
        <p class="t">${esc(p.t) || '<i>（没有标题）</i>'}<span class="n">${shown(p.t).length} 字</span></p>
        ${p.s ? `<p class="s">${esc(p.s)}<span class="n">${shown(p.s).length} 字</span></p>` : '<p class="s none">没有故事（只显示标题）</p>'}
        ${warn(n)}
      </li>`;
    }).join('')}
    </ol>
  </section>`;
};
const body = COPY.map(r => proofVol(r.v, r)).join('');
writeFileSync(join(root, 'proof.html'), `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>校对 · ${BOOK}</title>
<style>
  :root { --paper: #f6f4ef; --ink: #22211f; --soft: #6b6862; --line: #dedad2; --dr: #b6402c; --ok: #5d7a52; }
  @media (prefers-color-scheme: dark) { :root { --paper: #18181b; --ink: #ebe9e4; --soft: #9a978f; --line: #33322f; --dr: #e0816f; --ok: #9cbf8c; } }
  * { box-sizing: border-box; } body { margin: 0; padding: 24px 16px 80px; background: var(--paper); color: var(--ink); font: 15px/1.8 "Noto Serif SC", "Songti SC", SimSun, serif; }
  main { max-width: 1180px; margin: 0 auto; } h1 { font-weight: 400; letter-spacing: .2em; font-size: 22px; margin: 0 0 6px; }
  .sum { color: var(--soft); margin: 0 0 8px; } .sum b { color: var(--ink); font-weight: 400; }
  .how { color: var(--soft); font-size: 13px; border-left: 2px solid var(--line); padding-left: 12px; margin: 12px 0 32px; }
  section { border-top: 1px solid var(--line); padding-top: 22px; margin-top: 40px; }
  h2 { font-weight: 400; letter-spacing: .2em; font-size: 20px; margin: 0 0 12px; } h2 small { font-size: 12px; letter-spacing: .05em; color: var(--soft); margin-left: 10px; }
  .head { max-width: 680px; margin-bottom: 22px; } .head p { margin: 4px 0; } .k { color: var(--soft); margin-right: 8px; font-size: 13px; } .txt { padding-left: 1em; }
  .grid { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 18px; }
  li { border: 1px solid var(--line); border-radius: 6px; padding: 10px; } li.is-dr { border-color: color-mix(in srgb, var(--dr) 45%, var(--line)); }
  li img { width: 100%; height: 170px; object-fit: contain; background: color-mix(in srgb, var(--line) 50%, transparent); border-radius: 3px; display: block; }
  .meta { display: flex; gap: 8px; align-items: center; font-size: 12px; color: var(--soft); margin: 8px 0 2px; flex-wrap: wrap; }
  .t { font-size: 17px; letter-spacing: .12em; margin: 2px 0; } .s { margin: 4px 0; } .s.none { color: var(--soft); font-size: 13px; }
  .n { font-size: 11px; color: var(--soft); margin-left: 8px; letter-spacing: 0; }
  b.dr, b.ok { font-weight: 400; font-size: 11px; padding: 0 6px; border-radius: 3px; border: 1px solid; } b.dr { color: var(--dr); } b.ok { color: var(--ok); }
  .w { margin: 4px 0; font-size: 12.5px; color: var(--dr); } .w::before { content: "⚠ "; }
  .i { margin: 4px 0; font-size: 12.5px; color: var(--soft); }
  .miss { color: var(--dr); }
</style></head><body><main>
  <h1>校对 · ${BOOK}</h1>
  <p class="sum">待审 <b>${drafts}</b> 处 · 提醒 <b>${notes}</b> 条${missing.size ? ` · <span class="miss">字体里还没有的字：${esc([...missing].join(''))}（运行 python tools/fonts.py 收进去）</span>` : ''}</p>
  <p class="how">改文字：copy/&lt;卷&gt;.md（标题在 ## 那一行，故事在图片下面）。写好或确认过的，把【待审】删掉。<br>
  改完运行 node tools/build-series.mjs，刷新这一页。这一页只在你的电脑上，不会发布。</p>
  ${body}
</main></body></html>
`);
console.log(`copy   ·  待审 ${drafts} 处 · 提醒 ${notes} 条 · 校对页 proof.html`);
for (const r of COPY) for (const w of r.warn) console.log(`  ⚠ ${w}`);
if (missing.size) console.log(`fonts  ·  ⚠ 字体里还没有这些字：${[...missing].join('')}  → python tools/fonts.py <原始字体文件夹>`);
else if (!fontChars) console.log('fonts  ·  ⚠ fonts/chars.txt 不存在，没法检查字体缺字（运行一次 python tools/fonts.py）');
