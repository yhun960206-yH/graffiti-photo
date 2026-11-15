/* 首页目录：点开一卷，它的内容在这一行下面展开，背后的封面换成这一卷的照片。再点一下收起。
   电脑/平板宽屏优先展示横图，手机竖屏点击时优先展示竖图。 */
(() => {
  const dir = document.querySelector('.dir');
  const bg = document.querySelector('.hx__bg');
  if (!dir || !bg) return;
  // motion is part of the book: kept even when the system asks for less (add ?still to see it at rest)
  const reduce = new URLSearchParams(location.search).has('still');
  const base = bg.querySelector('img');
  const heads = [...dir.querySelectorAll('button.dir__h')];
  const layers = new Map();
  const mqMobile = matchMedia('(max-width: 767px), (max-aspect-ratio: 4/5)');

  const bindRetry = img => {
    img.addEventListener('error', function onErr() {
      const n = Number(img.dataset.retry || 0);
      if (n < 2) {
        img.dataset.retry = String(n + 1);
        setTimeout(() => { img.src = img.src.split('?')[0] + '?r=' + (n + 1); }, 600 * (n + 1));
      }
    });
  };
  const loadStrip = panel => panel.querySelectorAll('img[data-src]').forEach(img => { bindRetry(img); img.src = img.dataset.src; img.removeAttribute('data-src'); });

  function pickForViewport(btn) {
    const isMob = mqMobile.matches;
    return {
      src: (isMob && btn.dataset.bgM) ? btn.dataset.bgM : btn.dataset.bg,
      pos: (isMob && btn.dataset.posM) ? btn.dataset.posM : btn.dataset.pos,
      light: (isMob && btn.dataset.lightM) ? btn.dataset.lightM : btn.dataset.light
    };
  }

  function showBg(src, pos) {
    let img = src ? layers.get(src) : base;
    if (!img) {
      img = new Image(); img.alt = ''; img.decoding = 'async'; img.src = src; img.style.objectPosition = pos;
      bg.appendChild(img); layers.set(src, img);
    } else if (pos) {
      img.style.objectPosition = pos;
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
    if (lede && window.__fx && !reduce) window.__fx.decode(lede);
    // keep the opened panel on screen, without jumping
    setTimeout(() => {
      const r = panel.getBoundingClientRect();
      if (r.bottom > innerHeight - 12) scrollBy({ top: r.bottom - innerHeight + 24, behavior: reduce ? 'auto' : 'smooth' });
    }, 480);
  }

  function syncOpenBg() {
    const active = heads.find(b => b.getAttribute('aria-expanded') === 'true');
    if (!active) return;
    const picked = pickForViewport(active);
    showBg(picked.src, picked.pos);
    document.body.style.backgroundColor = picked.light || '';
  }

  heads.forEach(btn => {
    set(btn, false);
    btn.addEventListener('click', () => {
      const opening = btn.getAttribute('aria-expanded') !== 'true';
      heads.forEach(b => b !== btn && b.getAttribute('aria-expanded') === 'true' && set(b, false));
      set(btn, opening);
      dir.classList.toggle('has-open', opening);
      if (opening) {
        const picked = pickForViewport(btn);
        showBg(picked.src, picked.pos);
        document.body.style.backgroundColor = picked.light || '';
      } else {
        showBg(null);
        document.body.style.backgroundColor = '';
      }
    });
  });

  mqMobile.addEventListener('change', syncOpenBg);

  // a pointer resting on a line starts fetching its pictures (only that volume's — nothing loads in the background)
  heads.forEach(b => ['pointerenter', 'focus'].forEach(t => b.addEventListener(t, () => loadStrip(document.getElementById(b.getAttribute('aria-controls'))), { once: true })));

  // a long screenshot shows every volume open
  if (matchMedia('(max-aspect-ratio: 1/3), print').matches) heads.forEach(b => { b.setAttribute('aria-expanded', 'true'); const p = document.getElementById(b.getAttribute('aria-controls')); p.classList.add('is-open'); p.inert = false; loadStrip(p); });
})();
