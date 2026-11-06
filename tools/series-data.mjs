// ============================================================
// 作品数据 —— 改这里，然后运行：node tools/build-series.mjs
// 生成 series/<slug>.html，并更新首页「作品」部分。卷的顺序 = 首页顺序（新的在前）。
// 图片：images/series/<slug>/NN.jpg（+ sm-NN.jpg 缩略图）
//
// ★ 文字不在这里：卷名、简介、正文、每张图的标题和故事都在 copy/<slug>.md（见 tools/copy.mjs）。
//   这里只放日期、参数、裁切、版式、插画这些。
//
// 图片字段   d 日期时间 · x 拍摄参数 · ar 版面比例（裁切）· pos 裁切焦点
//
// 版式（spreads）—— 每一项是一「段」，看图时在这里停一下：
//   single  单张，align: 'l' 偏左 / 'r' 偏右 / 'c' 居中（留白不对称）
//   scroll  挂轴：竖长裁切（默认 1:2），窄而高，四周大片留白
//   screen  屏风：一行 2–3 张等高，缝隙极窄
//   pair    错落的一大一小
//   wide    16:9 宽幅          cinema 宽银幕（2.35:1）
//   emaki   绘卷：几张宽银幕上下相接，像展开的长卷
//   单张可以写成 { n: 6, ar: '1/2', pos: '50% 30%' } 来改这一处的裁切
//
// 卷的其他字段
//   cover 封面图 · coverPos 封面焦点 · feature 首页代表图 { plate, ar, pos }
//   gear 器材 · theme 'night' 深色底
//   decor 背景的插画（从这一卷的照片里提取的东西，缓缓飘在留白处），见 decor.js 的 MOTIFS
//
// 图片的故事（写在 copy/<slug>.md）—— 竖幅、单张：图注滑上去之后，在图旁展开成这段话；
//                         宽幅、宽银幕、绘卷：浮在图上。没有故事的图只有图注。
// 日期、时间、参数取自原片 EXIF。
// ============================================================

export const AUTHOR = '涂鸦';
export const BOOK = '涂鸦写真帖';

export const upcoming = [
  { title: '街', kind: '人文 · 扫街', note: '整理中' },
];

const NZ_TAM = 'Nikon Z 8 · Tamron 28–75mm F2.8';
const NZ_50 = 'Nikon Z 8 · 50mm f/1.8';

