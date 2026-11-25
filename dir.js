/* 首页目录：点开一卷，它的内容在这一行下面展开，背后的封面换成这一卷的照片。再点一下收起。
   依据当前浏览器窗口宽高比自动选择图集里的横图或竖图；若无匹配方向：
   · 横屏窗口无横图 → 竖图完整居右，左侧以图片左边缘颜色渐变延伸
   · 竖屏窗口无竖图 → 横/方图完整居顶，下方以图片下边缘颜色渐变延伸 */
(() => {
  const dir = document.querySelector('.dir');
  const bg = document.querySelector('.hx__bg');
  if (!dir || !bg) return;
  // motion is part of the book: kept even when the system asks for less (add ?still to see it at rest)
  const reduce = new URLSearchParams(location.search).has('still');
  const baseLayer = bg.querySelector('.hx__layer') || bg.querySelector('img');
  const heads = [...dir.querySelectorAll('button.dir__h')];
  const layers = new Map();
  let bgToken = 0;

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
    const winR = innerWidth / Math.max(1, innerHeight);
    const isPort = winR < 1;
    const src = (isPort && btn.dataset.bgM) ? btn.dataset.bgM : btn.dataset.bg;
    const pos = (isPort && btn.dataset.posM) ? btn.dataset.posM : btn.dataset.pos;
    const light = (isPort && btn.dataset.lightM) ? btn.dataset.lightM : btn.dataset.light;
    const ar = parseFloat((isPort && btn.dataset.arM) ? btn.dataset.arM : btn.dataset.ar) || (isPort ? 0.67 : 1.5);
    const rawFit = (isPort && btn.dataset.fitM) ? btn.dataset.fitM : (btn.dataset.fit || 'cover');
    const edge = ((isPort && btn.dataset.edgeM) ? btn.dataset.edgeM : (btn.dataset.edge || '')).split(',').filter(Boolean);

    // Only engage edge-extended framing when the viewport aspect ratio actually diverges from the photo's
    let fit = 'cover';
    if (rawFit === 'right' && winR > ar * 1.08) fit = 'right';
    else if (rawFit === 'top' && ar > winR * 1.15) fit = 'top';

    return { src, pos, light, ar, fit, edge };
  }

  function applyLayerStyle(layer, img, picked) {
    layer.classList.toggle('hx__layer--right', picked.fit === 'right');
    layer.classList.toggle('hx__layer--top', picked.fit === 'top');
    const trueAr = (img.naturalWidth && img.naturalHeight) ? (img.naturalWidth / img.naturalHeight) : picked.ar;
    layer.style.setProperty('--ar', trueAr.toFixed(4));
    layer.style.setProperty('--base', picked.light || '#141416');
    const fallback = picked.light || '#141416';
    layer.style.setProperty('--e1', picked.edge[0] || fallback);
    layer.style.setProperty('--e2', picked.edge[1] || picked.edge[0] || fallback);
    layer.style.setProperty('--e3', picked.edge[2] || picked.edge[1] || picked.edge[0] || fallback);
    img.style.objectPosition = picked.fit === 'cover' ? (picked.pos || '50% 50%') : '';
  }

  function showBg(picked) {
    const token = ++bgToken;
    if (!picked) {
      for (const el of bg.querySelectorAll('.hx__layer')) el.classList.toggle('is-on', el === baseLayer);
      bg.classList.remove('is-right', 'is-top');
      return;
    }
    let entry = layers.get(picked.src);
    if (!entry) {
      const layer = document.createElement('div');
      layer.className = 'hx__layer';
      const img = new Image();
      img.alt = '';
      img.decoding = 'async';
      bindRetry(img);
      img.src = picked.src;
      layer.appendChild(img);
      bg.appendChild(layer);
      entry = { layer, img };
      layers.set(picked.src, entry);
      img.addEventListener('load', () => {
        if (img.naturalWidth && img.naturalHeight) {
          layer.style.setProperty('--ar', (img.naturalWidth / img.naturalHeight).toFixed(4));
        }
      }, { once: true });
    }
    const { layer, img } = entry;
    applyLayerStyle(layer, img, picked);
    const on = () => {
      if (token !== bgToken) return;
      for (const el of bg.querySelectorAll('.hx__layer')) el.classList.toggle('is-on', el === layer);
      bg.classList.toggle('is-right', picked.fit === 'right');
      bg.classList.toggle('is-top', picked.fit === 'top');
    };
    if (img.complete && img.naturalWidth) requestAnimationFrame(on);
    else img.addEventListener('load', on, { once: true });
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
    showBg(picked);
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
        showBg(picked);
        document.body.style.backgroundColor = picked.light || '';
      } else {
        showBg(null);
        document.body.style.backgroundColor = '';
      }
    });
  });

  let rzT = 0;
  addEventListener('resize', () => {
    clearTimeout(rzT);
    rzT = setTimeout(syncOpenBg, 80);
  }, { passive: true });

  // a pointer resting on a line starts fetching its pictures (only that volume's — nothing loads in the background)
  heads.forEach(b => ['pointerenter', 'focus'].forEach(t => b.addEventListener(t, () => loadStrip(document.getElementById(b.getAttribute('aria-controls'))), { once: true })));

  // a long screenshot shows every volume open
  if (matchMedia('(max-aspect-ratio: 1/3), print').matches) heads.forEach(b => { b.setAttribute('aria-expanded', 'true'); const p = document.getElementById(b.getAttribute('aria-controls')); p.classList.add('is-open'); p.inert = false; loadStrip(p); });
})();
