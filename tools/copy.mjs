// 文案：copy/<卷>.md 是每一卷的卷名、简介、正文、每张图的标题和故事。
// build-series.mjs 读它，盖在 series-data.mjs 上（那里只留日期、参数、裁切、版式这些）。
//
// 文件的样子（照着改就行）：
//
//   卷名：巷子里
//   简介【待审】：二月的一个下午，在巷子里走了三个小时。
//   正文【待审】：
//   第一段……
//
//   第二段……
//
//   ## 01 古着店【待审】
//   ![](../images/series/lane/sm-01.jpg)
//   故事，可以不写；不写就只有标题。
//
// 【待审】= 还是代拟稿。你写好或确认过，把【待审】删掉。网站上不显示它，只在校对页上提醒你。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const DRAFT = '【待审】';
const pad = n => String(n).padStart(2, '0');

const HELP = `> 改这一卷的文字：卷名、简介、正文，每张图的标题（## 那一行）和故事（图片下面那一段，可以不写）。
> 【待审】表示还是代拟稿——写好或确认过，就把【待审】删掉。图片那一行不用动。
> 改完运行 node tools/build-series.mjs，再打开 proof.html 校对。`;

/* ── write a volume's copy file (used once, to move the copy out of series-data.mjs) ── */
export function serialize(v, { draft = true } = {}) {
  const d = draft ? DRAFT : '';
  const out = [`<!-- ${v.title} · 文案 -->`, HELP, '', `卷名：${v.title}`, `简介${d}：${v.lede || ''}`, `正文${d}：`];
  (v.essay || []).forEach((p, i) => { if (i) out.push(''); out.push(p); });
  out.push('', '---');
  for (const n of Object.keys(v.plates).map(Number).sort((a, b) => a - b)) {
    const p = v.plates[n];
    out.push('', `## ${pad(n)} ${p.t || ''}${d}`, `![](../images/series/${v.slug}/sm-${pad(n)}.jpg)`);
    if (p.s) out.push(p.s);
  }
  return out.join('\n') + '\n';
}

/* ── read it back ── */
export function parse(text, file = '') {
  const res = { plates: {}, drafts: new Set(), warn: [] };
  const lines = text.replace(/\r/g, '').replace(/<!--[\s\S]*?-->/g, '').split('\n');
  let mode = 'head', cur = null, para = [], essay = [];
  const flushPara = () => { if (para.length) { essay.push(para.join('')); para = []; } };
  const field = (line, name) => {
    const m = line.match(new RegExp(`^${name}(${DRAFT})?[：:]\\s*(.*)$`));
    return m && { draft: !!m[1], text: m[2].trim() };
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('>')) continue;                                   // the help text
    const h = line.match(/^##\s*(\d+)\s*(.*)$/);
    if (h) {
      if (mode === 'essay') { flushPara(); res.essay = essay; }
      mode = 'plate';
      let t = h[2].trim(), draft = t.endsWith(DRAFT);
      if (draft) t = t.slice(0, -DRAFT.length).trim();
      cur = { n: Number(h[1]), t, s: [] };
      res.plates[cur.n] = cur;
      if (draft) res.drafts.add(cur.n);
      continue;
    }
    if (mode === 'plate') {
      if (!line || line.startsWith('![') || line === '---') continue;
      cur.s.push(line);
      continue;
    }
    if (line === '---') { if (mode === 'essay') { flushPara(); res.essay = essay; } mode = 'rule'; continue; }
    let f;
    if ((f = field(line, '卷名'))) { res.title = f.text; continue; }
    if ((f = field(line, '简介'))) { res.lede = f.text; if (f.draft) res.drafts.add('lede'); continue; }
    if ((f = field(line, '正文'))) { mode = 'essay'; if (f.draft) res.drafts.add('essay'); if (f.text) para.push(f.text); continue; }
    if (mode === 'essay') { if (line) para.push(line); else flushPara(); }
  }
  if (mode === 'essay') { flushPara(); res.essay = essay; }
  for (const p of Object.values(res.plates)) p.s = p.s.join('');
  if (!res.title) res.warn.push(`${file}：没有找到「卷名：」`);
  return res;
}

/* ── lay the copy over the volumes ── */
export function applyCopy(volumes, dir) {
  const report = [];
  for (const v of volumes) {
    const file = join(dir, `${v.slug}.md`);
    if (!existsSync(file)) { report.push({ v, missing: true, drafts: new Set(), warn: [`copy/${v.slug}.md 不存在，用的是 series-data.mjs 里的文字`] }); continue; }
    const c = parse(readFileSync(file, 'utf8'), `copy/${v.slug}.md`);
    if (c.title) v.title = c.title;
    if (c.lede !== undefined) v.lede = c.lede;
    if (c.essay) v.essay = c.essay;
    for (const [n, p] of Object.entries(c.plates)) {
      if (!v.plates[n]) { c.warn.push(`图 ${pad(n)}：文案里有，但 series-data.mjs 里没有这张图`); continue; }
      v.plates[n].t = p.t;
      if (p.s) v.plates[n].s = p.s; else delete v.plates[n].s;
    }
    for (const n of Object.keys(v.plates)) if (!c.plates[n]) c.warn.push(`图 ${pad(n)}：文案里没有这张图`);
    report.push({ v, drafts: c.drafts, warn: c.warn });
  }
  return report;
}

/* ── length checks, from what the layout can hold ──
   the caption is one line at 13px with wide spacing: in a row of three small pictures on a phone a picture is
   only about 100px wide, so about 6 characters fit. A story on a wide / cinema / emaki picture floats on the
   picture itself; beside a picture on a computer it runs in vertical columns. */
const len = s => [...(s || '')].filter(c => !/\s/.test(c)).length;     // what takes room: not the spaces
export function lint(v, layoutOf) {
  const out = {};
  const add = (n, msg) => (out[n] = out[n] || []).push(msg);
  if (!v.title) add('title', '没有卷名');
  if (len(v.title) > 8) add('title', `卷名 ${len(v.title)} 字，封面上竖排会很挤（建议 8 字以内）`);
  if (!v.lede) add('lede', '没有简介');
  else if (len(v.lede) > 40) add('lede', `简介 ${len(v.lede)} 字，偏长（建议 40 字以内）`);
  for (const [n, p] of Object.entries(v.plates)) {
    const where = layoutOf(Number(n));
    if (!p.t) add(n, '没有标题');
    const tl = len(p.t);
    if (where === 'screen' && tl > 6) add(n, `标题 ${tl} 字：这张在一排小图里，手机上大约只放得下 6 个字`);
    else if (tl > 10) add(n, `标题 ${tl} 字，偏长（建议 10 字以内）`);
    if (p.s) {
      const sl = len(p.s);
      if (['wide', 'cinema', 'emaki'].includes(where) && sl > 30) add(n, `故事 ${sl} 字：浮在宽幅图上，太长会压住画面（建议 30 字以内）`);
      else if (sl > 60) add(n, `故事 ${sl} 字，偏长（建议 60 字以内）`);
    }
    // 'i:' = just so you know, not a problem
    if (!where) add(n, Number(n) === v.cover ? 'i:这张只用作封面，标题用作封面图的说明（读屏、放大时）' : '这张图没有排进版式，网页上看不到');
  }
  return out;
}

export function writeCopy(v, dir, opts) { writeFileSync(join(dir, `${v.slug}.md`), serialize(v, opts)); }