export const volumes = [
  {
    slug: 'lane', kind: '人像 · 街头', year: '2026', date: '2026.02.04',
    decor: ['shard', 'blossom', 'bean'],
    gear: 'Canon EOS R5 Mark II · RF50mm F1.8',
    cover: 24, coverPos: '50% 45%',
    feature: { plate: 8, ar: '3/2', pos: '50% 50%' },
    plates: {
      1:  { d: '2026.02.04 · 13:16', x: 'f/4.5 · 1/250 · ISO 100', ar: '3/2' },
      2:  { d: '2026.02.04 · 13:17', x: 'f/4.5 · 1/200 · ISO 100', ar: '2/3' },
      3:  { d: '2026.02.04 · 13:18', x: 'f/4.5 · 1/125 · ISO 100', ar: '2/3' },
      4:  { d: '2026.02.04 · 13:19', x: 'f/4.5 · 1/100 · ISO 100', ar: '2/3' },
      5:  { d: '2026.02.04 · 13:20', x: 'f/2.8 · 1/200 · ISO 100', ar: '3/2' },
      6:  { d: '2026.02.04 · 13:21', x: 'f/2.8 · 1/250 · ISO 100', ar: '2/3' },
      7:  { d: '2026.02.04 · 13:21', x: 'f/2.8 · 1/320 · ISO 100', ar: '3/2' },
      8:  { d: '2026.02.04 · 13:54', x: 'f/2.8 · 1/500 · ISO 100', ar: '3/2' },
      9:  { d: '2026.02.04 · 13:58', x: 'f/2.8 · 1/640 · ISO 100', ar: '3/2' },
      10: { d: '2026.02.04 · 13:59', x: 'f/2.8 · 1/800 · ISO 100', ar: '3/2' },
      11: { d: '2026.02.04 · 14:07', x: 'f/4.5 · 1/400 · ISO 100', ar: '2/3' },
      12: { d: '2026.02.04 · 14:09', x: 'f/4.5 · 1/320 · ISO 100', ar: '3/2' },
      13: { d: '2026.02.04 · 14:10', x: 'f/4.5 · 1/400 · ISO 100', ar: '2/3' },
      14: { d: '2026.02.04 · 14:10', x: 'f/4.5 · 1/320 · ISO 100', ar: '2/3' },
      15: { d: '2026.02.04 · 14:11', x: 'f/4.5 · 1/400 · ISO 100', ar: '2/3' },
      16: { d: '2026.02.04 · 14:12', x: 'f/4.5 · 1/320 · ISO 100', ar: '2/3' },
      17: { d: '2026.02.04 · 15:16', x: 'f/3.2 · 1/60 · ISO 320', ar: '3/2' },
      18: { d: '2026.02.04 · 15:46', x: 'f/3.2 · 1/1000 · ISO 320', ar: '2/3' },
      19: { d: '2026.02.04 · 15:46', x: 'f/4.5 · 1/500 · ISO 320', ar: '2/3' },
      20: { d: '2026.02.04 · 15:46', x: 'f/4.5 · 1/500 · ISO 320', ar: '2/3' },
      21: { d: '2026.02.04 · 15:49', x: 'f/4.5 · 1/500 · ISO 320', ar: '3/2' },
      22: { d: '2026.02.04 · 15:49', x: 'f/4.5 · 1/500 · ISO 320', ar: '2/3' },
      23: { d: '2026.02.04 · 15:52', x: 'f/4.5 · 1/1000 · ISO 320', ar: '3/2' },
      24: { d: '2026.02.04 · 15:54', x: 'f/4.5 · 1/320 · ISO 100', ar: '3/2' },
      25: { d: '2026.02.04 · 15:55', x: 'f/4.5 · 1/200 · ISO 100', ar: '2/3' },
    },
    spreads: [
      { layout: 'single', align: 'l', plates: [1] },
      { layout: 'screen', plates: [2, 3, 4] },
      { layout: 'single', align: 'r', plates: [5] },
      { layout: 'scroll', plates: [{ n: 6, pos: '50% 35%' }] },
      { layout: 'wide', plates: [{ n: 7, ar: '16/9' }] },
      { layout: 'cinema', plates: [{ n: 8, ar: '2.35/1', pos: '50% 55%' }] },
      { layout: 'pair', plates: [9, 10] },
      { layout: 'single', align: 'c', plates: [11] },
      { layout: 'screen', plates: [13, 14, 15] },
      { layout: 'single', align: 'l', plates: [12] },
      { layout: 'scroll', plates: [{ n: 16, pos: '50% 40%' }] },
      { layout: 'single', align: 'r', plates: [17] },
      { layout: 'screen', plates: [18, 19, 20] },
      { layout: 'wide', plates: [{ n: 21, ar: '16/9' }] },
      { layout: 'screen', plates: [22, 23] },
      { layout: 'single', align: 'c', plates: [25] },
    ],
  },
  {
    slug: 'yearend', kind: '人像', year: '2025', date: '2025.12.31',
    decor: ['loupe', 'bowtie', 'specs', 'ball', 'blossom', 'mote'],
    gear: NZ_TAM, theme: 'night',
    cover: 5, coverPos: '45% 40%',
    feature: { plate: 2, ar: '2.35/1', pos: '50% 50%' },
    plates: {
      1:  { d: '2025.12.31', ar: '2.35/1' },
      2:  { d: '2025.12.31', ar: '2.35/1' },
      3:  { d: '2025.12.31', ar: '2.35/1' },
      4:  { d: '2025.12.31 · 14:43', x: 'f/3.5 · 1/800 · ISO 100', ar: '1/1' },
      5:  { d: '2025.12.31 · 14:44', x: 'f/3.5 · 1/500 · ISO 100', ar: '1/1' },
      6:  { d: '2025.12.31 · 14:44', x: 'f/3.5 · 1/500 · ISO 100', ar: '1/1' },
      7:  { d: '2025.12.31 · 14:53', x: 'f/2.8 · 1/160 · ISO 220', ar: '1/1' },
      8:  { d: '2025.12.31 · 14:56', x: 'f/2.8 · 1/160 · ISO 64', ar: '1/1' },
      9:  { d: '2025.12.31 · 15:00', x: 'f/5.6 · 1/125 · ISO 720', ar: '1/1' },
      10: { d: '2025.12.31', ar: '2.35/1' },
      11: { d: '2025.12.31', ar: '2.35/1' },
      12: { d: '2025.12.31', ar: '2.35/1' },
      13: { d: '2025.12.31', ar: '2.35/1' },
      14: { d: '2025.12.31', ar: '2.35/1' },
      15: { d: '2025.12.31', ar: '2.35/1' },
    },
    spreads: [
      { layout: 'emaki', plates: [1, 2, 3] },
      { layout: 'screen', plates: [4, 6, 7] },
      { layout: 'single', align: 'r', plates: [8] },
      { layout: 'emaki', plates: [10, 11] },
      { layout: 'single', align: 'l', plates: [9] },
      { layout: 'emaki', plates: [12, 13, 14, 15] },
    ],
  },
  {
    slug: 'bear', kind: '人像 · 室内', year: '2025', date: '2025.01.19',
    decor: ['bear', 'curl', 'camera'],
    gear: NZ_TAM,
    cover: 3, coverPos: '50% 30%',
    feature: { plate: 3, ar: '4/5', pos: '50% 30%' },
    plates: {
      1: { d: '2025.01.19 · 16:35', x: 'f/2.8 · 1/200 · ISO 1000', ar: '2/3' },
      2: { d: '2025.01.19 · 16:35', x: 'f/2.8 · 1/200 · ISO 900', ar: '2/3' },
      3: { d: '2025.01.19', x: 'f/2.8 · 1/200 · ISO 720', ar: '2/3' },
      4: { d: '2025.01.19 · 16:41', x: 'f/2.8 · 1/200 · ISO 1100', ar: '2/3' },
      5: { d: '2025.01.19 · 17:27', x: 'f/2.8 · 1/125 · ISO 1250', ar: '2/3' },
    },
    spreads: [
      { layout: 'screen', plates: [1, 2] },
      { layout: 'scroll', plates: [{ n: 4, pos: '50% 30%' }] },
      { layout: 'single', align: 'r', plates: [5] },
    ],
  },
  {
    slug: 'train', kind: '人像', year: '2025', date: '2025.01.10',
    decor: ['camellia', 'leaf', 'sun'],
    gear: NZ_TAM,
    cover: 7, coverPos: '50% 30%',
    feature: { plate: 2, ar: '3/2', pos: '50% 40%' },
    plates: {
      1: { d: '2025.01.10 · 16:17', x: 'f/18 · 1/80 · ISO 200', ar: '3/2' },
      2: { d: '2025.01.10 · 16:22', x: 'f/2.8 · 1/320 · ISO 64', ar: '3/2' },
      3: { d: '2025.01.10 · 16:22', x: 'f/2.8 · 1/400 · ISO 64', ar: '3/2' },
      4: { d: '2025.01.10 · 16:27', x: 'f/2.8 · 1/250 · ISO 64', ar: '3/2' },
      5: { d: '2025.01.10 · 16:28', x: 'f/2.8 · 1/500 · ISO 64', ar: '3/2' },
      6: { d: '2025.01.10 · 16:31', x: 'f/2.8 · 1/500 · ISO 64', ar: '3/2' },
      7: { d: '2025.01.10 · 16:40', x: 'f/2.8 · 1/60 · ISO 200', ar: '2/3' },
      8: { d: '2025.01.12 · 16:29', x: 'f/2.8 · 1/250 · ISO 64', ar: '2/3' },
    },
    spreads: [
      { layout: 'single', align: 'l', plates: [2] },
      { layout: 'screen', plates: [3, 4] },
      { layout: 'wide', plates: [{ n: 5, ar: '16/9' }] },
      { layout: 'cinema', plates: [{ n: 6, ar: '2.35/1', pos: '50% 60%' }] },
      { layout: 'single', align: 'r', plates: [1] },
      { layout: 'scroll', plates: [{ n: 8, pos: '50% 30%' }] },
    ],
  },
  {
    slug: 'summer', kind: '人像', year: '2024', date: '2024.05.01',
    decor: ['ivy', 'spot', 'ivy-violet'],
    gear: NZ_50,
    cover: 5, coverPos: '50% 30%',
    feature: { plate: 10, ar: '3/2', pos: '50% 40%' },
    plates: {
      1:  { d: '2024.05.01 · 14:19', x: 'f/2 · 1/1000 · ISO 64', ar: '2/3' },
      2:  { d: '2024.05.01', ar: '3/2' },
      4:  { d: '2024.05.01', ar: '3/2' },
      5:  { d: '2024.05.01', ar: '3/2' },
      6:  { d: '2024.05.01', ar: '3/2' },
      7:  { d: '2024.05.01', ar: '3/2' },
      8:  { d: '2024.05.01', ar: '16/9', pos: '50% 35%' },
      9:  { d: '2024.05.01', ar: '3/2' },
      10: { d: '2024.05.01 · 14:29', x: 'f/2 · 1/1000 · ISO 64', ar: '3/2' },
      11: { d: '2024.05.01', ar: '3/2' },
      13: { d: '2024.05.01', ar: '3/2' },
      14: { d: '2024.05.01', ar: '4/5', pos: '35% 50%' },
      15: { d: '2024.05.01', ar: '4/5', pos: '40% 50%' },
      16: { d: '2024.05.01', ar: '4/5', pos: '55% 50%' },
      17: { d: '2024.05.01', ar: '2.35/1', pos: '50% 55%' },
      18: { d: '2024.05.01 · 14:32', x: 'f/2 · 1/500 · ISO 64', ar: '2/3' },
      19: { d: '2024.05.01', ar: '2/3' },
      20: { d: '2024.05.01', ar: '3/2' },
      22: { d: '2024.05.01 · 14:22', x: 'f/2.5 · 1/1000 · ISO 64', ar: '2/3' },
    },
    spreads: [
      { layout: 'single', align: 'r', plates: [22] },
      { layout: 'screen', plates: [2, 4] },
      { layout: 'scroll', plates: [{ n: 1, pos: '50% 35%' }] },
      { layout: 'pair', plates: [6, 9] },
      { layout: 'wide', plates: [8] },
      { layout: 'single', align: 'l', plates: [7] },
      { layout: 'screen', plates: [10, 11] },
      { layout: 'single', align: 'c', plates: [13] },
      { layout: 'screen', plates: [14, 15, 16] },
      { layout: 'cinema', plates: [17] },
      { layout: 'scroll', plates: [{ n: 18, pos: '50% 40%' }] },
      { layout: 'screen', plates: [19, 20] },
    ],
  },
  {
    slug: 'cafe', kind: '人像 · 室内', year: '2024', date: '2024.03.11',
    decor: ['steam', 'monstera', 'lamp'],
    gear: NZ_50, theme: 'night',
    cover: 1, coverPos: '55% 35%',
    feature: { plate: 4, ar: '16/9', pos: '50% 55%' },
    plates: {
      1: { d: '2024.03.11 · 18:20', x: 'f/1.8 · 1/60 · ISO 450', ar: '3/2' },
      2: { d: '2024.03.11 · 16:04', x: 'f/2 · 1/1000 · ISO 2000', ar: '3/2' },
      3: { d: '2024.03.11 · 16:05', x: 'f/2 · 1/1000 · ISO 1800', ar: '3/2' },
      4: { d: '2024.03.11 · 16:45', x: 'f/2 · 1/60 · ISO 360', ar: '2.35/1', pos: '50% 55%' },
      5: { d: '2024.03.11 · 17:39', x: 'f/2.8 · 1/60 · ISO 72', ar: '1/1' },
      6: { d: '2024.03.11 · 18:15', x: 'f/1.8 · 1/60 · ISO 560', ar: '3/2' },
    },
    spreads: [
      { layout: 'screen', plates: [2, 3] },
      { layout: 'cinema', plates: [4] },
      { layout: 'single', align: 'c', plates: [5] },
      { layout: 'single', align: 'l', plates: [6] },
    ],
  },
];
