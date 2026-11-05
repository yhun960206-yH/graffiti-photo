/* 首页目录：点开一卷，它的内容在这一行下面展开，背后的封面换成这一卷的照片。再点一下收起。 */
(() => {
  const dir = document.querySelector('.dir');
  const bg = document.querySelector('.hx__bg');
  if (!dir || !bg) return;
  const forced = new URLSearchParams(location.search).has('motion');
  const reduce = !forced && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const base = bg.querySelector('img');
  const heads = [...dir.querySelectorAll('button.dir__h')];
  const layers = new Map();

  const loadStrip = panel => panel.querySelectorAll('img[data-src]').forEach(img => { img.src = img.dataset.src; img.removeAttribute('data-src'); });

  function showBg(src, pos) {
    let img = src ? layers.get(src) : base;
    if (!img) {
      img = new Image(); img.alt = ''; img.decoding = 'async'; img.src = src; img.style.objectPosition = pos;
      bg.appendChild(img); layers.set(src, img);
    }
    const on = () => { for (const el of bg.querySelectorAll('img')) el.classList.toggle('is-on', el === img); };
    if (img.complete) requestAnimationFrame(on); else img.addEventListener('load', on, { once: true });
  }

  function set(btn, open) {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.setAttribute('aria-expanded', open);
    panel.classList.toggle('is-open', open);
    panel.inert = !open;
    if (!open) return;
    loadStrip(panel);
    const lede = panel.querySelector('.dir__lede');
    if (window.__fx && !reduce) window.__fx.decode(lede);
    // keep the opened panel on screen, without jumping
    setTimeout(() => {
      const r = panel.getBoundingClientRect();
      if (r.bottom > innerHeight - 12) scrollBy({ top: r.bottom - innerHeight + 24, behavior: reduce ? 'auto' : 'smooth' });
    }, 480);
  }

  heads.forEach(btn => {
    set(btn, false);
    btn.addEventListener('click', () => {
      const opening = btn.getAttribute('aria-expanded') !== 'true';
      heads.forEach(b => b !== btn && b.getAttribute('aria-expanded') === 'true' && set(b, false));
      set(btn, opening);
      dir.classList.toggle('has-open', opening);
      showBg(opening ? btn.dataset.bg : null, btn.dataset.pos);
    });
  });

  // a pointer resting on a line starts fetching its pictures (only that volume's — nothing loads in the background)
  heads.forEach(b => ['pointerenter', 'focus'].forEach(t => b.addEventListener(t, () => loadStrip(document.getElementById(b.getAttribute('aria-controls'))), { once: true })));

  // a long screenshot shows every volume open
  if (matchMedia('(max-aspect-ratio: 1/3), print').matches) heads.forEach(b => { b.setAttribute('aria-expanded', 'true'); const p = document.getElementById(b.getAttribute('aria-controls')); p.classList.add('is-open'); p.inert = false; loadStrip(p); });
})();
