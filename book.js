/* 每一卷：点开看大图。顶栏在 home.js，节奏在 flow.js，背景在 decor.js，文字在 text.js。 */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const lb = $('.lb'); if (!lb) return;
  const lbImg = $('img', lb), lbT = $('.lb__t', lb), lbC = $('.lb__count', lb);
  const items = $$('button.plate__frame').map(b => {
    const img = $('img', b);
    const sm = img.getAttribute('src');
    return { sm, full: img.dataset.full || sm, alt: img.alt, t: b.dataset.title, trigger: b };
  });
  let at = 0, opener = null, swapTimer = 0, loadToken = 0;
  function render(i) {
    clearTimeout(swapTimer);
    const token = ++loadToken;
    at = (i + items.length) % items.length;
    const it = items[at];
    const apply = () => {
      if (token !== loadToken) return;
      lbImg.alt = it.alt; lbT.textContent = it.t || ''; lbT.hidden = !it.t;
      lbC.textContent = `${at + 1} / ${items.length}`;
      // show already-decoded thumbnail immediately so opening/switching never flashes blank, then upgrade to full-res
      lbImg.src = it.sm;
      lbImg.classList.remove('is-swap');
      if (it.full && it.full !== it.sm) {
        const hi = new Image();
        hi.decoding = 'async';
        hi.src = it.full;
        (hi.decode ? hi.decode() : new Promise(r => { hi.onload = r; hi.onerror = r; })).then(() => {
          if (token === loadToken && lb.open) lbImg.src = it.full;
        }).catch(() => {});
      }
    };
    if (lb.open) {
      lbImg.classList.add('is-swap');
      swapTimer = setTimeout(apply, 140);
    } else {
      apply();
    }
  }
  items.forEach((it, i) => it.trigger.addEventListener('click', () => { opener = it.trigger; render(i); lb.showModal(); document.body.style.overflow = 'hidden'; }));
  lb.addEventListener('close', () => { clearTimeout(swapTimer); loadToken++; document.body.style.overflow = ''; opener && opener.focus({ preventScroll: true }); });
  $('.lb__prev', lb).addEventListener('click', () => render(at - 1));
  $('.lb__next', lb).addEventListener('click', () => render(at + 1));
  $('.lb__close', lb).addEventListener('click', () => lb.close());
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') render(at - 1); if (e.key === 'ArrowRight') render(at + 1); });
  let sx = null, sy = null;
  lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) render(at + (dx < 0 ? 1 : -1)); else if (dy > 90) lb.close();
  });
})();
