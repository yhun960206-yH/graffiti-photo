/* 每一卷：点开看大图。顶栏在 home.js，节奏在 flow.js，背景在 ambient.js。 */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const lb = $('.lb'); if (!lb) return;
  const lbImg = $('img', lb), lbT = $('.lb__t', lb), lbC = $('.lb__count', lb);
  const items = $$('button.plate__frame').map(b => ({ src: $('img', b).getAttribute('src'), alt: $('img', b).alt, t: b.dataset.title, trigger: b }));
  let at = 0, opener = null;
  function render(i) {
    at = (i + items.length) % items.length;
    const it = items[at];
    lbImg.classList.add('is-swap');
    setTimeout(() => {
      lbImg.src = it.src; lbImg.alt = it.alt; lbT.textContent = it.t;
      lbC.textContent = `${at + 1} / ${items.length}`;
      const done = () => lbImg.classList.remove('is-swap');
      if (lbImg.complete) requestAnimationFrame(done); else lbImg.onload = done;
    }, lb.open ? 200 : 0);
  }
  items.forEach((it, i) => it.trigger.addEventListener('click', () => { opener = it.trigger; render(i); lb.showModal(); document.body.style.overflow = 'hidden'; }));
  lb.addEventListener('close', () => { document.body.style.overflow = ''; opener && opener.focus({ preventScroll: true }); });
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
