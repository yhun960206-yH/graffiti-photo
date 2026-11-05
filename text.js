/* ==========================================================
   text.js —— 文字动效（主页与每一卷共用）

   在元素上加 data-fx 即可：
     data-fx="ink"     墨晕：每个字从模糊的墨点里慢慢洇开（页面打开时）
     data-fx="rise"    逐字浮现：滚到眼前时，一个字一个字浮上来
     data-fx="decode"  解码：字先是乱的，再一个个落定（由脚本触发，如目录展开）
   data-fx-delay="300" 推迟开始（毫秒）

   屏幕外一律是成品状态：长截图、打印、「减少动态效果」时文字直接完整显示。
   ========================================================== */
(() => {
  const root = document.documentElement;
  const forced = new URLSearchParams(location.search).has('motion');
  const reduce = !forced && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const capture = matchMedia('(max-aspect-ratio: 1/3), print').matches;
  if (reduce || capture) return;
  root.classList.add('fx');

  // wrap every character in a span; screen readers keep reading the whole line
  function split(el) {
    if (el.dataset.fxSplit) return [...el.querySelectorAll('.ch')];
    const text = el.textContent;
    el.setAttribute('aria-label', text.trim());
    el.textContent = '';
    const chars = [...text].map((c, i) => {
      const s = document.createElement('span');
      s.className = 'ch'; s.setAttribute('aria-hidden', 'true');
      s.textContent = c; s.style.setProperty('--i', i);
      el.appendChild(s);
      return s;
    });
    el.dataset.fxSplit = '1';
    return chars;
  }

  const play = el => {
    const d = parseFloat(el.dataset.fxDelay) || 0;
    setTimeout(() => el.classList.add('is-in'), d);
  };

  // ink: right away; rise: when it comes into view
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { play(e.target); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });

  for (const el of document.querySelectorAll('[data-fx="ink"], [data-fx="rise"]')) {
    split(el);
    const r = el.getBoundingClientRect();
    // anything already below the fold when the page opens waits for the reader; the rest plays now
    if (el.dataset.fx === 'ink' || r.top < innerHeight) requestAnimationFrame(() => play(el));
    else io.observe(el);
  }

  /* decode: random strokes settle into the real text, left to right */
  const POOL = '一丁七万丈三上下与丑专且世丘业东丝丢两严丧个中丰串临丸丹为主丽举乃久么义之乌乍乎乏乐乔乖乘乙九也习乡书买乱乳了予争事二于云互五井亚些亡交亦产亨享京亭亮人亿什仁今介从仓他付仙代令以仪们仰仲件价任份仿企伊伍伏伐休众优伙会伞伟传伤伦伪伯估伴伸似但位低住体何余佛作你佣佩佳使来例供依侠侧侨侯侵便促俄俊俗保信修俯俱倍倒候借倦值倾假偏做停健偶偷傅傍储催傲像僧';
  const rnd = () => POOL[(Math.random() * POOL.length) | 0];
  function decode(el, { speed = 34, scramble = 5 } = {}) {
    const chars = split(el);
    const finals = chars.map(c => c.dataset.c ?? (c.dataset.c = c.textContent));
    el.classList.add('is-decoding');
    let frame = 0;
    cancelAnimationFrame(el._fx);
    const t0 = performance.now();
    const step = now => {
      const k = Math.floor((now - t0) / speed);
      if (k === frame) { el._fx = requestAnimationFrame(step); return; }
      frame = k;
      let done = true;
      chars.forEach((c, i) => {
        const settle = i + scramble;            // each character spins for a few beats, then lands
        if (/\s|[，。、；：！？·—（）《》「」]/.test(finals[i])) { c.textContent = finals[i]; c.classList.add('ok'); return; }
        if (k >= settle) { c.textContent = finals[i]; c.classList.add('ok'); }
        else { done = false; c.classList.remove('ok'); c.textContent = k >= i ? rnd() : '　'; }
      });
      if (done) el.classList.remove('is-decoding'); else el._fx = requestAnimationFrame(step);
    };
    el._fx = requestAnimationFrame(step);
  }

  window.__fx = { split, decode };
})();
